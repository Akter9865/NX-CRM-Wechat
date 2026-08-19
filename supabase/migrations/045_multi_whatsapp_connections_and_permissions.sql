-- ============================================================
-- 045_multi_whatsapp_connections_and_permissions.sql
--
-- Production Multi-Tenant Multi-WhatsApp Architecture:
--   1. Allows multiple WhatsApp connections per account (drops UNIQUE(account_id) on whatsapp_config)
--   2. Adds connection metadata (connection_name, is_default, is_archived, deleted_at, replaced_by, heartbeat timestamps)
--   3. Introduces team_whatsapp_permissions table for granular agent WhatsApp access
--   4. Binds conversations to whatsapp_connection_id
--   5. Introduces audit_logs table for enterprise compliance
--   6. Enforces tenant and permission isolation with RLS policies and helper functions
--
-- Idempotent — safe to run multiple times.
-- ============================================================

-- 1. WHATSAPP_CONFIG UPDATES
-- Drop the single-connection-per-account UNIQUE constraint if it exists
DO $$
BEGIN
  -- Drop constraint if exists
  IF EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'whatsapp_config_account_id_key'
      AND conrelid = 'whatsapp_config'::regclass
  ) THEN
    ALTER TABLE whatsapp_config DROP CONSTRAINT whatsapp_config_account_id_key;
  END IF;

  -- Also drop user_id unique constraint if still present from legacy schemas
  IF EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'whatsapp_config_user_id_key'
      AND conrelid = 'whatsapp_config'::regclass
  ) THEN
    ALTER TABLE whatsapp_config DROP CONSTRAINT whatsapp_config_user_id_key;
  END IF;
EXCEPTION
  WHEN OTHERS THEN NULL;
END $$;

-- Add new columns for multi-connection management
ALTER TABLE whatsapp_config
  ADD COLUMN IF NOT EXISTS connection_name TEXT,
  ADD COLUMN IF NOT EXISTS is_default BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS is_archived BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS replaced_by UUID REFERENCES whatsapp_config(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS last_message_received_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS last_message_sent_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS last_api_check_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS last_error_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS last_error_message TEXT;

-- Backfill default connection name for existing rows
UPDATE whatsapp_config
SET
  connection_name = COALESCE(business_name, 'WhatsApp #' || RIGHT(phone_number_id, 4), 'Primary WhatsApp'),
  is_default = TRUE
WHERE connection_name IS NULL;

-- 2. TEAM_WHATSAPP_PERMISSIONS
CREATE TABLE IF NOT EXISTS team_whatsapp_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  whatsapp_connection_id UUID NOT NULL REFERENCES whatsapp_config(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, whatsapp_connection_id)
);

CREATE INDEX IF NOT EXISTS idx_team_whatsapp_permissions_account
  ON team_whatsapp_permissions(account_id);
CREATE INDEX IF NOT EXISTS idx_team_whatsapp_permissions_user
  ON team_whatsapp_permissions(user_id);
CREATE INDEX IF NOT EXISTS idx_team_whatsapp_permissions_connection
  ON team_whatsapp_permissions(whatsapp_connection_id);

ALTER TABLE team_whatsapp_permissions ENABLE ROW LEVEL SECURITY;

