-- ==============================================================================
-- 059 — Security & RLS hardening (Supabase advisor findings)
--
-- 1. Internal SECURITY DEFINER functions were executable by `anon` and
--    `authenticated` through /rest/v1/rpc/*. The ones below are only ever
--    called by the server with the service-role key (webhook, broadcast
--    counters, AI slot claim, webhook delivery) or are trigger functions, so
--    public EXECUTE is revoked. Trigger functions keep firing: EXECUTE is
--    checked when a trigger is created, not when it fires.
-- 2. Account-management RPCs that check auth.uid() internally stay callable
--    by signed-in users but not by anonymous callers. peek_invitation stays
--    public (the invite landing page calls it before sign-in), as do
--    is_account_member / can_access_whatsapp_connection (used inside RLS).
-- 3. Pin search_path on functions flagged as role-mutable.
-- 4. RLS policies that called auth.uid() per row now use (select auth.uid()),
--    which Postgres evaluates once per statement.
-- 5. Drop exact-duplicate permissive policies. Legacy policies that grant
--    MORE than their replacement (e.g. agents managing tags/templates/
--    pipelines) are intentionally kept so no one loses access.
-- 6. Cover every unindexed foreign key in public with an index.
-- Idempotent.
-- ==============================================================================

-- 1 & 2. Function EXECUTE grants ----------------------------------------------
DO $$
DECLARE
  fn record;
  service_only text[] := ARRAY[
    'update_conversation_on_inbound', 'bump_conversation_on_inbound',
    '_bcast_bump', 'recompute_broadcast_counts',
    'merge_duplicate_contacts', 'merge_duplicate_conversations',
    'record_webhook_failure', 'claim_ai_reply_slot', 'rls_auto_enable',
    'set_message_account_id', 'handle_new_user',
    'broadcast_recipient_aggregate_trigger', 'notify_conversation_assigned'
  ];
  signed_in_only text[] := ARRAY[
    'redeem_invitation', 'remove_account_member', 'set_member_role',
    'transfer_account_ownership', 'touch_presence'
  ];
BEGIN
  FOR fn IN
    SELECT p.oid::regprocedure AS sig, p.proname
    FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND (p.proname = ANY (service_only) OR p.proname = ANY (signed_in_only))
  LOOP
    EXECUTE format('REVOKE EXECUTE ON FUNCTION %s FROM PUBLIC, anon', fn.sig);
    EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO service_role', fn.sig);
    IF fn.proname = ANY (service_only) THEN
      EXECUTE format('REVOKE EXECUTE ON FUNCTION %s FROM authenticated', fn.sig);
    ELSE
      EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO authenticated', fn.sig);
    END IF;
  END LOOP;
END $$;

-- 3. search_path -----------------------------------------------------------------
DO $$
DECLARE fn record;
BEGIN
  FOR fn IN
    SELECT p.oid::regprocedure AS sig
    FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname IN (
        'update_updated_at_column', '_bcast_cols_for_status', 'handle_new_user',
        'update_ai_configs_updated_at', 'update_ai_knowledge_documents_updated_at',
        'update_account_integrations_updated_at'
      )
  LOOP
    EXECUTE format('ALTER FUNCTION %s SET search_path = public', fn.sig);
  END LOOP;
END $$;

-- 4. auth.uid() evaluated once per statement --------------------------------------
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='profiles' AND policyname='profiles_select') THEN
    ALTER POLICY profiles_select ON public.profiles
      USING (((select auth.uid()) = user_id) OR public.is_account_member(account_id));
  END IF;
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='profiles' AND policyname='profiles_insert') THEN
    ALTER POLICY profiles_insert ON public.profiles
      WITH CHECK ((select auth.uid()) = user_id);
  END IF;
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='profiles' AND policyname='profiles_update') THEN
    ALTER POLICY profiles_update ON public.profiles
      USING ((select auth.uid()) = user_id) WITH CHECK ((select auth.uid()) = user_id);
  END IF;
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='notifications' AND policyname='notifications_select') THEN
    ALTER POLICY notifications_select ON public.notifications
      USING ((select auth.uid()) = user_id);
  END IF;
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='notifications' AND policyname='notifications_update') THEN
    ALTER POLICY notifications_update ON public.notifications
      USING ((select auth.uid()) = user_id) WITH CHECK ((select auth.uid()) = user_id);
  END IF;
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='audit_logs' AND policyname='Admins can view audit logs') THEN
    ALTER POLICY "Admins can view audit logs" ON public.audit_logs
      USING (account_id IN (SELECT p.account_id FROM public.profiles p
             WHERE p.user_id = (select auth.uid())
               AND p.account_role = ANY (ARRAY['owner'::account_role_enum, 'admin'::account_role_enum])));
  END IF;
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='audit_logs' AND policyname='Service role and admins can insert audit logs') THEN
    ALTER POLICY "Service role and admins can insert audit logs" ON public.audit_logs
      WITH CHECK (account_id IN (SELECT p.account_id FROM public.profiles p
                  WHERE p.user_id = (select auth.uid())));
  END IF;
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='channel_connections' AND policyname='Account members can view channel connections') THEN
    ALTER POLICY "Account members can view channel connections" ON public.channel_connections
      USING ((account_id IN (SELECT p.account_id FROM public.profiles p
              WHERE p.user_id = (select auth.uid()))) AND is_archived = false);
  END IF;
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='channel_connections' AND policyname='Admins can manage channel connections') THEN
    ALTER POLICY "Admins can manage channel connections" ON public.channel_connections
      USING (account_id IN (SELECT p.account_id FROM public.profiles p
             WHERE p.user_id = (select auth.uid())
               AND p.account_role = ANY (ARRAY['owner'::account_role_enum, 'admin'::account_role_enum])));
  END IF;
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='team_whatsapp_permissions' AND policyname='Admins can manage team whatsapp permissions') THEN
    ALTER POLICY "Admins can manage team whatsapp permissions" ON public.team_whatsapp_permissions
      USING (account_id IN (SELECT p.account_id FROM public.profiles p
             WHERE p.user_id = (select auth.uid())
               AND p.account_role = ANY (ARRAY['owner'::account_role_enum, 'admin'::account_role_enum])));
  END IF;
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='team_whatsapp_permissions' AND policyname='Users can view their team whatsapp permissions') THEN
    ALTER POLICY "Users can view their team whatsapp permissions" ON public.team_whatsapp_permissions
      USING (account_id IN (SELECT p.account_id FROM public.profiles p
             WHERE p.user_id = (select auth.uid())));
  END IF;
END $$;

-- 5. Exact-duplicate permissive policies ---------------------------------------
-- (each one below is identical to, or a strict subset of, a policy that stays)
DROP POLICY IF EXISTS "Account members can view their account" ON public.accounts;
DROP POLICY IF EXISTS "Account owners can update account" ON public.accounts;
DROP POLICY IF EXISTS "Members can view ai configs" ON public.ai_configs;
DROP POLICY IF EXISTS "Admins can manage ai configs" ON public.ai_configs;
DROP POLICY IF EXISTS "Members can view automations" ON public.automations;
DROP POLICY IF EXISTS "Agents can manage automations" ON public.automations;
DROP POLICY IF EXISTS "Allow service role full access on contact_inquiries" ON public.contact_inquiries;
DROP POLICY IF EXISTS "Feature flags are readable by authenticated users" ON public.feature_flags;
DROP POLICY IF EXISTS "Members can view message templates" ON public.message_templates;
DROP POLICY IF EXISTS "Members can view transactions" ON public.payment_transactions;
DROP POLICY IF EXISTS "Members can view pipelines" ON public.pipelines;
DROP POLICY IF EXISTS "Users can view profiles in their account" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admins can update subscription" ON public.subscriptions;
DROP POLICY IF EXISTS "Members can view their account subscription" ON public.subscriptions;
DROP POLICY IF EXISTS "Members can view tags" ON public.tags;

-- 6. Index every unindexed foreign key -------------------------------------------
DO $$
DECLARE
  fk record;
  idx_name text;
BEGIN
  FOR fk IN
    SELECT c.conrelid::regclass AS tbl,
           cl.relname AS tbl_name,
           c.conname,
           string_agg(quote_ident(a.attname), ', ' ORDER BY k.ord) AS cols
    FROM pg_constraint c
    JOIN pg_class cl ON cl.oid = c.conrelid
    JOIN pg_namespace n ON n.oid = cl.relnamespace
    CROSS JOIN LATERAL unnest(c.conkey) WITH ORDINALITY AS k(attnum, ord)
    JOIN pg_attribute a ON a.attrelid = c.conrelid AND a.attnum = k.attnum
    WHERE c.contype = 'f' AND n.nspname = 'public'
      AND NOT EXISTS (
        SELECT 1 FROM pg_index i
        WHERE i.indrelid = c.conrelid
          AND (i.indkey::int2[])[0:array_length(c.conkey, 1) - 1] = c.conkey
      )
    GROUP BY c.conrelid, cl.relname, c.conname
  LOOP
    -- Hash suffix keeps names unique when long table/constraint names would
    -- otherwise truncate to the same 63-character identifier.
    idx_name := left('idx_fk_' || fk.tbl_name || '_' || fk.conname, 54)
                || '_' || left(md5(fk.conname), 8);
    EXECUTE format('CREATE INDEX IF NOT EXISTS %I ON %s (%s)', idx_name, fk.tbl, fk.cols);
  END LOOP;
END $$;
