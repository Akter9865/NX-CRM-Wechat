-- ============================================================
-- 040: Add Google Gemini support to ai_configs provider check
-- ============================================================

DO $$
BEGIN
  ALTER TABLE ai_configs DROP CONSTRAINT IF EXISTS ai_configs_provider_check;
  ALTER TABLE ai_configs ADD CONSTRAINT ai_configs_provider_check CHECK (provider IN ('openai', 'anthropic', 'gemini'));
EXCEPTION
  WHEN undefined_table THEN NULL;
END $$;
