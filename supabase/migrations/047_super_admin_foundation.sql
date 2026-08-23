-- ============================================================
-- 047_super_admin_foundation.sql — Super Admin Management, Audit Logs, Feature Flags & System Settings
--
-- Provides database tables for:
-- 1. admin_users (Role-based admin accounts: super_admin, admin, support_manager, support_agent, billing_manager, tech_manager)
-- 2. admin_audit_logs (Immutable audit trail for all admin actions)
-- 3. feature_flags (Dynamic global, plan, and client-level overrides)
-- 4. system_settings (Global SaaS configuration parameters)
-- 5. Subscriptions lifecycle & grace period fields
-- ============================================================

-- ============================================================
-- 1. ADMIN USERS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS admin_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  full_name TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'admin'
    CHECK (role IN ('super_admin', 'admin', 'support_manager', 'support_agent', 'billing_manager', 'tech_manager')),
  permissions JSONB NOT NULL DEFAULT '[]'::jsonb,
  status TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'suspended')),
  last_login_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_admin_users_email ON admin_users(email);
CREATE INDEX IF NOT EXISTS idx_admin_users_role ON admin_users(role);

ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;
-- By default, direct client access is locked; accessed via server-side service role
DROP POLICY IF EXISTS "Service role manages admin_users" ON admin_users;
CREATE POLICY "Service role manages admin_users" ON admin_users
  FOR ALL TO service_role USING (TRUE);

-- ============================================================
-- 2. ADMIN AUDIT LOGS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS admin_audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_email TEXT NOT NULL,
  admin_role TEXT NOT NULL,
  action TEXT NOT NULL,
  target_type TEXT NOT NULL,
  target_id TEXT,
  details JSONB NOT NULL DEFAULT '{}'::jsonb,
  ip_address TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_admin_audit_logs_created_at ON admin_audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_admin_audit_logs_action ON admin_audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_admin_audit_logs_target ON admin_audit_logs(target_type, target_id);

ALTER TABLE admin_audit_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Service role manages admin_audit_logs" ON admin_audit_logs;
CREATE POLICY "Service role manages admin_audit_logs" ON admin_audit_logs
  FOR ALL TO service_role USING (TRUE);

-- ============================================================
-- 3. FEATURE FLAGS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS feature_flags (
  id TEXT PRIMARY KEY, -- e.g. 'broadcast', 'ai_reply', 'flows', 'automations', 'telegram', 'google_sheets', 'google_calendar', 'advanced_analytics', 'inbox'
  name TEXT NOT NULL,
  description TEXT,
  enabled_globally BOOLEAN NOT NULL DEFAULT TRUE,
  allowed_plans JSONB NOT NULL DEFAULT '["pro", "business", "enterprise"]'::jsonb,
  client_overrides JSONB NOT NULL DEFAULT '{}'::jsonb, -- { "account_uuid": true/false }
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Seed Default Feature Flags
INSERT INTO feature_flags (id, name, description, enabled_globally, allowed_plans, client_overrides)
VALUES
  ('inbox', 'Shared Team Inbox', 'Multi-agent customer messaging with 24h timer and internal notes', TRUE, '["free", "pro", "business", "enterprise"]'::jsonb, '{}'::jsonb),
  ('automations', 'Basic Automations', 'Keyword and condition-based automated replies', TRUE, '["free", "pro", "business", "enterprise"]'::jsonb, '{}'::jsonb),
  ('flows', 'Visual Flow Builder', 'Drag-and-drop conversational workflow canvas', TRUE, '["pro", "business", "enterprise"]'::jsonb, '{}'::jsonb),
  ('ai_reply', 'AI Auto-Replies (BYOK)', 'Bring-your-own-key Google Gemini & OpenAI auto suggestions', TRUE, '["pro", "business", "enterprise"]'::jsonb, '{}'::jsonb),
  ('broadcast', 'WhatsApp Broadcast Campaigns', 'Bulk template messaging campaigns to segmented contacts', FALSE, '["business", "enterprise"]'::jsonb, '{}'::jsonb),
  ('telegram', 'Telegram Bot Channel', 'Receive and respond to customer queries from Telegram', TRUE, '["pro", "business", "enterprise"]'::jsonb, '{}'::jsonb),
  ('google_sheets', 'Google Sheets Lead Sync', 'Real-time lead export to connected Google Spreadsheets', TRUE, '["pro", "business", "enterprise"]'::jsonb, '{}'::jsonb),
  ('google_calendar', 'Google Calendar & Calendly', 'Share dynamic consultation booking links in WhatsApp chats', TRUE, '["pro", "business", "enterprise"]'::jsonb, '{}'::jsonb),
  ('advanced_analytics', 'Advanced Performance Analytics', 'FRT, agent resolution rates, and hourly volume heatmaps', TRUE, '["business", "enterprise"]'::jsonb, '{}'::jsonb)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  updated_at = NOW();

ALTER TABLE feature_flags ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Feature flags are readable by authenticated users" ON feature_flags;
CREATE POLICY "Feature flags are readable by authenticated users" ON feature_flags
  FOR SELECT TO authenticated USING (TRUE);

-- ============================================================
-- 4. SYSTEM SETTINGS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS system_settings (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Seed Initial System Settings
INSERT INTO system_settings (key, value)
VALUES
  ('general', '{
    "platform_name": "NX CRM",
    "company_name": "Nexora Spark Agency",
    "support_email": "support@nxcrm.online",
    "sales_email": "sales@nxcrm.online",
    "default_trial_days": 14,
    "default_currency": "INR",
    "maintenance_mode": false
  }'::jsonb),
  ('billing', '{
    "grace_period_days": 3,
    "tax_percentage": 18,
    "invoice_prefix": "NX-INV",
    "auto_suspend_expired": false
  }'::jsonb),
  ('whatsapp', '{
    "meta_api_version": "v22.0",
    "default_webhook_timeout_ms": 10000,
    "max_connections_per_client_pro": 1,
    "max_connections_per_client_business": 5
  }'::jsonb)
ON CONFLICT (key) DO NOTHING;

ALTER TABLE system_settings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "System settings readable by authenticated" ON system_settings;
CREATE POLICY "System settings readable by authenticated" ON system_settings
  FOR SELECT TO authenticated USING (TRUE);

-- ============================================================
-- 5. SUBSCRIPTIONS ENHANCEMENTS
-- ============================================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'subscriptions' AND column_name = 'grace_period_end'
  ) THEN
    ALTER TABLE subscriptions ADD COLUMN grace_period_end TIMESTAMPTZ;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'subscriptions' AND column_name = 'notes'
  ) THEN
    ALTER TABLE subscriptions ADD COLUMN notes TEXT;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'accounts' AND column_name = 'status'
  ) THEN
    ALTER TABLE accounts ADD COLUMN status TEXT NOT NULL DEFAULT 'active';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'accounts' AND column_name = 'notes'
  ) THEN
    ALTER TABLE accounts ADD COLUMN notes TEXT;
  END IF;
END $$;
