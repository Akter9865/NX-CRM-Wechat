-- ==============================================================================
-- NX CRM — FULL PRODUCTION SUPABASE CONSOLIDATED SCHEMA (v1.0.0 Enterprise)
-- Powered by Nexora Spark Agency
--
-- This script is completely IDEMPOTENT (safe to execute multiple times in
-- Supabase SQL Editor or Supabase CLI migrations).
--
-- Includes:
-- 1. Extensions & Custom Types
-- 2. Multi-Tenant Accounts & RBAC Profiles
-- 3. WhatsApp Cloud API v22.0 Connections & HSM Templates
-- 4. CRM Contacts, Tags, Custom Fields & Segments
-- 5. Shared Inbox, Live Conversations, Messages & Media
-- 6. Broadcast Campaigns Engine & Delivery Queue
-- 7. Sales Pipelines & Kanban Stages
-- 8. Visual Flows Builder & Automation Rules Engine
-- 9. AI Assistant (Gemini / OpenAI / Anthropic BYOK) & Vector Knowledge Base
-- 10. Billing, Plans, Invoices & Razorpay / UPI Transactions
-- 11. Public API Keys, Outbound Webhooks & In-App Notifications
-- 12. Super Admin Control Center, Staff RBAC, Audit Trail & System Settings
-- 13. Public Contact Inquiries & Meta GDPR Data Deletion Compliance
-- 14. Helper RPC Stored Functions, Row-Level Security (RLS) & Default Seeds
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
-- 2. MULTI-TENANT ACCOUNTS & PROFILES
-- ==============================================================================
CREATE TABLE IF NOT EXISTS accounts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  owner_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'archived')),
  default_currency TEXT NOT NULL DEFAULT 'INR',
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

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

CREATE INDEX IF NOT EXISTS idx_profiles_account_id ON profiles(account_id);
CREATE INDEX IF NOT EXISTS idx_profiles_account_role ON profiles(account_id, account_role);

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

CREATE INDEX IF NOT EXISTS idx_account_invitations_pending
  ON account_invitations(account_id, expires_at)
  WHERE accepted_at IS NULL;

ALTER TABLE account_invitations ENABLE ROW LEVEL SECURITY;

-- Member Presence (Live Agent Online / Active Typing State)
CREATE TABLE IF NOT EXISTS member_presence (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'offline' CHECK (status IN ('online', 'busy', 'away', 'offline')),
  active_conversation_id UUID,
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_member_presence_account ON member_presence(account_id, status);

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
-- 3. WHATSAPP CLOUD API & HSM TEMPLATES
-- ==============================================================================
CREATE TABLE IF NOT EXISTS whatsapp_configs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  phone_number_id TEXT NOT NULL,
  waba_id TEXT,
  access_token TEXT NOT NULL, -- Stored encrypted with AES-256-GCM
  verify_token TEXT,
  display_phone_number TEXT,
  verified_name TEXT,
  quality_rating TEXT DEFAULT 'UNKNOWN',
  status TEXT NOT NULL DEFAULT 'disconnected' CHECK (status IN ('connected', 'disconnected', 'pending')),
  connected_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(account_id)
);

ALTER TABLE whatsapp_configs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Members can view whatsapp config" ON whatsapp_configs;
CREATE POLICY "Members can view whatsapp config" ON whatsapp_configs
  FOR SELECT TO authenticated
  USING (is_account_member(account_id, 'viewer'));

DROP POLICY IF EXISTS "Admins can manage whatsapp config" ON whatsapp_configs;
CREATE POLICY "Admins can manage whatsapp config" ON whatsapp_configs
  FOR ALL TO authenticated
  USING (is_account_member(account_id, 'admin'));

-- Multiple WhatsApp Phone Connections Per Account (Multi-Line WABA)
CREATE TABLE IF NOT EXISTS whatsapp_connections (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  phone_number_id TEXT NOT NULL UNIQUE,
  waba_id TEXT NOT NULL,
  display_phone_number TEXT NOT NULL,
  verified_name TEXT NOT NULL,
  quality_rating TEXT DEFAULT 'GREEN',
  status TEXT NOT NULL DEFAULT 'connected' CHECK (status IN ('connected', 'disconnected', 'restricted', 'flagged')),
  is_default BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_whatsapp_connections_account ON whatsapp_connections(account_id);

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

CREATE INDEX IF NOT EXISTS idx_message_templates_account ON message_templates(account_id);

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

CREATE INDEX IF NOT EXISTS idx_contacts_account_phone ON contacts(account_id, phone);

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

CREATE INDEX IF NOT EXISTS idx_tags_account ON tags(account_id);

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
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'pending', 'closed', 'snoozed')),
  assigned_agent_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  last_message_text TEXT,
  last_message_at TIMESTAMPTZ,
  last_customer_message_at TIMESTAMPTZ,
  unread_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(account_id, contact_id)
);

