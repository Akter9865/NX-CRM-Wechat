-- ==============================================================================
-- 053_account_integrations_hub.sql
--
-- Integrations & Apps Hub multi-tenant persistence:
--   1. Creates account_integrations table for storing Google Sheets, Zoho,
--      Razorpay, PhonePe, Paytm, Stripe, Calendly, and Zapier/Webhook configurations.
--   2. Enables Row Level Security (RLS) with strict account_id scoping.
--   3. Sets up updated_at trigger and performance index.
--
-- Idempotent — safe to run multiple times.
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.account_integrations (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id      UUID NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  integration_id  TEXT NOT NULL,
  is_enabled      BOOLEAN NOT NULL DEFAULT false,
  config          JSONB NOT NULL DEFAULT '{}'::jsonb,
  last_synced_at  TIMESTAMPTZ,
  last_error      TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT account_integrations_unique_per_account UNIQUE (account_id, integration_id)
);

-- Index for speedy lookup by account
CREATE INDEX IF NOT EXISTS idx_account_integrations_lookup 
  ON public.account_integrations(account_id, integration_id);

-- Enable RLS
ALTER TABLE public.account_integrations ENABLE ROW LEVEL SECURITY;

-- Read policy: any member of the account can see whether an integration is active
DROP POLICY IF EXISTS account_integrations_select ON public.account_integrations;
CREATE POLICY account_integrations_select ON public.account_integrations
  FOR SELECT
  USING (is_account_member(account_id));

-- Write policies: admins and owners can configure integrations
DROP POLICY IF EXISTS account_integrations_insert ON public.account_integrations;
CREATE POLICY account_integrations_insert ON public.account_integrations
  FOR INSERT
  WITH CHECK (is_account_member(account_id, 'admin'));

DROP POLICY IF EXISTS account_integrations_update ON public.account_integrations;
CREATE POLICY account_integrations_update ON public.account_integrations
  FOR UPDATE
  USING (is_account_member(account_id, 'admin'));

DROP POLICY IF EXISTS account_integrations_delete ON public.account_integrations;
CREATE POLICY account_integrations_delete ON public.account_integrations
  FOR DELETE
  USING (is_account_member(account_id, 'admin'));

-- Trigger to maintain updated_at
CREATE OR REPLACE FUNCTION public.update_account_integrations_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS account_integrations_updated_at ON public.account_integrations;
CREATE TRIGGER account_integrations_updated_at
  BEFORE UPDATE ON public.account_integrations
  FOR EACH ROW
  EXECUTE FUNCTION public.update_account_integrations_updated_at();
