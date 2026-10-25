-- ============================================================
-- 056_openrouter_and_gemini_ai_providers.sql
--
-- Supports OpenRouter, Gemini, OpenAI, and Anthropic in ai_configs
-- and ai_usage_log.
-- ============================================================

DO $$
BEGIN
  -- 1. Update ai_configs provider check
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

  -- 2. Update ai_usage_log provider check
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
