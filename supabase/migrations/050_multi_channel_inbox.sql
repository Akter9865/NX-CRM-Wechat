-- ============================================================
-- 050_multi_channel_inbox.sql
--
-- Multi-Channel Architecture (WhatsApp API, WhatsApp Web QR, Telegram):
--   1. Creates channel_connections table for managing multiple channels
--   2. Adds channel_type and channel_connection_id to conversations
--   3. Adds channel metadata to messages
--   4. Configures RLS policies and indexes
--
-- Idempotent — safe to run multiple times.
-- ============================================================

-- 1. Create channel_type_enum if not exists
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'channel_type_enum') THEN
    CREATE TYPE channel_type_enum AS ENUM (
      'whatsapp_cloud',
      'whatsapp_web',
      'telegram',
      'wechat',
      'custom'
    );
  END IF;
END $$;

-- 2. Create channel_connections table
CREATE TABLE IF NOT EXISTS channel_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  channel_type channel_type_enum NOT NULL DEFAULT 'whatsapp_cloud',
  connection_name TEXT NOT NULL,
  identifier TEXT, -- Phone Number, Bot Username, etc.
  status TEXT NOT NULL DEFAULT 'disconnected' CHECK (status IN ('connected', 'connecting', 'disconnected', 'error', 'pairing')),
  is_default BOOLEAN DEFAULT FALSE,
  is_archived BOOLEAN DEFAULT FALSE,
  credentials JSONB DEFAULT '{}'::jsonb, -- Bot token, access token, session secrets
  metadata JSONB DEFAULT '{}'::jsonb, -- Battery level, device name, bot info, webhook url
  last_activity_at TIMESTAMPTZ,
  last_error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_channel_connections_account
  ON channel_connections(account_id);
CREATE INDEX IF NOT EXISTS idx_channel_connections_type
  ON channel_connections(channel_type);
CREATE INDEX IF NOT EXISTS idx_channel_connections_status
  ON channel_connections(status);

ALTER TABLE channel_connections ENABLE ROW LEVEL SECURITY;

-- RLS policies for channel_connections
DROP POLICY IF EXISTS "Account members can view channel connections" ON channel_connections;
CREATE POLICY "Account members can view channel connections"
  ON channel_connections FOR SELECT
  USING (
    account_id IN (SELECT account_id FROM profiles WHERE user_id = auth.uid())
    AND is_archived = FALSE
  );

DROP POLICY IF EXISTS "Admins can manage channel connections" ON channel_connections;
CREATE POLICY "Admins can manage channel connections"
  ON channel_connections FOR ALL
  USING (
    account_id IN (
      SELECT account_id FROM profiles
      WHERE user_id = auth.uid()
        AND account_role IN ('owner', 'admin')
    )
  );

-- 3. Add channel columns to conversations
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'conversations' AND column_name = 'channel_type'
  ) THEN
    ALTER TABLE conversations ADD COLUMN channel_type TEXT DEFAULT 'whatsapp_cloud';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'conversations' AND column_name = 'channel_connection_id'
  ) THEN
    ALTER TABLE conversations ADD COLUMN channel_connection_id UUID REFERENCES channel_connections(id) ON DELETE SET NULL;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_conversations_channel_type
  ON conversations(channel_type);
CREATE INDEX IF NOT EXISTS idx_conversations_channel_connection
  ON conversations(channel_connection_id);

-- 4. Add channel_type to messages for audit / origin tracking
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'messages' AND column_name = 'channel_type'
  ) THEN
    ALTER TABLE messages ADD COLUMN channel_type TEXT;
  END IF;
END $$;
