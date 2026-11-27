-- ==============================================================================
-- NX CRM — FULL PRODUCTION SUPABASE CONSOLIDATED SCHEMA (v1.0.0 Enterprise)
-- Powered by Nexora Spark Agency
--
-- This script is completely IDEMPOTENT and backward-compatible.
-- It safely upgrades existing tables with missing columns before adding
-- indexes, types, triggers, and RLS policies.
-- ==============================================================================

-- ==============================================================================
-- 1. EXTENSIONS & TYPES
-- ==============================================================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "vector";

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'account_role_enum') THEN
    CREATE TYPE account_role_enum AS ENUM ('owner', 'admin', 'agent', 'viewer');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'admin_role_enum') THEN
    CREATE TYPE admin_role_enum AS ENUM (
      'super_admin',
      'superadmin',
      'admin',
      'support_manager',
      'support_agent',
      'billing_manager',
      'tech_manager'
    );
  END IF;
END $$;

-- Generic update timestamp trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ==============================================================================
-- 2. MULTI-TENANT ACCOUNTS & PROFILES (Safe Schema Upgrade)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS accounts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  owner_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  status TEXT NOT NULL DEFAULT 'active',
  default_currency TEXT NOT NULL DEFAULT 'INR',
  notes TEXT,
  settings JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Upgrade existing accounts table if columns are missing
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'active';
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS default_currency TEXT NOT NULL DEFAULT 'INR';
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS notes TEXT;
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS settings JSONB DEFAULT '{}'::jsonb;
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS is_automations_paused BOOLEAN NOT NULL DEFAULT FALSE;

CREATE UNIQUE INDEX IF NOT EXISTS idx_accounts_one_per_owner ON accounts(owner_user_id);
CREATE INDEX IF NOT EXISTS idx_accounts_status ON accounts(status);

ALTER TABLE accounts ENABLE ROW LEVEL SECURITY;

DROP TRIGGER IF EXISTS set_accounts_updated_at ON accounts;
CREATE TRIGGER set_accounts_updated_at
  BEFORE UPDATE ON accounts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- User Profiles
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  account_id UUID REFERENCES accounts(id) ON DELETE CASCADE,
  account_role account_role_enum DEFAULT 'owner',
  full_name TEXT NOT NULL,
  email TEXT NOT NULL,
  avatar_url TEXT,
  beta_features JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id)
);

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS account_id UUID REFERENCES accounts(id) ON DELETE CASCADE;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS avatar_url TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS beta_features JSONB NOT NULL DEFAULT '[]'::jsonb;

CREATE INDEX IF NOT EXISTS idx_profiles_account_id ON profiles(account_id);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Team Invitations
CREATE TABLE IF NOT EXISTS account_invitations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL UNIQUE,
  role account_role_enum NOT NULL CHECK (role <> 'owner'),
  created_by_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  label TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL,
  accepted_at TIMESTAMPTZ,
  accepted_by_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

ALTER TABLE account_invitations ENABLE ROW LEVEL SECURITY;

-- Member Presence (Live Agent Online / Active Typing State)
CREATE TABLE IF NOT EXISTS member_presence (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'offline',
  active_conversation_id UUID,
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE member_presence ENABLE ROW LEVEL SECURITY;

-- ==============================================================================
-- RLS HELPER: is_account_member
-- ==============================================================================
CREATE OR REPLACE FUNCTION is_account_member(
  target_account_id UUID,
  min_role account_role_enum DEFAULT 'viewer'
) RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM profiles p
    WHERE p.user_id = auth.uid()
      AND p.account_id = target_account_id
      AND CASE p.account_role
        WHEN 'owner' THEN TRUE
        WHEN 'admin' THEN min_role IN ('admin', 'agent', 'viewer')
        WHEN 'agent' THEN min_role IN ('agent', 'viewer')
        WHEN 'viewer' THEN min_role = 'viewer'
        ELSE FALSE
      END
  );
$$;

-- RLS Policies for Accounts & Profiles
DROP POLICY IF EXISTS "Account members can view their account" ON accounts;
CREATE POLICY "Account members can view their account" ON accounts
  FOR SELECT TO authenticated
  USING (is_account_member(id, 'viewer'));

DROP POLICY IF EXISTS "Account owners can update account" ON accounts;
CREATE POLICY "Account owners can update account" ON accounts
  FOR UPDATE TO authenticated
  USING (is_account_member(id, 'owner'));

DROP POLICY IF EXISTS "Users can view profiles in their account" ON profiles;
CREATE POLICY "Users can view profiles in their account" ON profiles
  FOR SELECT TO authenticated
  USING (account_id IS NOT NULL AND is_account_member(account_id, 'viewer'));

DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id);