-- 3. CONVERSATIONS BINDING
ALTER TABLE conversations
  ADD COLUMN IF NOT EXISTS whatsapp_connection_id UUID REFERENCES whatsapp_config(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_conversations_whatsapp_connection
  ON conversations(whatsapp_connection_id);

-- Backfill existing conversations to point to the account's existing WhatsApp config
DO $$
BEGIN
  UPDATE conversations c
  SET whatsapp_connection_id = w.id
  FROM whatsapp_config w
  WHERE c.account_id = w.account_id
    AND c.whatsapp_connection_id IS NULL
    AND w.is_archived = FALSE;
EXCEPTION
  WHEN OTHERS THEN NULL;
END $$;

-- 4. AUDIT_LOGS TABLE
CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  actor_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  target_type TEXT NOT NULL,
  target_id TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_account
  ON audit_logs(account_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at
  ON audit_logs(created_at DESC);

ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- 5. RLS POLICIES & HELPER FUNCTIONS
-- Helper: check if a user has access to a specific WhatsApp connection
CREATE OR REPLACE FUNCTION public.can_access_whatsapp_connection(p_connection_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_account_id UUID;
  v_role account_role_enum;
BEGIN
  IF v_user_id IS NULL OR p_connection_id IS NULL THEN
    RETURN FALSE;
  END IF;

  -- Get caller's account_id and role
  SELECT account_id, account_role INTO v_account_id, v_role
  FROM profiles
  WHERE user_id = v_user_id;

  IF v_account_id IS NULL THEN
    RETURN FALSE;
  END IF;

  -- Check that connection belongs to the same account and is not archived
  IF NOT EXISTS (
    SELECT 1 FROM whatsapp_config
    WHERE id = p_connection_id
      AND account_id = v_account_id
      AND is_archived = FALSE
  ) THEN
    RETURN FALSE;
  END IF;

  -- Owner and Admin have access to all connections in their account
  IF v_role IN ('owner', 'admin') THEN
    RETURN TRUE;
  END IF;

  -- Agents & Viewers check explicit assignment in team_whatsapp_permissions
  RETURN EXISTS (
    SELECT 1 FROM team_whatsapp_permissions
    WHERE user_id = v_user_id
      AND whatsapp_connection_id = p_connection_id
  );
END;
$$;

-- RLS for whatsapp_config:
DROP POLICY IF EXISTS "Account members can view non-archived connections" ON whatsapp_config;
CREATE POLICY "Account members can view non-archived connections"
  ON whatsapp_config FOR SELECT
  USING (
    account_id IN (SELECT account_id FROM profiles WHERE user_id = auth.uid())
    AND is_archived = FALSE
  );

DROP POLICY IF EXISTS "Admins can manage whatsapp connections" ON whatsapp_config;
CREATE POLICY "Admins can manage whatsapp connections"
  ON whatsapp_config FOR ALL
  USING (
    account_id IN (
      SELECT account_id FROM profiles
      WHERE user_id = auth.uid()
        AND account_role IN ('owner', 'admin')
    )
  );

-- RLS for team_whatsapp_permissions:
DROP POLICY IF EXISTS "Users can view their team whatsapp permissions" ON team_whatsapp_permissions;
CREATE POLICY "Users can view their team whatsapp permissions"
  ON team_whatsapp_permissions FOR SELECT
  USING (
    account_id IN (SELECT account_id FROM profiles WHERE user_id = auth.uid())
  );

DROP POLICY IF EXISTS "Admins can manage team whatsapp permissions" ON team_whatsapp_permissions;
CREATE POLICY "Admins can manage team whatsapp permissions"
  ON team_whatsapp_permissions FOR ALL
  USING (
    account_id IN (
      SELECT account_id FROM profiles
      WHERE user_id = auth.uid()
        AND account_role IN ('owner', 'admin')
    )
  );

-- RLS for audit_logs:
DROP POLICY IF EXISTS "Admins can view audit logs" ON audit_logs;
CREATE POLICY "Admins can view audit logs"
  ON audit_logs FOR SELECT
  USING (
    account_id IN (
      SELECT account_id FROM profiles
      WHERE user_id = auth.uid()
        AND account_role IN ('owner', 'admin')
    )
  );

DROP POLICY IF EXISTS "Service role and admins can insert audit logs" ON audit_logs;
CREATE POLICY "Service role and admins can insert audit logs"
  ON audit_logs FOR INSERT
  WITH CHECK (
    account_id IN (SELECT account_id FROM profiles WHERE user_id = auth.uid())
  );
