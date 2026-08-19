-- ============================================================
-- 044_whatsapp_multiclient_connections.sql
--
-- Multi-client WhatsApp connection enhancements:
--   - Stores Business Portfolio ID, Meta App ID, and encrypted App Secret
--   - Caches WhatsApp display phone number, verified business name, and quality rating
--   - Tracks live webhook heartbeat (`last_webhook_at`)
--   - Updates status check constraint to support connected, disconnected, error, banned
--
-- Idempotent — safe to run multiple times.
-- ============================================================

-- Add new columns to whatsapp_config if they don't already exist
ALTER TABLE whatsapp_config
  ADD COLUMN IF NOT EXISTS business_portfolio_id TEXT,
  ADD COLUMN IF NOT EXISTS app_id TEXT,
  ADD COLUMN IF NOT EXISTS app_secret TEXT,
  ADD COLUMN IF NOT EXISTS display_phone_number TEXT,
  ADD COLUMN IF NOT EXISTS business_name TEXT,
  ADD COLUMN IF NOT EXISTS quality_rating TEXT,
  ADD COLUMN IF NOT EXISTS code_verification_status TEXT,
  ADD COLUMN IF NOT EXISTS last_webhook_at TIMESTAMPTZ;

-- Update status constraint to support 'connected', 'disconnected', 'error', 'banned'
DO $$
BEGIN
  -- Drop existing status check constraint if it exists
  IF EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'whatsapp_config_status_check'
      AND conrelid = 'whatsapp_config'::regclass
  ) THEN
    ALTER TABLE whatsapp_config DROP CONSTRAINT whatsapp_config_status_check;
  END IF;

  -- Add updated check constraint
  ALTER TABLE whatsapp_config
    ADD CONSTRAINT whatsapp_config_status_check
    CHECK (status IN ('connected', 'disconnected', 'error', 'banned'));
EXCEPTION
  WHEN OTHERS THEN
    -- In case of concurrent execution or already altered
    NULL;
END $$;

-- Index for fast lookup by phone_number_id (already unique, but ensure index exists)
CREATE INDEX IF NOT EXISTS idx_whatsapp_config_phone_number_id
  ON whatsapp_config(phone_number_id);

-- Index for fast lookup by account_id
CREATE INDEX IF NOT EXISTS idx_whatsapp_config_account_id
  ON whatsapp_config(account_id);
