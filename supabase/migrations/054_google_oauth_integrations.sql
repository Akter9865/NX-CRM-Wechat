-- ==============================================================================
-- 054_google_oauth_integrations.sql
--
-- Adds explicit support for Google OAuth 2.0 multi-tenant integrations
-- (Google Sheets and Google Calendar) with secure token management:
--   1. Adds helper columns to public.account_integrations:
--      - connected_by_user_id (audit who authorized the connection)
--      - google_account_email (connected Google account identity)
--      - encrypted_refresh_token (AES-256-GCM encrypted token at rest)
--      - granted_scopes (array of granted OAuth scopes)
--      - external_resource_id (selected spreadsheet_id or calendar_id)
--   2. Preserves strict multi-tenant Row Level Security (RLS) scoping.
--   3. Adds index for lookup by account and email.
--
-- Idempotent — safe to execute multiple times.
-- ==============================================================================

ALTER TABLE public.account_integrations 
  ADD COLUMN IF NOT EXISTS connected_by_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS google_account_email TEXT,
  ADD COLUMN IF NOT EXISTS encrypted_refresh_token TEXT,
  ADD COLUMN IF NOT EXISTS granted_scopes TEXT[],
  ADD COLUMN IF NOT EXISTS external_resource_id TEXT;

-- Composite index for fast lookup of active integrations
CREATE INDEX IF NOT EXISTS idx_account_integrations_provider
  ON public.account_integrations(account_id, integration_id, is_enabled);

-- Index for searching account integration by email
CREATE INDEX IF NOT EXISTS idx_account_integrations_email 
  ON public.account_integrations(account_id, google_account_email);