-- ==============================================================================
-- 3. WHATSAPP CLOUD API & MULTI-LINE CONNECTIONS
-- ==============================================================================
CREATE TABLE IF NOT EXISTS whatsapp_config (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  account_id UUID REFERENCES accounts(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  phone_number_id TEXT NOT NULL,
  waba_id TEXT,
  access_token TEXT NOT NULL,
  verify_token TEXT,
  display_phone_number TEXT,
  verified_name TEXT,
  phone_number TEXT,
  quality_rating TEXT DEFAULT 'UNKNOWN',
  status TEXT NOT NULL DEFAULT 'disconnected',
  is_connected BOOLEAN DEFAULT FALSE,
  messaging_limit_tier TEXT,
  ban_reason TEXT,
  ban_date TIMESTAMPTZ,
  is_automations_paused BOOLEAN NOT NULL DEFAULT FALSE,
  connected_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Upgrade existing whatsapp_config columns if missing
ALTER TABLE whatsapp_config ADD COLUMN IF NOT EXISTS account_id UUID REFERENCES accounts(id) ON DELETE CASCADE;
ALTER TABLE whatsapp_config ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE whatsapp_config ADD COLUMN IF NOT EXISTS phone_number_id TEXT;
ALTER TABLE whatsapp_config ADD COLUMN IF NOT EXISTS waba_id TEXT;
ALTER TABLE whatsapp_config ADD COLUMN IF NOT EXISTS access_token TEXT;
ALTER TABLE whatsapp_config ADD COLUMN IF NOT EXISTS verify_token TEXT;
ALTER TABLE whatsapp_config ADD COLUMN IF NOT EXISTS display_phone_number TEXT;
ALTER TABLE whatsapp_config ADD COLUMN IF NOT EXISTS verified_name TEXT;
ALTER TABLE whatsapp_config ADD COLUMN IF NOT EXISTS phone_number TEXT;
ALTER TABLE whatsapp_config ADD COLUMN IF NOT EXISTS quality_rating TEXT DEFAULT 'UNKNOWN';
ALTER TABLE whatsapp_config ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'disconnected';
ALTER TABLE whatsapp_config ADD COLUMN IF NOT EXISTS is_connected BOOLEAN DEFAULT FALSE;
ALTER TABLE whatsapp_config ADD COLUMN IF NOT EXISTS messaging_limit_tier TEXT;
ALTER TABLE whatsapp_config ADD COLUMN IF NOT EXISTS ban_reason TEXT;
ALTER TABLE whatsapp_config ADD COLUMN IF NOT EXISTS ban_date TIMESTAMPTZ;
ALTER TABLE whatsapp_config ADD COLUMN IF NOT EXISTS is_automations_paused BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE whatsapp_config ADD COLUMN IF NOT EXISTS connected_at TIMESTAMPTZ;

-- Drop and recreate constraint to include all compliance statuses
ALTER TABLE whatsapp_config DROP CONSTRAINT IF EXISTS whatsapp_config_status_check;
ALTER TABLE whatsapp_config ADD CONSTRAINT whatsapp_config_status_check
  CHECK (status IN ('connected', 'disconnected', 'error', 'banned', 'restricted', 'flagged', 'connecting', 'deactivated', 'replaced'));

CREATE INDEX IF NOT EXISTS idx_whatsapp_config_account ON whatsapp_config(account_id);
ALTER TABLE whatsapp_config ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Members can view whatsapp config" ON whatsapp_config;
CREATE POLICY "Members can view whatsapp config" ON whatsapp_config
  FOR SELECT TO authenticated
  USING (is_account_member(account_id, 'viewer'));

DROP POLICY IF EXISTS "Admins can manage whatsapp config" ON whatsapp_config;
CREATE POLICY "Admins can manage whatsapp config" ON whatsapp_config
  FOR ALL TO authenticated
  USING (is_account_member(account_id, 'admin'));

-- Ensure backward compatibility for whatsapp_configs
CREATE TABLE IF NOT EXISTS whatsapp_configs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  phone_number_id TEXT NOT NULL,
  waba_id TEXT,
  access_token TEXT NOT NULL,
  verify_token TEXT,
  display_phone_number TEXT,
  verified_name TEXT,
  quality_rating TEXT DEFAULT 'UNKNOWN',
  status TEXT NOT NULL DEFAULT 'disconnected',
  connected_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(account_id)
);
ALTER TABLE whatsapp_configs ENABLE ROW LEVEL SECURITY;

-- Multiple WhatsApp Phone Connections Per Account (Multi-Line WABA)
CREATE TABLE IF NOT EXISTS whatsapp_connections (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  phone_number_id TEXT NOT NULL UNIQUE,
  waba_id TEXT NOT NULL,
  display_phone_number TEXT NOT NULL,
  verified_name TEXT NOT NULL,
  quality_rating TEXT DEFAULT 'GREEN',
  status TEXT NOT NULL DEFAULT 'connected',
  is_default BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE whatsapp_connections ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Members can view connections" ON whatsapp_connections;
CREATE POLICY "Members can view connections" ON whatsapp_connections
  FOR SELECT TO authenticated
  USING (is_account_member(account_id, 'viewer'));

DROP POLICY IF EXISTS "Admins can manage connections" ON whatsapp_connections;
CREATE POLICY "Admins can manage connections" ON whatsapp_connections
  FOR ALL TO authenticated
  USING (is_account_member(account_id, 'admin'));

-- WhatsApp HSM Message Templates
CREATE TABLE IF NOT EXISTS message_templates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  meta_template_id TEXT,
  category TEXT NOT NULL DEFAULT 'MARKETING',
  language TEXT NOT NULL DEFAULT 'en_US',
  header_type TEXT,
  header_content TEXT,
  body_text TEXT NOT NULL,
  footer_text TEXT,
  buttons JSONB NOT NULL DEFAULT '[]'::jsonb,
  status TEXT NOT NULL DEFAULT 'APPROVED',
  rejection_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE message_templates ADD COLUMN IF NOT EXISTS header_type TEXT;
ALTER TABLE message_templates ADD COLUMN IF NOT EXISTS header_content TEXT;
ALTER TABLE message_templates ADD COLUMN IF NOT EXISTS footer_text TEXT;
ALTER TABLE message_templates ADD COLUMN IF NOT EXISTS buttons JSONB DEFAULT '[]'::jsonb;

ALTER TABLE message_templates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Members can view message templates" ON message_templates;
CREATE POLICY "Members can view message templates" ON message_templates
  FOR SELECT TO authenticated
  USING (is_account_member(account_id, 'viewer'));

DROP POLICY IF EXISTS "Agents can manage message templates" ON message_templates;
CREATE POLICY "Agents can manage message templates" ON message_templates
  FOR ALL TO authenticated
  USING (is_account_member(account_id, 'agent'));

-- ==============================================================================
-- 4. CONTACTS & AUDIENCE SEGMENTATION
-- ==============================================================================
CREATE TABLE IF NOT EXISTS contacts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  phone TEXT NOT NULL,
  name TEXT,
  email TEXT,
  company TEXT,
  avatar_url TEXT,
  source TEXT DEFAULT 'whatsapp',
  is_opted_out BOOLEAN NOT NULL DEFAULT FALSE,
  custom_attributes JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(account_id, phone)
);

ALTER TABLE contacts ADD COLUMN IF NOT EXISTS is_opted_out BOOLEAN DEFAULT FALSE;
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS custom_attributes JSONB DEFAULT '{}'::jsonb;

ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Members can view contacts" ON contacts;
CREATE POLICY "Members can view contacts" ON contacts
  FOR SELECT TO authenticated
  USING (is_account_member(account_id, 'viewer'));

DROP POLICY IF EXISTS "Agents can manage contacts" ON contacts;
CREATE POLICY "Agents can manage contacts" ON contacts
  FOR ALL TO authenticated
  USING (is_account_member(account_id, 'agent'));

-- Contact Tags
CREATE TABLE IF NOT EXISTS tags (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  color TEXT NOT NULL DEFAULT '#10b981',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(account_id, name)
);

ALTER TABLE tags ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Members can view tags" ON tags;
CREATE POLICY "Members can view tags" ON tags
  FOR SELECT TO authenticated
  USING (is_account_member(account_id, 'viewer'));

DROP POLICY IF EXISTS "Agents can manage tags" ON tags;
CREATE POLICY "Agents can manage tags" ON tags
  FOR ALL TO authenticated
  USING (is_account_member(account_id, 'agent'));

-- Contact Tags Junction
CREATE TABLE IF NOT EXISTS contact_tags (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  contact_id UUID NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
  tag_id UUID NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(contact_id, tag_id)
);

ALTER TABLE contact_tags ENABLE ROW LEVEL SECURITY;

-- ==============================================================================
-- 5. SHARED INBOX, CONVERSATIONS & MESSAGES
-- ==============================================================================
CREATE TABLE IF NOT EXISTS conversations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  contact_id UUID NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'open',
  assigned_agent_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  last_message_text TEXT,
  last_message_at TIMESTAMPTZ,
  last_customer_message_at TIMESTAMPTZ,
  unread_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(account_id, contact_id)
);

ALTER TABLE conversations ADD COLUMN IF NOT EXISTS last_customer_message_at TIMESTAMPTZ;
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS unread_count INTEGER DEFAULT 0;

ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Members can view conversations" ON conversations;
CREATE POLICY "Members can view conversations" ON conversations
  FOR SELECT TO authenticated
  USING (is_account_member(account_id, 'viewer'));

DROP POLICY IF EXISTS "Agents can update conversations" ON conversations;
CREATE POLICY "Agents can update conversations" ON conversations
  FOR ALL TO authenticated
  USING (is_account_member(account_id, 'agent'));

-- Messages Table
CREATE TABLE IF NOT EXISTS messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  sender_type TEXT NOT NULL,
  sender_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  content_type TEXT NOT NULL DEFAULT 'text',
  content_text TEXT,
  media_url TEXT,
  meta_media_id TEXT,
  template_name TEXT,
  wamid TEXT UNIQUE,
  status TEXT NOT NULL DEFAULT 'sent',
  error_message TEXT,
  raw_payload JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE messages ADD COLUMN IF NOT EXISTS wamid TEXT;
ALTER TABLE messages ADD COLUMN IF NOT EXISTS meta_media_id TEXT;
ALTER TABLE messages ADD COLUMN IF NOT EXISTS raw_payload JSONB DEFAULT '{}'::jsonb;
ALTER TABLE messages ADD COLUMN IF NOT EXISTS error_message TEXT;

ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Members can view messages" ON messages;
CREATE POLICY "Members can view messages" ON messages
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM conversations c
    WHERE c.id = messages.conversation_id
      AND is_account_member(c.account_id, 'viewer')
  ));

DROP POLICY IF EXISTS "Agents can insert messages" ON messages;
CREATE POLICY "Agents can insert messages" ON messages
  FOR INSERT TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM conversations c
    WHERE c.id = messages.conversation_id
      AND is_account_member(c.account_id, 'agent')
  ));

-- ==============================================================================
-- 6. BROADCAST CAMPAIGNS & RECIPIENTS
-- ==============================================================================
CREATE TABLE IF NOT EXISTS broadcasts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  template_id UUID REFERENCES message_templates(id) ON DELETE SET NULL,
  template_name TEXT NOT NULL,
  target_tag_ids JSONB NOT NULL DEFAULT '[]'::jsonb,
  status TEXT NOT NULL DEFAULT 'draft',
  scheduled_at TIMESTAMPTZ,
  total_recipients INTEGER NOT NULL DEFAULT 0,
  sent_count INTEGER NOT NULL DEFAULT 0,
  delivered_count INTEGER NOT NULL DEFAULT 0,
  read_count INTEGER NOT NULL DEFAULT 0,
  failed_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE broadcasts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Members can view broadcasts" ON broadcasts;
CREATE POLICY "Members can view broadcasts" ON broadcasts
  FOR SELECT TO authenticated
  USING (is_account_member(account_id, 'viewer'));

DROP POLICY IF EXISTS "Agents can manage broadcasts" ON broadcasts;
CREATE POLICY "Agents can manage broadcasts" ON broadcasts
  FOR ALL TO authenticated
  USING (is_account_member(account_id, 'agent'));

