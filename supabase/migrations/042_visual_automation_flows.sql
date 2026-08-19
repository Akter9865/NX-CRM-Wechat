-- ============================================================
-- 042_visual_automation_flows.sql — Visual Automation Flows & Execution Runs
--
-- Adds canvas graph storage, draft/published versioning,
-- visual node execution runs, and step-level history tracking.
-- ============================================================

-- ============================================================
-- 1. EXTEND AUTOMATIONS FOR VISUAL BUILDER
-- ============================================================
ALTER TABLE automations
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'draft'
  CHECK (status IN ('draft', 'published', 'paused', 'archived'));

ALTER TABLE automations
  ADD COLUMN IF NOT EXISTS canvas_data JSONB NOT NULL DEFAULT '{"nodes":[],"edges":[]}'::jsonb;

ALTER TABLE automations
  ADD COLUMN IF NOT EXISTS published_version JSONB DEFAULT NULL;

-- Backfill status based on is_active
UPDATE automations
SET status = CASE WHEN is_active THEN 'published' ELSE 'draft' END
WHERE status = 'draft' AND is_active = TRUE;

-- ============================================================
-- 2. AUTOMATION RUNS (Execution State Machine)
-- ============================================================
CREATE TABLE IF NOT EXISTS automation_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  automation_id UUID NOT NULL REFERENCES automations(id) ON DELETE CASCADE,
  contact_id UUID REFERENCES contacts(id) ON DELETE SET NULL,
  conversation_id UUID REFERENCES conversations(id) ON DELETE SET NULL,
  trigger_event TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'running'
    CHECK (status IN ('running', 'completed', 'failed', 'cancelled', 'waiting')),
  steps_executed JSONB NOT NULL DEFAULT '[]'::jsonb,
  error_message TEXT,
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_automation_runs_automation ON automation_runs(automation_id, started_at DESC);
CREATE INDEX IF NOT EXISTS idx_automation_runs_account ON automation_runs(account_id, started_at DESC);
CREATE INDEX IF NOT EXISTS idx_automation_runs_contact ON automation_runs(contact_id);

ALTER TABLE automation_runs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Members can view automation runs" ON automation_runs;
CREATE POLICY "Members can view automation runs" ON automation_runs
  FOR SELECT TO authenticated
  USING (is_account_member(account_id, 'viewer'));

DROP POLICY IF EXISTS "Agents can manage automation runs" ON automation_runs;
CREATE POLICY "Agents can manage automation runs" ON automation_runs
  FOR ALL TO authenticated
  USING (is_account_member(account_id, 'agent'));

-- ============================================================
-- 3. AUTOMATION RUN STEPS (Step-by-step Audit)
-- ============================================================
CREATE TABLE IF NOT EXISTS automation_run_steps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id UUID NOT NULL REFERENCES automation_runs(id) ON DELETE CASCADE,
  node_id TEXT NOT NULL,
  node_type TEXT NOT NULL,
  node_title TEXT,
  status TEXT NOT NULL DEFAULT 'completed'
    CHECK (status IN ('running', 'completed', 'failed', 'skipped', 'waiting')),
  input_data JSONB,
  output_data JSONB,
  error_message TEXT,
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_automation_run_steps_run ON automation_run_steps(run_id, started_at ASC);

ALTER TABLE automation_run_steps ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Members can view run steps" ON automation_run_steps;
CREATE POLICY "Members can view run steps" ON automation_run_steps
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM automation_runs r
      WHERE r.id = automation_run_steps.run_id
        AND is_account_member(r.account_id, 'viewer')
    )
  );
