-- ==============================================================================
-- 049_complete_production_schema.sql — Consolidated Production Migration
--
-- Ensures all tables, types, RLS policies, RPCs, seed records and indexes
-- are synchronized for production deployment.
-- ==============================================================================

-- 1. Ensure required extensions exist
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "vector";

-- 2. Ensure admin_role_enum exists
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'admin_role_enum') THEN
    CREATE TYPE admin_role_enum AS ENUM (
      'super_admin',
      'admin',
      'support_manager',
      'support_agent',
      'billing_manager',
      'tech_manager'
    );
  END IF;
END $$;

-- 3. Ensure custom_attributes column on contacts
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'contacts' AND column_name = 'custom_attributes'
  ) THEN
    ALTER TABLE contacts ADD COLUMN custom_attributes JSONB NOT NULL DEFAULT '{}'::jsonb;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'contacts' AND column_name = 'is_opted_out'
  ) THEN
    ALTER TABLE contacts ADD COLUMN is_opted_out BOOLEAN NOT NULL DEFAULT FALSE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'conversations' AND column_name = 'last_customer_message_at'
  ) THEN
    ALTER TABLE conversations ADD COLUMN last_customer_message_at TIMESTAMPTZ;
  END IF;
END $$;

-- 4. Ensure payment_transactions and billing_webhook_events exist
CREATE TABLE IF NOT EXISTS payment_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  razorpay_payment_id TEXT NOT NULL UNIQUE,
  razorpay_order_id TEXT,
  razorpay_subscription_id TEXT,
  amount INTEGER NOT NULL,
  currency TEXT NOT NULL DEFAULT 'INR',
  status TEXT NOT NULL DEFAULT 'captured' CHECK (status IN ('captured', 'pending', 'failed', 'refunded')),
  payment_method TEXT NOT NULL DEFAULT 'razorpay',
  raw_payload JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_payment_transactions_account ON payment_transactions(account_id);

ALTER TABLE payment_transactions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Members can view transactions" ON payment_transactions;
CREATE POLICY "Members can view transactions" ON payment_transactions
  FOR SELECT TO authenticated
  USING (is_account_member(account_id, 'viewer'));

CREATE TABLE IF NOT EXISTS billing_webhook_events (
  id TEXT PRIMARY KEY,
  event_type TEXT NOT NULL,
  processed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 5. Seed default system settings if missing
INSERT INTO system_settings (key, value)
VALUES
  ('payment_gateway', '{
    "active_gateway": "razorpay",
    "mode": "test",
    "currency": "INR",
    "razorpay_key_id": "",
    "razorpay_key_secret": "",
    "razorpay_webhook_secret": "",
    "upi_id": "8653678794@upi",
    "upi_business_name": "NX CRM / Nexora Spark Agency",
    "manual_qr_enabled": true,
    "auto_activate_on_payment": true
  }'::jsonb)
ON CONFLICT (key) DO NOTHING;