CREATE TABLE IF NOT EXISTS broadcast_recipients (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  broadcast_id UUID NOT NULL REFERENCES broadcasts(id) ON DELETE CASCADE,
  contact_id UUID REFERENCES contacts(id) ON DELETE SET NULL,
  phone TEXT NOT NULL,
  variables JSONB NOT NULL DEFAULT '{}'::jsonb,
  wamid TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  error_message TEXT,
  sent_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE broadcast_recipients ENABLE ROW LEVEL SECURITY;

-- ==============================================================================
-- 7. SALES PIPELINES & DEALS CRM
-- ==============================================================================
CREATE TABLE IF NOT EXISTS pipelines (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  is_default BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE pipelines ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Members can view pipelines" ON pipelines;
CREATE POLICY "Members can view pipelines" ON pipelines
  FOR SELECT TO authenticated
  USING (is_account_member(account_id, 'viewer'));

DROP POLICY IF EXISTS "Agents can manage pipelines" ON pipelines;
CREATE POLICY "Agents can manage pipelines" ON pipelines
  FOR ALL TO authenticated
  USING (is_account_member(account_id, 'agent'));

CREATE TABLE IF NOT EXISTS pipeline_stages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  pipeline_id UUID NOT NULL REFERENCES pipelines(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  position INTEGER NOT NULL DEFAULT 0,
  color TEXT NOT NULL DEFAULT '#6366f1',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE pipeline_stages ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS pipeline_deals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  stage_id UUID NOT NULL REFERENCES pipeline_stages(id) ON DELETE CASCADE,
  contact_id UUID NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  value NUMERIC(12, 2) NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'INR',
  status TEXT NOT NULL DEFAULT 'open',
  assigned_agent_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE pipeline_deals ENABLE ROW LEVEL SECURITY;

-- ==============================================================================
-- 8. AUTOMATIONS & VISUAL FLOWS
-- ==============================================================================
CREATE TABLE IF NOT EXISTS automations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  trigger_type TEXT NOT NULL,
  trigger_config JSONB NOT NULL DEFAULT '{}'::jsonb,
  action_type TEXT NOT NULL,
  action_config JSONB NOT NULL DEFAULT '{}'::jsonb,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  executions_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE automations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Members can view automations" ON automations;
CREATE POLICY "Members can view automations" ON automations
  FOR SELECT TO authenticated
  USING (is_account_member(account_id, 'viewer'));

DROP POLICY IF EXISTS "Agents can manage automations" ON automations;
CREATE POLICY "Agents can manage automations" ON automations
  FOR ALL TO authenticated
  USING (is_account_member(account_id, 'agent'));

-- Visual Workflow Canvas Flows
CREATE TABLE IF NOT EXISTS visual_flows (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  nodes JSONB NOT NULL DEFAULT '[]'::jsonb,
  edges JSONB NOT NULL DEFAULT '[]'::jsonb,
  trigger_keywords JSONB NOT NULL DEFAULT '[]'::jsonb,
  is_published BOOLEAN NOT NULL DEFAULT FALSE,
  total_runs INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE visual_flows ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Members can view visual flows" ON visual_flows;
CREATE POLICY "Members can view visual flows" ON visual_flows
  FOR SELECT TO authenticated
  USING (is_account_member(account_id, 'viewer'));

DROP POLICY IF EXISTS "Agents can manage visual flows" ON visual_flows;
CREATE POLICY "Agents can manage visual flows" ON visual_flows
  FOR ALL TO authenticated
  USING (is_account_member(account_id, 'agent'));

-- ==============================================================================
-- 9. AI AUTO-REPLY (BYOK) & KNOWLEDGE BASE
-- ==============================================================================
CREATE TABLE IF NOT EXISTS ai_configs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  provider TEXT NOT NULL DEFAULT 'gemini',
  api_key TEXT NOT NULL,
  model TEXT NOT NULL DEFAULT 'gemini-1.5-flash',
  system_prompt TEXT NOT NULL DEFAULT 'You are a helpful and polite WhatsApp customer assistant.',
  temperature NUMERIC(3,2) NOT NULL DEFAULT 0.7,
  is_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  handoff_keywords JSONB NOT NULL DEFAULT '["agent", "human", "support", "talk to person"]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(account_id)
);

ALTER TABLE ai_configs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Members can view ai configs" ON ai_configs;
CREATE POLICY "Members can view ai configs" ON ai_configs
  FOR SELECT TO authenticated
  USING (is_account_member(account_id, 'viewer'));

DROP POLICY IF EXISTS "Admins can manage ai configs" ON ai_configs;
CREATE POLICY "Admins can manage ai configs" ON ai_configs
  FOR ALL TO authenticated
  USING (is_account_member(account_id, 'admin'));

-- Update provider check constraint to support OpenAI, Anthropic, Gemini, OpenRouter
ALTER TABLE ai_configs DROP CONSTRAINT IF EXISTS ai_configs_provider_check;
ALTER TABLE ai_configs ADD CONSTRAINT ai_configs_provider_check
  CHECK (provider IN ('openai', 'anthropic', 'gemini', 'openrouter'));

-- AI Usage and Token Logs
CREATE TABLE IF NOT EXISTS ai_usage_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  conversation_id UUID REFERENCES conversations(id) ON DELETE SET NULL,
  provider TEXT NOT NULL CHECK (provider IN ('openai', 'anthropic', 'gemini', 'openrouter')),
  model TEXT NOT NULL,
  prompt_tokens INT NOT NULL DEFAULT 0,
  completion_tokens INT NOT NULL DEFAULT 0,
  total_tokens INT NOT NULL DEFAULT 0,
  latency_ms INT,
  status TEXT NOT NULL DEFAULT 'success' CHECK (status IN ('success', 'error', 'cancelled')),
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ai_usage_log_account_created
  ON ai_usage_log(account_id, created_at DESC);

ALTER TABLE ai_usage_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Members can view ai usage log" ON ai_usage_log;
CREATE POLICY "Members can view ai usage log" ON ai_usage_log
  FOR SELECT TO authenticated
  USING (is_account_member(account_id, 'viewer'));

CREATE TABLE IF NOT EXISTS ai_knowledge_bases (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE ai_knowledge_bases ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Members can view knowledge bases" ON ai_knowledge_bases;
CREATE POLICY "Members can view knowledge bases" ON ai_knowledge_bases
  FOR SELECT TO authenticated
  USING (is_account_member(account_id, 'viewer'));

DROP POLICY IF EXISTS "Agents can manage knowledge bases" ON ai_knowledge_bases;
CREATE POLICY "Agents can manage knowledge bases" ON ai_knowledge_bases
  FOR ALL TO authenticated
  USING (is_account_member(account_id, 'agent'));

-- ==============================================================================
-- 10. BILLING, SUBSCRIPTIONS & RAZORPAY
-- ==============================================================================
CREATE TABLE IF NOT EXISTS subscription_plans (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  price_inr INTEGER NOT NULL,
  contact_limit INTEGER,
  monthly_message_limit INTEGER,
  whatsapp_connections_limit INTEGER NOT NULL DEFAULT 1,
  features JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO subscription_plans (id, name, price_inr, contact_limit, monthly_message_limit, whatsapp_connections_limit, features)
VALUES
  ('free', 'Free Tier', 0, 10, 200, 1, '["inbox", "automations"]'::jsonb),
  ('pro', 'Pro Plan', 499, 1000, 50000, 1, '["inbox", "automations", "flows", "ai_reply", "telegram", "google_sheets"]'::jsonb),
  ('business', 'Business Plan', 3000, 7000, 200000, 5, '["inbox", "automations", "flows", "ai_reply", "broadcast", "telegram", "google_sheets", "google_calendar", "advanced_analytics"]'::jsonb),
  ('enterprise', 'Enterprise Scale', 8999, 50000, 1000000, 10, '["inbox", "automations", "flows", "ai_reply", "broadcast", "telegram", "google_sheets", "google_calendar", "advanced_analytics", "dedicated_ip", "custom_sla"]'::jsonb)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  price_inr = EXCLUDED.price_inr,
  contact_limit = EXCLUDED.contact_limit,
  monthly_message_limit = EXCLUDED.monthly_message_limit,
  whatsapp_connections_limit = EXCLUDED.whatsapp_connections_limit,
  features = EXCLUDED.features;

ALTER TABLE subscription_plans ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Plans are viewable by all" ON subscription_plans;
CREATE POLICY "Plans are viewable by all" ON subscription_plans FOR SELECT USING (TRUE);

-- Active Subscriptions Table
CREATE TABLE IF NOT EXISTS subscriptions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  plan_id TEXT NOT NULL,
  razorpay_subscription_id TEXT,
  razorpay_customer_id TEXT,
  status TEXT NOT NULL DEFAULT 'active',
  current_period_start TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  current_period_end TIMESTAMPTZ,
  grace_period_end TIMESTAMPTZ,
  cancel_at_period_end BOOLEAN NOT NULL DEFAULT FALSE,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(account_id)
);

ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS razorpay_subscription_id TEXT;
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS razorpay_customer_id TEXT;
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active';
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS current_period_start TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS current_period_end TIMESTAMPTZ;
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS grace_period_end TIMESTAMPTZ;
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS cancel_at_period_end BOOLEAN DEFAULT FALSE;
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS notes TEXT;

ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Members can view subscription" ON subscriptions;
CREATE POLICY "Members can view subscription" ON subscriptions
  FOR SELECT TO authenticated
  USING (is_account_member(account_id, 'viewer'));

DROP POLICY IF EXISTS "Admins can update subscription" ON subscriptions;
CREATE POLICY "Admins can update subscription" ON subscriptions
  FOR ALL TO authenticated
  USING (is_account_member(account_id, 'admin'));

-- Payment Transactions Audit Record
CREATE TABLE IF NOT EXISTS payment_transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  razorpay_payment_id TEXT NOT NULL UNIQUE,
  razorpay_order_id TEXT,
  razorpay_subscription_id TEXT,
  amount INTEGER NOT NULL,
  currency TEXT NOT NULL DEFAULT 'INR',
  status TEXT NOT NULL DEFAULT 'captured',
  payment_method TEXT NOT NULL DEFAULT 'razorpay',
  raw_payload JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE payment_transactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Members can view transactions" ON payment_transactions;
CREATE POLICY "Members can view transactions" ON payment_transactions
  FOR SELECT TO authenticated
  USING (is_account_member(account_id, 'viewer'));

-- Webhook Idempotency Event Deduplication
CREATE TABLE IF NOT EXISTS billing_webhook_events (
  id TEXT PRIMARY KEY,
  event_type TEXT NOT NULL,
  processed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ==============================================================================
-- 11. DEVELOPER API KEYS, WEBHOOKS & NOTIFICATIONS
-- ==============================================================================
CREATE TABLE IF NOT EXISTS api_keys (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  key_hash TEXT NOT NULL UNIQUE,
  key_prefix TEXT NOT NULL,
  name TEXT NOT NULL,
  scopes JSONB NOT NULL DEFAULT '["contacts:read", "contacts:write", "messages:send"]'::jsonb,
  last_used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE api_keys ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS webhook_endpoints (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  secret TEXT NOT NULL,
  events JSONB NOT NULL DEFAULT '["message.received", "message.sent", "contact.created"]'::jsonb,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE webhook_endpoints ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'info',
  link TEXT,
  is_read BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- ==============================================================================
-- 12. SUPER ADMIN CONTROL CENTER & SAAS CONFIGURATION
-- ==============================================================================
CREATE TABLE IF NOT EXISTS admin_users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  full_name TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'admin',
  permissions JSONB NOT NULL DEFAULT '[]'::jsonb,
  status TEXT NOT NULL DEFAULT 'active',
  last_login_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Service role manages admin_users" ON admin_users;
CREATE POLICY "Service role manages admin_users" ON admin_users
  FOR ALL TO service_role USING (TRUE);

-- Admin Audit Trail
CREATE TABLE IF NOT EXISTS admin_audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  admin_email TEXT NOT NULL,
  admin_role TEXT NOT NULL,
  action TEXT NOT NULL,
  target_type TEXT NOT NULL,
  target_id TEXT,
  details JSONB NOT NULL DEFAULT '{}'::jsonb,
  ip_address TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE admin_audit_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Service role manages admin_audit_logs" ON admin_audit_logs;
CREATE POLICY "Service role manages admin_audit_logs" ON admin_audit_logs
  FOR ALL TO service_role USING (TRUE);

-- Feature Flags & Rollouts
CREATE TABLE IF NOT EXISTS feature_flags (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  enabled_globally BOOLEAN NOT NULL DEFAULT TRUE,
  allowed_plans JSONB NOT NULL DEFAULT '["pro", "business", "enterprise"]'::jsonb,
  client_overrides JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO feature_flags (id, name, description, enabled_globally, allowed_plans, client_overrides)
VALUES
  ('inbox', 'Shared Team Inbox', 'Multi-agent customer messaging with 24h timer and internal notes', TRUE, '["free", "pro", "business", "enterprise"]'::jsonb, '{}'::jsonb),
  ('automations', 'Basic Automations', 'Keyword and condition-based automated replies', TRUE, '["free", "pro", "business", "enterprise"]'::jsonb, '{}'::jsonb),
  ('flows', 'Visual Flow Builder', 'Drag-and-drop conversational workflow canvas', TRUE, '["pro", "business", "enterprise"]'::jsonb, '{}'::jsonb),
  ('ai_reply', 'AI Auto-Replies (BYOK)', 'Bring-your-own-key Google Gemini & OpenAI auto suggestions', TRUE, '["pro", "business", "enterprise"]'::jsonb, '{}'::jsonb),
  ('broadcast', 'WhatsApp Broadcast Campaigns', 'Bulk template messaging campaigns to segmented contacts', TRUE, '["business", "enterprise"]'::jsonb, '{}'::jsonb),
  ('telegram', 'Telegram Bot Channel', 'Receive and respond to customer queries from Telegram', TRUE, '["pro", "business", "enterprise"]'::jsonb, '{}'::jsonb),
  ('google_sheets', 'Google Sheets Lead Sync', 'Real-time lead export to connected Google Spreadsheets', TRUE, '["pro", "business", "enterprise"]'::jsonb, '{}'::jsonb),
  ('google_calendar', 'Google Calendar & Calendly', 'Share dynamic consultation booking links in WhatsApp chats', TRUE, '["pro", "business", "enterprise"]'::jsonb, '{}'::jsonb),
  ('advanced_analytics', 'Advanced Performance Analytics', 'FRT, agent resolution rates, and hourly volume heatmaps', TRUE, '["business", "enterprise"]'::jsonb, '{}'::jsonb)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  updated_at = NOW();

ALTER TABLE feature_flags ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Feature flags are readable by authenticated" ON feature_flags;
CREATE POLICY "Feature flags are readable by authenticated" ON feature_flags
  FOR SELECT TO authenticated USING (TRUE);

-- System Settings
CREATE TABLE IF NOT EXISTS system_settings (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO system_settings (key, value)
VALUES
  ('general', '{
    "platform_name": "NX CRM",
    "company_name": "Nexora Spark Agency",
    "support_email": "nexorasparkagencyofficial@gmail.com",
    "sales_email": "nexorasparkagencyofficial@gmail.com",
    "phone": "+91 8653678794",
    "business_address": "Sripur Bazar, Balagarh, West Bengal 712514, India",
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
  }'::jsonb),
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

ALTER TABLE system_settings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "System settings readable by authenticated" ON system_settings;
CREATE POLICY "System settings readable by authenticated" ON system_settings
  FOR SELECT TO authenticated USING (TRUE);

-- ==============================================================================
-- 13. WEBSITE INQUIRIES & META GDPR DATA DELETION
-- ==============================================================================
CREATE TABLE IF NOT EXISTS contact_inquiries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  company TEXT,
  category TEXT NOT NULL DEFAULT 'sales',
  subject TEXT NOT NULL,
  message TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'new',
  ip_address TEXT,
  user_agent TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE contact_inquiries ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Service role manages contact_inquiries" ON contact_inquiries;
CREATE POLICY "Service role manages contact_inquiries" ON contact_inquiries
  FOR ALL TO service_role USING (TRUE);

CREATE TABLE IF NOT EXISTS data_deletion_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  workspace_name TEXT,
  reason TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  ip_address TEXT,
  user_agent TEXT,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE data_deletion_requests ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Service role manages data_deletion_requests" ON data_deletion_requests;
CREATE POLICY "Service role manages data_deletion_requests" ON data_deletion_requests
  FOR ALL TO service_role USING (TRUE);

-- ==============================================================================
-- 14. ATOMIC SIGNUP TRIGGER FUNCTION
-- ==============================================================================
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  new_account_id UUID;
  user_full_name TEXT;
BEGIN
  user_full_name := COALESCE(
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'name',
    split_part(NEW.email, '@', 1)
  );

  -- 1. Create Workspace Account
  INSERT INTO public.accounts (name, owner_user_id, status)
  VALUES (user_full_name || '''s Workspace', NEW.id, 'active')
  RETURNING id INTO new_account_id;

  -- 2. Create User Profile
  INSERT INTO public.profiles (user_id, account_id, account_role, full_name, email, avatar_url)
  VALUES (
    NEW.id,
    new_account_id,
    'owner',
    user_full_name,
    NEW.email,
    NEW.raw_user_meta_data->>'avatar_url'
  );

  -- 3. Provision Free Active Subscription
  INSERT INTO public.subscriptions (
    account_id,
    plan_id,
    status,
    current_period_start,
    current_period_end
  )
  VALUES (
    new_account_id,
    'free',
    'active',
    NOW(),
    NOW() + INTERVAL '30 days'
  )
  ON CONFLICT (account_id) DO NOTHING;

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Bind Signup Trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ==============================================================================
-- Account Integrations Hub (Google Sheets, Zoho, Payment Gateways, Webhooks)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.account_integrations (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id      UUID NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  integration_id  TEXT NOT NULL,
  is_enabled      BOOLEAN NOT NULL DEFAULT false,
  config          JSONB NOT NULL DEFAULT '{}'::jsonb,
  connected_by_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  google_account_email TEXT,
  encrypted_refresh_token TEXT,
  granted_scopes  TEXT[],
  external_resource_id TEXT,
  last_synced_at  TIMESTAMPTZ,
  last_error      TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT account_integrations_unique_per_account UNIQUE (account_id, integration_id)
);

CREATE INDEX IF NOT EXISTS idx_account_integrations_lookup 
  ON public.account_integrations(account_id, integration_id);

ALTER TABLE public.account_integrations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS account_integrations_select ON public.account_integrations;
CREATE POLICY account_integrations_select ON public.account_integrations
  FOR SELECT USING (is_account_member(account_id));

DROP POLICY IF EXISTS account_integrations_insert ON public.account_integrations;
CREATE POLICY account_integrations_insert ON public.account_integrations
  FOR INSERT WITH CHECK (is_account_member(account_id, 'admin'));

DROP POLICY IF EXISTS account_integrations_update ON public.account_integrations;
CREATE POLICY account_integrations_update ON public.account_integrations
  FOR UPDATE USING (is_account_member(account_id, 'admin'));

DROP POLICY IF EXISTS account_integrations_delete ON public.account_integrations;
CREATE POLICY account_integrations_delete ON public.account_integrations
  FOR DELETE USING (is_account_member(account_id, 'admin'));

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
  FOR EACH ROW EXECUTE FUNCTION public.update_account_integrations_updated_at();

-- Safe update for flow_nodes node_type check constraint (includes 'delay')
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'flow_nodes') THEN
    ALTER TABLE public.flow_nodes DROP CONSTRAINT IF EXISTS flow_nodes_node_type_check;
    ALTER TABLE public.flow_nodes ADD CONSTRAINT flow_nodes_node_type_check
      CHECK (node_type IN (
        'start',
        'send_buttons',
        'send_list',
        'send_message',
        'send_media',
        'delay',
        'collect_input',
        'condition',
        'set_tag',
        'handoff',
        'http_fetch',
        'end'
      ));
  END IF;
END $$;

-- ==============================================================================
-- Schema consolidation complete.
-- ==============================================================================



-- ==============================================================================
-- MIGRATION 058 — realtime & inbox performance (see supabase/migrations/058_*.sql)
-- ==============================================================================
-- ==============================================================================
-- 058 — Realtime & inbox performance
--
-- Why: the inbox subscribed to *every* row change on `messages` (there was no
-- column to filter on), so Supabase Realtime had to run the messages RLS
-- policy for every subscriber on every insert/status update across all
-- tenants. On top of that, legacy policies from earlier migrations were left
-- in place next to their replacements, so every row check evaluated 2–3
-- equivalent permissive policies. Together that showed up as lag on
-- incoming/outgoing messages.
--
-- What:
--   1. messages.account_id — denormalised from conversations by a trigger so
--      the client can subscribe with `filter: account_id=eq.<id>`.
--   2. Drop legacy duplicate permissive policies (the `*_select` / `*_modify`
--      / `*_insert` / `*_update` / `*_delete` policies grant exactly the same
--      access via is_account_member()).
--   3. Inbox-shaped indexes (conversation list ordering, broadcast reply
--      lookup) and removal of a duplicate index.
--
-- Fully idempotent and backwards compatible: existing code that does not know
-- about messages.account_id keeps working because the trigger fills it in.
-- ==============================================================================

-- 1. messages.account_id ------------------------------------------------------
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS account_id UUID;

CREATE OR REPLACE FUNCTION public.set_message_account_id()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.account_id IS NULL OR (TG_OP = 'UPDATE' AND NEW.conversation_id IS DISTINCT FROM OLD.conversation_id) THEN
    SELECT c.account_id INTO NEW.account_id
    FROM public.conversations c
    WHERE c.id = NEW.conversation_id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_messages_set_account_id ON public.messages;
CREATE TRIGGER trg_messages_set_account_id
  BEFORE INSERT OR UPDATE OF conversation_id ON public.messages
  FOR EACH ROW EXECUTE FUNCTION public.set_message_account_id();

UPDATE public.messages m
SET account_id = c.account_id
FROM public.conversations c
WHERE c.id = m.conversation_id
  AND m.account_id IS DISTINCT FROM c.account_id;

CREATE INDEX IF NOT EXISTS idx_messages_account_created
  ON public.messages (account_id, created_at DESC);

-- 2. Drop legacy duplicate permissive policies --------------------------------
DROP POLICY IF EXISTS "Members can view messages" ON public.messages;
DROP POLICY IF EXISTS "Agents can insert messages" ON public.messages;

DROP POLICY IF EXISTS "Members can view conversations" ON public.conversations;
DROP POLICY IF EXISTS "Agents can update conversations" ON public.conversations;

DROP POLICY IF EXISTS "Members can view contacts" ON public.contacts;
DROP POLICY IF EXISTS "Agents can manage contacts" ON public.contacts;

DROP POLICY IF EXISTS "Members can view broadcasts" ON public.broadcasts;
DROP POLICY IF EXISTS "Agents can manage broadcasts" ON public.broadcasts;

-- whatsapp_config: the legacy policies also re-evaluated auth.uid() per row
-- (auth_rls_initplan). whatsapp_config_{select,insert,update,delete} cover
-- the same access through is_account_member().
DROP POLICY IF EXISTS "Account members can view non-archived connections" ON public.whatsapp_config;
DROP POLICY IF EXISTS "Admins can manage whatsapp connections" ON public.whatsapp_config;

-- Make sure the replacement policies exist (no-ops where they already do).
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='messages' AND policyname='messages_select') THEN
    CREATE POLICY messages_select ON public.messages FOR SELECT
      USING (EXISTS (SELECT 1 FROM public.conversations c WHERE c.id = messages.conversation_id AND public.is_account_member(c.account_id)));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='messages' AND policyname='messages_modify') THEN
    CREATE POLICY messages_modify ON public.messages FOR ALL
      USING (EXISTS (SELECT 1 FROM public.conversations c WHERE c.id = messages.conversation_id AND public.is_account_member(c.account_id, 'agent')))
      WITH CHECK (EXISTS (SELECT 1 FROM public.conversations c WHERE c.id = messages.conversation_id AND public.is_account_member(c.account_id, 'agent')));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='conversations' AND policyname='conversations_select') THEN
    CREATE POLICY conversations_select ON public.conversations FOR SELECT USING (public.is_account_member(account_id));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='conversations' AND policyname='conversations_insert') THEN
    CREATE POLICY conversations_insert ON public.conversations FOR INSERT WITH CHECK (public.is_account_member(account_id, 'agent'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='conversations' AND policyname='conversations_update') THEN
    CREATE POLICY conversations_update ON public.conversations FOR UPDATE USING (public.is_account_member(account_id, 'agent'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='conversations' AND policyname='conversations_delete') THEN
    CREATE POLICY conversations_delete ON public.conversations FOR DELETE USING (public.is_account_member(account_id, 'agent'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='contacts' AND policyname='contacts_select') THEN
    CREATE POLICY contacts_select ON public.contacts FOR SELECT USING (public.is_account_member(account_id));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='contacts' AND policyname='contacts_insert') THEN
    CREATE POLICY contacts_insert ON public.contacts FOR INSERT WITH CHECK (public.is_account_member(account_id, 'agent'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='contacts' AND policyname='contacts_update') THEN
    CREATE POLICY contacts_update ON public.contacts FOR UPDATE USING (public.is_account_member(account_id, 'agent'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='contacts' AND policyname='contacts_delete') THEN
    CREATE POLICY contacts_delete ON public.contacts FOR DELETE USING (public.is_account_member(account_id, 'agent'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='broadcasts' AND policyname='broadcasts_select') THEN
    CREATE POLICY broadcasts_select ON public.broadcasts FOR SELECT USING (public.is_account_member(account_id));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='broadcasts' AND policyname='broadcasts_insert') THEN
    CREATE POLICY broadcasts_insert ON public.broadcasts FOR INSERT WITH CHECK (public.is_account_member(account_id, 'agent'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='broadcasts' AND policyname='broadcasts_update') THEN
    CREATE POLICY broadcasts_update ON public.broadcasts FOR UPDATE USING (public.is_account_member(account_id, 'agent'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='broadcasts' AND policyname='broadcasts_delete') THEN
    CREATE POLICY broadcasts_delete ON public.broadcasts FOR DELETE USING (public.is_account_member(account_id, 'agent'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='whatsapp_config' AND policyname='whatsapp_config_select') THEN
    CREATE POLICY whatsapp_config_select ON public.whatsapp_config FOR SELECT USING (public.is_account_member(account_id));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='whatsapp_config' AND policyname='whatsapp_config_insert') THEN
    CREATE POLICY whatsapp_config_insert ON public.whatsapp_config FOR INSERT WITH CHECK (public.is_account_member(account_id, 'admin'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='whatsapp_config' AND policyname='whatsapp_config_update') THEN
    CREATE POLICY whatsapp_config_update ON public.whatsapp_config FOR UPDATE USING (public.is_account_member(account_id, 'admin'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='whatsapp_config' AND policyname='whatsapp_config_delete') THEN
    CREATE POLICY whatsapp_config_delete ON public.whatsapp_config FOR DELETE USING (public.is_account_member(account_id, 'admin'));
  END IF;
END $$;

-- 3. Indexes -------------------------------------------------------------------
-- Inbox conversation list: WHERE account_id = ? ORDER BY last_message_at DESC
CREATE INDEX IF NOT EXISTS idx_conversations_account_last_message
  ON public.conversations (account_id, last_message_at DESC NULLS LAST);

-- Webhook flagBroadcastReplyIfAny(): WHERE contact_id = ? AND status IN (...)
CREATE INDEX IF NOT EXISTS idx_broadcast_recipients_contact_status
  ON public.broadcast_recipients (contact_id, status, created_at DESC);

-- Exact duplicate of idx_whatsapp_config_account_id.
DROP INDEX IF EXISTS public.idx_whatsapp_config_account;

-- Keep messages in the realtime publication (no-op when already present).
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime')
     AND NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'messages') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
  END IF;
END $$;


-- ==============================================================================
-- MIGRATION 059 — security & RLS hardening (see supabase/migrations/059_*.sql)
-- ==============================================================================
-- ==============================================================================
-- 059 — Security & RLS hardening (Supabase advisor findings)
--
-- 1. Internal SECURITY DEFINER functions were executable by `anon` and
--    `authenticated` through /rest/v1/rpc/*. The ones below are only ever
--    called by the server with the service-role key (webhook, broadcast
--    counters, AI slot claim, webhook delivery) or are trigger functions, so
--    public EXECUTE is revoked. Trigger functions keep firing: EXECUTE is
--    checked when a trigger is created, not when it fires.
-- 2. Account-management RPCs that check auth.uid() internally stay callable
--    by signed-in users but not by anonymous callers. peek_invitation stays
--    public (the invite landing page calls it before sign-in), as do
--    is_account_member / can_access_whatsapp_connection (used inside RLS).
-- 3. Pin search_path on functions flagged as role-mutable.
-- 4. RLS policies that called auth.uid() per row now use (select auth.uid()),
--    which Postgres evaluates once per statement.
-- 5. Drop exact-duplicate permissive policies. Legacy policies that grant
--    MORE than their replacement (e.g. agents managing tags/templates/
--    pipelines) are intentionally kept so no one loses access.
-- 6. Cover every unindexed foreign key in public with an index.
-- Idempotent.
-- ==============================================================================

-- 1 & 2. Function EXECUTE grants ----------------------------------------------
DO $$
DECLARE
  fn record;
  service_only text[] := ARRAY[
    'update_conversation_on_inbound', 'bump_conversation_on_inbound',
    '_bcast_bump', 'recompute_broadcast_counts',
    'merge_duplicate_contacts', 'merge_duplicate_conversations',
    'record_webhook_failure', 'claim_ai_reply_slot', 'rls_auto_enable',
    'set_message_account_id', 'handle_new_user',
    'broadcast_recipient_aggregate_trigger', 'notify_conversation_assigned'
  ];
  signed_in_only text[] := ARRAY[
    'redeem_invitation', 'remove_account_member', 'set_member_role',
    'transfer_account_ownership', 'touch_presence'
  ];
BEGIN
  FOR fn IN
    SELECT p.oid::regprocedure AS sig, p.proname
    FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND (p.proname = ANY (service_only) OR p.proname = ANY (signed_in_only))
  LOOP
    EXECUTE format('REVOKE EXECUTE ON FUNCTION %s FROM PUBLIC, anon', fn.sig);
    EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO service_role', fn.sig);
    IF fn.proname = ANY (service_only) THEN
      EXECUTE format('REVOKE EXECUTE ON FUNCTION %s FROM authenticated', fn.sig);
    ELSE
      EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO authenticated', fn.sig);
    END IF;
  END LOOP;
END $$;

-- 3. search_path -----------------------------------------------------------------
DO $$
DECLARE fn record;
BEGIN
  FOR fn IN
    SELECT p.oid::regprocedure AS sig
    FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname IN (
        'update_updated_at_column', '_bcast_cols_for_status', 'handle_new_user',
        'update_ai_configs_updated_at', 'update_ai_knowledge_documents_updated_at',
        'update_account_integrations_updated_at'
      )
  LOOP
    EXECUTE format('ALTER FUNCTION %s SET search_path = public', fn.sig);
  END LOOP;
END $$;

-- 4. auth.uid() evaluated once per statement --------------------------------------
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='profiles' AND policyname='profiles_select') THEN
    ALTER POLICY profiles_select ON public.profiles
      USING (((select auth.uid()) = user_id) OR public.is_account_member(account_id));
  END IF;
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='profiles' AND policyname='profiles_insert') THEN
    ALTER POLICY profiles_insert ON public.profiles
      WITH CHECK ((select auth.uid()) = user_id);
  END IF;
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='profiles' AND policyname='profiles_update') THEN
    ALTER POLICY profiles_update ON public.profiles
      USING ((select auth.uid()) = user_id) WITH CHECK ((select auth.uid()) = user_id);
  END IF;
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='notifications' AND policyname='notifications_select') THEN
    ALTER POLICY notifications_select ON public.notifications
      USING ((select auth.uid()) = user_id);
  END IF;
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='notifications' AND policyname='notifications_update') THEN
    ALTER POLICY notifications_update ON public.notifications
      USING ((select auth.uid()) = user_id) WITH CHECK ((select auth.uid()) = user_id);
  END IF;
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='audit_logs' AND policyname='Admins can view audit logs') THEN
    ALTER POLICY "Admins can view audit logs" ON public.audit_logs
      USING (account_id IN (SELECT p.account_id FROM public.profiles p
             WHERE p.user_id = (select auth.uid())
               AND p.account_role = ANY (ARRAY['owner'::account_role_enum, 'admin'::account_role_enum])));
  END IF;
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='audit_logs' AND policyname='Service role and admins can insert audit logs') THEN
    ALTER POLICY "Service role and admins can insert audit logs" ON public.audit_logs
      WITH CHECK (account_id IN (SELECT p.account_id FROM public.profiles p
                  WHERE p.user_id = (select auth.uid())));
  END IF;
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='channel_connections' AND policyname='Account members can view channel connections') THEN
    ALTER POLICY "Account members can view channel connections" ON public.channel_connections
      USING ((account_id IN (SELECT p.account_id FROM public.profiles p
              WHERE p.user_id = (select auth.uid()))) AND is_archived = false);
  END IF;
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='channel_connections' AND policyname='Admins can manage channel connections') THEN
    ALTER POLICY "Admins can manage channel connections" ON public.channel_connections
      USING (account_id IN (SELECT p.account_id FROM public.profiles p
             WHERE p.user_id = (select auth.uid())
               AND p.account_role = ANY (ARRAY['owner'::account_role_enum, 'admin'::account_role_enum])));
  END IF;
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='team_whatsapp_permissions' AND policyname='Admins can manage team whatsapp permissions') THEN
    ALTER POLICY "Admins can manage team whatsapp permissions" ON public.team_whatsapp_permissions
      USING (account_id IN (SELECT p.account_id FROM public.profiles p
             WHERE p.user_id = (select auth.uid())
               AND p.account_role = ANY (ARRAY['owner'::account_role_enum, 'admin'::account_role_enum])));
  END IF;
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='team_whatsapp_permissions' AND policyname='Users can view their team whatsapp permissions') THEN
    ALTER POLICY "Users can view their team whatsapp permissions" ON public.team_whatsapp_permissions
      USING (account_id IN (SELECT p.account_id FROM public.profiles p
             WHERE p.user_id = (select auth.uid())));
  END IF;
END $$;

-- 5. Exact-duplicate permissive policies ---------------------------------------
-- (each one below is identical to, or a strict subset of, a policy that stays)
DROP POLICY IF EXISTS "Account members can view their account" ON public.accounts;
DROP POLICY IF EXISTS "Account owners can update account" ON public.accounts;
DROP POLICY IF EXISTS "Members can view ai configs" ON public.ai_configs;
DROP POLICY IF EXISTS "Admins can manage ai configs" ON public.ai_configs;
DROP POLICY IF EXISTS "Members can view automations" ON public.automations;
DROP POLICY IF EXISTS "Agents can manage automations" ON public.automations;
DROP POLICY IF EXISTS "Allow service role full access on contact_inquiries" ON public.contact_inquiries;
DROP POLICY IF EXISTS "Feature flags are readable by authenticated users" ON public.feature_flags;
DROP POLICY IF EXISTS "Members can view message templates" ON public.message_templates;
DROP POLICY IF EXISTS "Members can view transactions" ON public.payment_transactions;
DROP POLICY IF EXISTS "Members can view pipelines" ON public.pipelines;
DROP POLICY IF EXISTS "Users can view profiles in their account" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admins can update subscription" ON public.subscriptions;
DROP POLICY IF EXISTS "Members can view their account subscription" ON public.subscriptions;
DROP POLICY IF EXISTS "Members can view tags" ON public.tags;

-- 6. Index every unindexed foreign key -------------------------------------------
DO $$
DECLARE
  fk record;
  idx_name text;
BEGIN
  FOR fk IN
    SELECT c.conrelid::regclass AS tbl,
           cl.relname AS tbl_name,
           c.conname,
           string_agg(quote_ident(a.attname), ', ' ORDER BY k.ord) AS cols
    FROM pg_constraint c
    JOIN pg_class cl ON cl.oid = c.conrelid
    JOIN pg_namespace n ON n.oid = cl.relnamespace
    CROSS JOIN LATERAL unnest(c.conkey) WITH ORDINALITY AS k(attnum, ord)
    JOIN pg_attribute a ON a.attrelid = c.conrelid AND a.attnum = k.attnum
    WHERE c.contype = 'f' AND n.nspname = 'public'
      AND NOT EXISTS (
        SELECT 1 FROM pg_index i
        WHERE i.indrelid = c.conrelid
          AND (i.indkey::int2[])[0:array_length(c.conkey, 1) - 1] = c.conkey
      )
    GROUP BY c.conrelid, cl.relname, c.conname
  LOOP
    -- Hash suffix keeps names unique when long table/constraint names would
    -- otherwise truncate to the same 63-character identifier.
    idx_name := left('idx_fk_' || fk.tbl_name || '_' || fk.conname, 54)
                || '_' || left(md5(fk.conname), 8);
    EXECUTE format('CREATE INDEX IF NOT EXISTS %I ON %s (%s)', idx_name, fk.tbl, fk.cols);
  END LOOP;
END $$;


-- ==============================================================================
-- MIGRATION 060 — performance & hardening (see supabase/migrations/060_*.sql)
-- ==============================================================================
-- 060_performance_and_hardening.sql (originally drafted as 058 in PR #11;
-- renumbered to run after 058_realtime_inbox_performance / 059_security_and_rls_hardening)
--
-- Performance + security pass driven by the Supabase advisors.
-- Everything here is additive / semantics-preserving:
--   1. Covering indexes for every unindexed foreign key (advisor 0001).
--   2. Hot-path indexes for the inbox list and dashboard charts.
--   3. Drop an exact-duplicate index on whatsapp_config.
--   4. RLS "initplan" fix: wrap auth.uid()/auth.jwt() in a scalar
--      sub-select so Postgres evaluates it once per statement instead of
--      once per row (advisor 0003). Same predicate, same roles.
--   5. Pin search_path on trigger/helper functions (advisor 0011).
--   6. Revoke PostgREST execute on internal SECURITY DEFINER helpers that
--      are only ever called by triggers or the service-role server code.
--      (merge_duplicate_* in particular could be invoked anonymously.)
--   7. Server-side dashboard aggregations so the browser no longer
--      downloads every message of the last 90 days (which was slow AND
--      silently truncated at PostgREST's 1000-row cap).

-- ---------------------------------------------------------------------
-- 1. Foreign-key covering indexes
-- ---------------------------------------------------------------------
do $$
declare
  r record;
  idx_name text;
begin
  for r in
    select c.conrelid::regclass as tbl,
           cls.relname as tbl_name,
           a.attname as col
    from pg_constraint c
    join pg_class cls on cls.oid = c.conrelid
    join pg_namespace n on n.oid = cls.relnamespace
    join pg_attribute a on a.attrelid = c.conrelid and a.attnum = c.conkey[1]
    where c.contype = 'f'
      and n.nspname = 'public'
      and array_length(c.conkey, 1) = 1
      and not exists (
        select 1 from pg_index i
        where i.indrelid = c.conrelid
          and i.indkey[0] = c.conkey[1]
      )
  loop
    idx_name := left(format('idx_%s_%s', r.tbl_name, r.col), 63);
    execute format('create index if not exists %I on %s (%I)', idx_name, r.tbl, r.col);
  end loop;
end $$;

-- ---------------------------------------------------------------------
-- 2. Hot-path indexes
-- ---------------------------------------------------------------------
-- Inbox conversation list: WHERE account_id = ? ORDER BY last_message_at DESC
create index if not exists idx_conversations_account_last_message
  on public.conversations (account_id, last_message_at desc nulls last);

-- Dashboard series / response-time windows: WHERE created_at >= ?
create index if not exists idx_messages_created_at
  on public.messages (created_at);

-- Some deployed databases carry a `messages.wamid` column that predates
-- the tracked migrations; index it only where it exists.
do $$
begin
  if exists (select 1 from information_schema.columns
             where table_schema = 'public' and table_name = 'messages' and column_name = 'wamid') then
    execute 'create index if not exists idx_messages_wamid on public.messages (wamid) where wamid is not null';
  end if;
end $$;

-- ---------------------------------------------------------------------
-- 3. Duplicate index
-- ---------------------------------------------------------------------
-- idx_whatsapp_config_account and idx_whatsapp_config_account_id are
-- identical. 058_realtime_inbox_performance already drops the former, so
-- only drop this one while both still exist — never leave account_id
-- without an index.
do $$
begin
  if to_regclass('public.idx_whatsapp_config_account') is not null
     and to_regclass('public.idx_whatsapp_config_account_id') is not null then
    execute 'drop index public.idx_whatsapp_config_account_id';
  end if;
end $$;

-- ---------------------------------------------------------------------
-- 4. RLS initplan (identical predicates, evaluated once per query)
-- ---------------------------------------------------------------------
-- Each ALTER runs only if that policy exists, so the migration also
-- applies cleanly to databases that never received the hand-applied
-- policies (fresh installs / CI).
create or replace function pg_temp.alter_policy_if_exists(p_table text, p_policy text, p_sql text)
returns void language plpgsql as $f$
begin
  if exists (select 1 from pg_policies where schemaname = 'public' and tablename = p_table and policyname = p_policy) then
    execute p_sql;
  end if;
end $f$;

select pg_temp.alter_policy_if_exists('notifications', 'notifications_select', $q$alter policy notifications_select on public.notifications
  using ((select auth.uid()) = user_id)$q$);
select pg_temp.alter_policy_if_exists('notifications', 'notifications_update', $q$alter policy notifications_update on public.notifications
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id)$q$);
select pg_temp.alter_policy_if_exists('profiles', 'Users can update own profile', $q$alter policy "Users can update own profile" on public.profiles
  using ((select auth.uid()) = user_id)$q$);
select pg_temp.alter_policy_if_exists('profiles', 'profiles_insert', $q$alter policy profiles_insert on public.profiles
  with check ((select auth.uid()) = user_id)$q$);
select pg_temp.alter_policy_if_exists('profiles', 'profiles_select', $q$alter policy profiles_select on public.profiles
  using (((select auth.uid()) = user_id) or is_account_member(account_id))$q$);
select pg_temp.alter_policy_if_exists('profiles', 'profiles_update', $q$alter policy profiles_update on public.profiles
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id)$q$);
select pg_temp.alter_policy_if_exists('audit_logs', 'Admins can view audit logs', $q$alter policy "Admins can view audit logs" on public.audit_logs
  using (account_id in (
    select p.account_id from public.profiles p
    where p.user_id = (select auth.uid())
      and p.account_role = any (array['owner'::account_role_enum, 'admin'::account_role_enum])))$q$);
select pg_temp.alter_policy_if_exists('audit_logs', 'Service role and admins can insert audit logs', $q$alter policy "Service role and admins can insert audit logs" on public.audit_logs
  with check (account_id in (
    select p.account_id from public.profiles p where p.user_id = (select auth.uid())))$q$);
select pg_temp.alter_policy_if_exists('channel_connections', 'Account members can view channel connections', $q$alter policy "Account members can view channel connections" on public.channel_connections
  using ((account_id in (
    select p.account_id from public.profiles p where p.user_id = (select auth.uid())))
    and is_archived = false)$q$);
select pg_temp.alter_policy_if_exists('channel_connections', 'Admins can manage channel connections', $q$alter policy "Admins can manage channel connections" on public.channel_connections
  using (account_id in (
    select p.account_id from public.profiles p
    where p.user_id = (select auth.uid())
      and p.account_role = any (array['owner'::account_role_enum, 'admin'::account_role_enum])))$q$);
select pg_temp.alter_policy_if_exists('contact_inquiries', 'Allow service role full access on contact_inquiries', $q$alter policy "Allow service role full access on contact_inquiries" on public.contact_inquiries
  using (((select auth.jwt()) ->> 'role') = 'service_role')$q$);
select pg_temp.alter_policy_if_exists('team_whatsapp_permissions', 'Admins can manage team whatsapp permissions', $q$alter policy "Admins can manage team whatsapp permissions" on public.team_whatsapp_permissions
  using (account_id in (
    select p.account_id from public.profiles p
    where p.user_id = (select auth.uid())
      and p.account_role = any (array['owner'::account_role_enum, 'admin'::account_role_enum])))$q$);
select pg_temp.alter_policy_if_exists('team_whatsapp_permissions', 'Users can view their team whatsapp permissions', $q$alter policy "Users can view their team whatsapp permissions" on public.team_whatsapp_permissions
  using (account_id in (
    select p.account_id from public.profiles p where p.user_id = (select auth.uid())))$q$);
select pg_temp.alter_policy_if_exists('whatsapp_config', 'Account members can view non-archived connections', $q$alter policy "Account members can view non-archived connections" on public.whatsapp_config
  using ((account_id in (
    select p.account_id from public.profiles p where p.user_id = (select auth.uid())))
    and is_archived = false)$q$);
select pg_temp.alter_policy_if_exists('whatsapp_config', 'Admins can manage whatsapp connections', $q$alter policy "Admins can manage whatsapp connections" on public.whatsapp_config
  using (account_id in (
    select p.account_id from public.profiles p
    where p.user_id = (select auth.uid())
      and p.account_role = any (array['owner'::account_role_enum, 'admin'::account_role_enum])))$q$);

-- ---------------------------------------------------------------------
-- 5. search_path hardening
-- ---------------------------------------------------------------------
do $$
declare fn record;
begin
  for fn in
    select p.oid::regprocedure as sig
    from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname in (
        'update_updated_at_column', '_bcast_cols_for_status', 'handle_new_user',
        'update_ai_configs_updated_at', 'update_ai_knowledge_documents_updated_at',
        'update_account_integrations_updated_at')
  loop
    execute format('alter function %s set search_path = public, pg_temp', fn.sig);
  end loop;
end $$;

-- ---------------------------------------------------------------------
-- 6. Internal SECURITY DEFINER helpers: not callable through the API.
--    (Triggers still fire; service-role server code is unaffected.)
-- ---------------------------------------------------------------------
do $$
declare fn record;
begin
  for fn in
    select p.oid::regprocedure as sig
    from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname in (
        'merge_duplicate_contacts', 'merge_duplicate_conversations', 'rls_auto_enable',
        'recompute_broadcast_counts', '_bcast_bump', 'update_conversation_on_inbound',
        'record_webhook_failure', 'claim_ai_reply_slot', 'handle_new_user',
        'notify_conversation_assigned', 'broadcast_recipient_aggregate_trigger')
  loop
    execute format('revoke execute on function %s from public, anon, authenticated', fn.sig);
    execute format('grant execute on function %s to service_role', fn.sig);
  end loop;
end $$;

-- ---------------------------------------------------------------------
-- 7. Dashboard aggregations (SECURITY INVOKER → caller's RLS applies,
--    so each user only ever aggregates their own account's rows).
-- ---------------------------------------------------------------------
create or replace function public.dashboard_message_series(p_days int, p_tz text default 'UTC')
returns table (day date, incoming bigint, outgoing bigint)
language sql
stable
security invoker
set search_path = public, pg_temp
as $$
  with bounds as (
    select ((now() at time zone p_tz)::date - (greatest(p_days, 1) - 1)) as start_day
  ),
  days as (
    select generate_series((select start_day from bounds),
                           (now() at time zone p_tz)::date,
                           interval '1 day')::date as day
  ),
  agg as (
    select (m.created_at at time zone p_tz)::date as day,
           count(*) filter (where m.sender_type = 'customer') as incoming,
           count(*) filter (where m.sender_type <> 'customer') as outgoing
    from public.messages m
    where m.created_at >= ((select start_day from bounds)::timestamp at time zone p_tz)
    group by 1
  )
  select d.day, coalesce(a.incoming, 0), coalesce(a.outgoing, 0)
  from days d left join agg a using (day)
  order by d.day;
$$;

-- First-response samples for the last 14 days: one row per customer
-- message that received a later agent/bot reply (first reply only).
create or replace function public.dashboard_response_samples(p_days int default 14)
returns table (customer_at timestamptz, response_at timestamptz)
language sql
stable
security invoker
set search_path = public, pg_temp
as $$
  with recent as (
    select conversation_id, sender_type, created_at,
           lag(sender_type) over w as prev_sender
    from public.messages
    where created_at >= now() - make_interval(days => greatest(p_days, 1))
    window w as (partition by conversation_id order by created_at)
  ),
  -- Start of each customer "turn" (first customer msg after a non-customer one)
  turns as (
    select conversation_id, created_at as customer_at
    from recent
    where sender_type = 'customer'
      and (prev_sender is null or prev_sender <> 'customer')
  )
  select t.customer_at,
         (select min(r.created_at) from recent r
           where r.conversation_id = t.conversation_id
             and r.sender_type <> 'customer'
             and r.created_at > t.customer_at) as response_at
  from turns t
  where exists (
    select 1 from recent r
    where r.conversation_id = t.conversation_id
      and r.sender_type <> 'customer'
      and r.created_at > t.customer_at
  )
  limit 20000;
$$;

grant execute on function public.dashboard_message_series(int, text) to authenticated;
grant execute on function public.dashboard_response_samples(int) to authenticated;
revoke execute on function public.dashboard_message_series(int, text) from anon;
revoke execute on function public.dashboard_response_samples(int) from anon;
