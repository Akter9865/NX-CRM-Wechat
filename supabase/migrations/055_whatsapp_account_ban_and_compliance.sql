-- ============================================================
-- 055_whatsapp_account_ban_and_compliance.sql
--
-- Anti-Ban, Quality Monitoring & Account Compliance Enhancements:
--   - Widens whatsapp_config status check constraint to support:
--     'connected', 'disconnected', 'error', 'banned', 'restricted', 'flagged', 'connecting'
--   - Adds messaging_limit_tier, ban_reason, ban_date columns if not present
--   - Idempotent and safe to run multiple times.
-- ============================================================

DO $$
BEGIN
  -- Add new metadata columns if absent
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'whatsapp_config' AND column_name = 'messaging_limit_tier'
  ) THEN
    ALTER TABLE whatsapp_config ADD COLUMN messaging_limit_tier TEXT;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'whatsapp_config' AND column_name = 'ban_reason'
  ) THEN
    ALTER TABLE whatsapp_config ADD COLUMN ban_reason TEXT;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'whatsapp_config' AND column_name = 'ban_date'
  ) THEN
    ALTER TABLE whatsapp_config ADD COLUMN ban_date TIMESTAMPTZ;
  END IF;

  -- Ensure is_automations_paused column exists for master toggle
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'whatsapp_config' AND column_name = 'is_automations_paused'
  ) THEN
    ALTER TABLE whatsapp_config ADD COLUMN is_automations_paused BOOLEAN NOT NULL DEFAULT FALSE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'accounts' AND column_name = 'is_automations_paused'
  ) THEN
    ALTER TABLE accounts ADD COLUMN is_automations_paused BOOLEAN NOT NULL DEFAULT FALSE;
  END IF;

  -- Update status check constraint
  IF EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'whatsapp_config_status_check'
      AND conrelid = 'whatsapp_config'::regclass
  ) THEN
    ALTER TABLE whatsapp_config DROP CONSTRAINT whatsapp_config_status_check;
  END IF;

  ALTER TABLE whatsapp_config
    ADD CONSTRAINT whatsapp_config_status_check
    CHECK (status IN ('connected', 'disconnected', 'error', 'banned', 'restricted', 'flagged', 'connecting', 'deactivated', 'replaced'));

  -- Support openrouter, gemini, openai, anthropic in ai_configs and ai_usage_log
  IF EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'ai_configs_provider_check'
      AND conrelid = 'ai_configs'::regclass
  ) THEN
    ALTER TABLE ai_configs DROP CONSTRAINT ai_configs_provider_check;
  END IF;

  ALTER TABLE ai_configs
    ADD CONSTRAINT ai_configs_provider_check
    CHECK (provider IN ('openai', 'anthropic', 'gemini', 'openrouter'));

  IF EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'ai_usage_log_provider_check'
      AND conrelid = 'ai_usage_log'::regclass
  ) THEN
    ALTER TABLE ai_usage_log DROP CONSTRAINT ai_usage_log_provider_check;
  END IF;

  ALTER TABLE ai_usage_log
    ADD CONSTRAINT ai_usage_log_provider_check
    CHECK (provider IN ('openai', 'anthropic', 'gemini', 'openrouter'));

EXCEPTION
  WHEN OTHERS THEN
    NULL;
END $$;