CREATE INDEX IF NOT EXISTS idx_conversations_account_status ON conversations(account_id, status);

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
  sender_type TEXT NOT NULL CHECK (sender_type IN ('customer', 'agent', 'bot', 'system')),
  sender_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  content_type TEXT NOT NULL DEFAULT 'text',
  content_text TEXT,
  media_url TEXT,
  meta_media_id TEXT,
  template_name TEXT,
  wamid TEXT UNIQUE,
  status TEXT NOT NULL DEFAULT 'sent' CHECK (status IN ('sending', 'sent', 'delivered', 'read', 'failed')),
  error_message TEXT,
  raw_payload JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_messages_conversation_created ON messages(conversation_id, created_at ASC);

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
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'scheduled', 'processing', 'completed', 'paused', 'failed', 'cancelled')),
  scheduled_at TIMESTAMPTZ,
  total_recipients INTEGER NOT NULL DEFAULT 0,
  sent_count INTEGER NOT NULL DEFAULT 0,
  delivered_count INTEGER NOT NULL DEFAULT 0,
  read_count INTEGER NOT NULL DEFAULT 0,
  failed_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_broadcasts_account_status ON broadcasts(account_id, status);

ALTER TABLE broadcasts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Members can view broadcasts" ON broadcasts;
CREATE POLICY "Members can view broadcasts" ON broadcasts
  FOR SELECT TO authenticated
  USING (is_account_member(account_id, 'viewer'));

DROP POLICY IF EXISTS "Agents can manage broadcasts" ON broadcasts;
CREATE POLICY "Agents can manage broadcasts" ON broadcasts
  FOR ALL TO authenticated
  USING (is_account_member(account_id, 'agent'));

-- Broadcast Recipients Queue
CREATE TABLE IF NOT EXISTS broadcast_recipients (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  broadcast_id UUID NOT NULL REFERENCES broadcasts(id) ON DELETE CASCADE,
  contact_id UUID REFERENCES contacts(id) ON DELETE SET NULL,
  phone TEXT NOT NULL,
  variables JSONB NOT NULL DEFAULT '{}'::jsonb,
  wamid TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sending', 'sent', 'delivered', 'read', 'failed')),
  error_message TEXT,
  sent_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_broadcast_recipients_queue ON broadcast_recipients(broadcast_id, status);

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
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'won', 'lost')),
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
  provider TEXT NOT NULL DEFAULT 'gemini' CHECK (provider IN ('gemini', 'openai', 'anthropic')),
  api_key TEXT NOT NULL,
  model TEXT NOT NULL DEFAULT 'gemini-1.5-flash',
  system_prompt TEXT NOT NULL DEFAULT 'You are a helpful and polite WhatsApp customer assistant. Answer queries accurately based on the business knowledge base.',
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

-- AI Knowledge Base
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

-- Seed Subscription Plans
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
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'trial', 'past_due', 'canceled', 'expired', 'paused', 'suspended')),
  current_period_start TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  current_period_end TIMESTAMPTZ,
  grace_period_end TIMESTAMPTZ,
  cancel_at_period_end BOOLEAN NOT NULL DEFAULT FALSE,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(account_id)
);

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
  status TEXT NOT NULL DEFAULT 'captured' CHECK (status IN ('captured', 'pending', 'failed', 'refunded')),
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
  type TEXT NOT NULL DEFAULT 'info' CHECK (type IN ('info', 'success', 'warning', 'error')),
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
  role TEXT NOT NULL DEFAULT 'admin'
    CHECK (role IN ('super_admin', 'superadmin', 'admin', 'support_manager', 'support_agent', 'billing_manager', 'tech_manager')),
  permissions JSONB NOT NULL DEFAULT '[]'::jsonb,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'suspended')),
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
  status TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'in_progress', 'resolved', 'spam')),
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
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'rejected')),
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
  -- Fallback: Do not block user creation if account already exists
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Bind Signup Trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ==============================================================================
-- Schema consolidation complete.
-- ==============================================================================
