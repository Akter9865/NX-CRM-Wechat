-- Migration 051: Anti-Ban, Automation Safety Switch & Cooldown Protection

-- 1. Ensure is_automations_paused column on whatsapp_config and accounts
DO $$
BEGIN
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
END $$;
