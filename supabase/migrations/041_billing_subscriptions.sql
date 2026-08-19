-- ============================================================
-- 041_billing_subscriptions.sql — Plans, Subscriptions & Razorpay Billing
--
-- Adds subscription plans (Free, Pro, Business, Enterprise),
-- multi-tenant subscriptions, usage tracking, payment transactions,
-- and webhook idempotency tables.
-- ============================================================

-- ============================================================
-- 1. PLANS
-- ============================================================
CREATE TABLE IF NOT EXISTS plans (
  id TEXT PRIMARY KEY, -- 'free', 'pro', 'business', 'enterprise'
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  price INTEGER NOT NULL, -- in INR (0, 499, 3000, 8999)
  currency TEXT NOT NULL DEFAULT 'INR',
  billing_interval TEXT NOT NULL DEFAULT 'month',
  contact_limit INTEGER, -- NULL = unlimited
  monthly_message_limit INTEGER, -- NULL = unlimited
  whatsapp_connection_limit INTEGER, -- NULL = unlimited
  razorpay_plan_id TEXT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Seed Default Plans
INSERT INTO plans (id, name, slug, price, currency, billing_interval, contact_limit, monthly_message_limit, whatsapp_connection_limit, is_active)
VALUES
  ('free', 'Free', 'free', 0, 'INR', 'month', 10, 200, 1, TRUE),
  ('pro', 'Pro', 'pro', 499, 'INR', 'month', 1000, NULL, 1, TRUE),
  ('business', 'Business', 'business', 3000, 'INR', 'month', 7000, NULL, 5, TRUE),
  ('enterprise', 'Enterprise', 'enterprise', 8999, 'INR', 'month', NULL, NULL, NULL, TRUE)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  price = EXCLUDED.price,
  contact_limit = EXCLUDED.contact_limit,
  monthly_message_limit = EXCLUDED.monthly_message_limit,
  whatsapp_connection_limit = EXCLUDED.whatsapp_connection_limit,
  is_active = EXCLUDED.is_active;

ALTER TABLE plans ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Plans are readable by all authenticated users" ON plans;
CREATE POLICY "Plans are readable by all authenticated users" ON plans
  FOR SELECT TO authenticated USING (TRUE);

-- ============================================================
-- 2. PLAN FEATURES / ENTITLEMENTS
-- ============================================================
CREATE TABLE IF NOT EXISTS plan_features (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id TEXT NOT NULL REFERENCES plans(id) ON DELETE CASCADE,
  feature_key TEXT NOT NULL,
  enabled BOOLEAN NOT NULL DEFAULT TRUE,
  limit_value INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT unique_plan_feature UNIQUE (plan_id, feature_key)
);

INSERT INTO plan_features (plan_id, feature_key, enabled, limit_value)
VALUES
  ('free', 'automation', TRUE, 3),
  ('free', 'advanced_crm', FALSE, NULL),
  ('free', 'broadcast', FALSE, NULL),
  ('free', 'bulk_templates', FALSE, NULL),
  ('free', 'api_access', FALSE, NULL),

  ('pro', 'automation', TRUE, NULL),
  ('pro', 'advanced_crm', TRUE, NULL),
  ('pro', 'broadcast', FALSE, NULL),
  ('pro', 'bulk_templates', FALSE, NULL),
  ('pro', 'api_access', TRUE, NULL),

  ('business', 'automation', TRUE, NULL),
  ('business', 'advanced_crm', TRUE, NULL),
  ('business', 'broadcast', TRUE, NULL),
  ('business', 'bulk_templates', TRUE, NULL),
  ('business', 'api_access', TRUE, NULL),

  ('enterprise', 'automation', TRUE, NULL),
  ('enterprise', 'advanced_crm', TRUE, NULL),
  ('enterprise', 'broadcast', TRUE, NULL),
  ('enterprise', 'bulk_templates', TRUE, NULL),
  ('enterprise', 'api_access', TRUE, NULL)
ON CONFLICT (plan_id, feature_key) DO UPDATE SET
  enabled = EXCLUDED.enabled,
  limit_value = EXCLUDED.limit_value;

ALTER TABLE plan_features ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Plan features are readable by all authenticated users" ON plan_features;
CREATE POLICY "Plan features are readable by all authenticated users" ON plan_features
  FOR SELECT TO authenticated USING (TRUE);

-- ============================================================
-- 3. SUBSCRIPTIONS
-- ============================================================
CREATE TABLE IF NOT EXISTS subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  plan_id TEXT NOT NULL REFERENCES plans(id),
  razorpay_subscription_id TEXT,
  razorpay_plan_id TEXT,
  status TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('trialing', 'active', 'past_due', 'paused', 'cancelled', 'expired', 'payment_failed')),
  current_period_start TIMESTAMPTZ DEFAULT NOW(),
  current_period_end TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '1 month'),
  cancel_at_period_end BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT unique_account_subscription UNIQUE (account_id)
);

