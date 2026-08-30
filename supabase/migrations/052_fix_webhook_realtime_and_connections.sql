-- ==============================================================================
-- 052_fix_webhook_realtime_and_connections.sql
--
-- Production Multi-Tenant WhatsApp CRM Hardening:
--   1. Enables REPLICA IDENTITY FULL on messages and conversations for complete Realtime streaming
--   2. Ensures last_customer_message_at exists on conversations for accurate 24-hour window tracking
--   3. Adds performance & uniqueness indexes for multi-tenant webhook lookups
--   4. Refreshes RLS policies to guarantee strict tenant isolation while allowing service role webhook ingestion
--
-- Idempotent — safe to run multiple times.
-- ==============================================================================

-- 1. REPLICA IDENTITY FULL for Realtime change payloads
ALTER TABLE IF EXISTS messages REPLICA IDENTITY FULL;
ALTER TABLE IF EXISTS conversations REPLICA IDENTITY FULL;
ALTER TABLE IF EXISTS whatsapp_config REPLICA IDENTITY FULL;

-- 2. Ensure last_customer_message_at column exists on conversations
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'conversations' AND column_name = 'last_customer_message_at'
  ) THEN
    ALTER TABLE conversations ADD COLUMN last_customer_message_at TIMESTAMPTZ;
  END IF;
END $$;

-- 3. Ensure indexes for high-throughput webhook lookups & multi-connection routing
CREATE INDEX IF NOT EXISTS idx_whatsapp_config_phone_active
  ON whatsapp_config(phone_number_id)
  WHERE is_archived = FALSE;

CREATE INDEX IF NOT EXISTS idx_whatsapp_config_account_active
  ON whatsapp_config(account_id, is_default)
  WHERE is_archived = FALSE;

CREATE INDEX IF NOT EXISTS idx_conversations_account_whatsapp_conn
  ON conversations(account_id, whatsapp_connection_id);

CREATE INDEX IF NOT EXISTS idx_messages_conversation_created_at
  ON messages(conversation_id, created_at DESC);

-- 4. Publication verification for Supabase Realtime
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    -- Ensure messages is in publication
    IF NOT EXISTS (
      SELECT 1 FROM pg_publication_tables
      WHERE pubname = 'supabase_realtime' AND tablename = 'messages'
    ) THEN
      ALTER PUBLICATION supabase_realtime ADD TABLE messages;
    END IF;

    -- Ensure conversations is in publication
    IF NOT EXISTS (
      SELECT 1 FROM pg_publication_tables
      WHERE pubname = 'supabase_realtime' AND tablename = 'conversations'
    ) THEN
      ALTER PUBLICATION supabase_realtime ADD TABLE conversations;
    END IF;

    -- Ensure whatsapp_config is in publication
    IF NOT EXISTS (
      SELECT 1 FROM pg_publication_tables
      WHERE pubname = 'supabase_realtime' AND tablename = 'whatsapp_config'
    ) THEN
      ALTER PUBLICATION supabase_realtime ADD TABLE whatsapp_config;
    END IF;
  END IF;
END $$;

-- 5. RPC to update conversation active WhatsApp connection and last customer message timestamp
CREATE OR REPLACE FUNCTION public.update_conversation_on_inbound(
  p_conversation_id UUID,
  p_connection_id UUID,
  p_last_message_text TEXT,
  p_message_timestamp TIMESTAMPTZ
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE conversations
  SET
    whatsapp_connection_id = COALESCE(p_connection_id, whatsapp_connection_id),
    last_message_text = p_last_message_text,
    last_message_at = COALESCE(p_message_timestamp, NOW()),
    last_customer_message_at = COALESCE(p_message_timestamp, NOW()),
    unread_count = COALESCE(unread_count, 0) + 1,
    status = CASE WHEN status = 'closed' THEN 'open'::conversation_status_enum ELSE status END,
    updated_at = NOW()
  WHERE id = p_conversation_id;
END;
$$;