CREATE INDEX IF NOT EXISTS idx_subscriptions_account_id ON subscriptions(account_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_razorpay_id ON subscriptions(razorpay_subscription_id);

ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Members can view their account subscription" ON subscriptions;
CREATE POLICY "Members can view their account subscription" ON subscriptions
  FOR SELECT TO authenticated
  USING (is_account_member(account_id, 'viewer'));

DROP POLICY IF EXISTS "Admins can manage their account subscription" ON subscriptions;
CREATE POLICY "Admins can manage their account subscription" ON subscriptions
  FOR ALL TO authenticated
  USING (is_account_member(account_id, 'admin'));

-- Backfill: Give any existing account without a subscription the Free plan
INSERT INTO subscriptions (account_id, plan_id, status)
SELECT id, 'free', 'active'
FROM accounts
ON CONFLICT (account_id) DO NOTHING;

-- ============================================================
-- 4. PAYMENT TRANSACTIONS
-- ============================================================
CREATE TABLE IF NOT EXISTS payment_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  subscription_id UUID REFERENCES subscriptions(id) ON DELETE SET NULL,
  razorpay_payment_id TEXT UNIQUE,
  razorpay_order_id TEXT,
  razorpay_subscription_id TEXT,
  amount INTEGER NOT NULL, -- in paise/smallest unit or rupees
  currency TEXT NOT NULL DEFAULT 'INR',
  status TEXT NOT NULL,
  payment_method TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_payment_transactions_account ON payment_transactions(account_id, created_at DESC);

ALTER TABLE payment_transactions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Members can view account payments" ON payment_transactions;
CREATE POLICY "Members can view account payments" ON payment_transactions
  FOR SELECT TO authenticated
  USING (is_account_member(account_id, 'viewer'));

-- ============================================================
-- 5. USAGE RECORDS (Monthly Tracking)
-- ============================================================
CREATE TABLE IF NOT EXISTS usage_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  billing_period TEXT NOT NULL, -- 'YYYY-MM', e.g. '2026-08'
  messages_sent INTEGER NOT NULL DEFAULT 0,
  messages_received INTEGER NOT NULL DEFAULT 0,
  contacts_count INTEGER NOT NULL DEFAULT 0,
  automation_runs INTEGER NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT unique_account_period UNIQUE (account_id, billing_period)
);

CREATE INDEX IF NOT EXISTS idx_usage_records_account_period ON usage_records(account_id, billing_period);

ALTER TABLE usage_records ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Members can view account usage" ON usage_records;
CREATE POLICY "Members can view account usage" ON usage_records
  FOR SELECT TO authenticated
  USING (is_account_member(account_id, 'viewer'));

-- ============================================================
-- 6. BILLING WEBHOOK EVENTS (Idempotency)
-- ============================================================
CREATE TABLE IF NOT EXISTS billing_webhook_events (
  id TEXT PRIMARY KEY, -- Razorpay event ID (e.g. event_Lz0...)
  event_type TEXT NOT NULL,
  payload JSONB NOT NULL,
  processed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
