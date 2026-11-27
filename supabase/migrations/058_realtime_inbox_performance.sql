-- ==============================================================================
-- 058 — Realtime & inbox performance
--
-- Why: the inbox subscribed to *every* row change on `messages` (there was no
-- column to filter on), so Supabase Realtime had to run the messages RLS
-- policy for every subscriber on every insert/status update across all
-- tenants. On top of that, legacy policies from earlier migrations were left
-- in place next to their replacements, so every row check evaluated 2–3
-- equivalent permissive policies. Together that showed up as lag on
-- incoming/outgoing messages.
--
-- What:
--   1. messages.account_id — denormalised from conversations by a trigger so
--      the client can subscribe with `filter: account_id=eq.<id>`.
--   2. Drop legacy duplicate permissive policies (the `*_select` / `*_modify`
--      / `*_insert` / `*_update` / `*_delete` policies grant exactly the same
--      access via is_account_member()).
--   3. Inbox-shaped indexes (conversation list ordering, broadcast reply
--      lookup) and removal of a duplicate index.
--
-- Fully idempotent and backwards compatible: existing code that does not know
-- about messages.account_id keeps working because the trigger fills it in.
-- ==============================================================================

-- 1. messages.account_id ------------------------------------------------------
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS account_id UUID;

CREATE OR REPLACE FUNCTION public.set_message_account_id()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.account_id IS NULL OR (TG_OP = 'UPDATE' AND NEW.conversation_id IS DISTINCT FROM OLD.conversation_id) THEN
    SELECT c.account_id INTO NEW.account_id
    FROM public.conversations c
    WHERE c.id = NEW.conversation_id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_messages_set_account_id ON public.messages;
CREATE TRIGGER trg_messages_set_account_id
  BEFORE INSERT OR UPDATE OF conversation_id ON public.messages
  FOR EACH ROW EXECUTE FUNCTION public.set_message_account_id();

UPDATE public.messages m
SET account_id = c.account_id
FROM public.conversations c
WHERE c.id = m.conversation_id
  AND m.account_id IS DISTINCT FROM c.account_id;

CREATE INDEX IF NOT EXISTS idx_messages_account_created
  ON public.messages (account_id, created_at DESC);

-- 2. Drop legacy duplicate permissive policies --------------------------------
DROP POLICY IF EXISTS "Members can view messages" ON public.messages;
DROP POLICY IF EXISTS "Agents can insert messages" ON public.messages;

DROP POLICY IF EXISTS "Members can view conversations" ON public.conversations;
DROP POLICY IF EXISTS "Agents can update conversations" ON public.conversations;

DROP POLICY IF EXISTS "Members can view contacts" ON public.contacts;
DROP POLICY IF EXISTS "Agents can manage contacts" ON public.contacts;

DROP POLICY IF EXISTS "Members can view broadcasts" ON public.broadcasts;
DROP POLICY IF EXISTS "Agents can manage broadcasts" ON public.broadcasts;

-- whatsapp_config: the legacy policies also re-evaluated auth.uid() per row
-- (auth_rls_initplan). whatsapp_config_{select,insert,update,delete} cover
-- the same access through is_account_member().
DROP POLICY IF EXISTS "Account members can view non-archived connections" ON public.whatsapp_config;
DROP POLICY IF EXISTS "Admins can manage whatsapp connections" ON public.whatsapp_config;

-- Make sure the replacement policies exist (no-ops where they already do).
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='messages' AND policyname='messages_select') THEN
    CREATE POLICY messages_select ON public.messages FOR SELECT
      USING (EXISTS (SELECT 1 FROM public.conversations c WHERE c.id = messages.conversation_id AND public.is_account_member(c.account_id)));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='messages' AND policyname='messages_modify') THEN
    CREATE POLICY messages_modify ON public.messages FOR ALL
      USING (EXISTS (SELECT 1 FROM public.conversations c WHERE c.id = messages.conversation_id AND public.is_account_member(c.account_id, 'agent')))
      WITH CHECK (EXISTS (SELECT 1 FROM public.conversations c WHERE c.id = messages.conversation_id AND public.is_account_member(c.account_id, 'agent')));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='conversations' AND policyname='conversations_select') THEN
    CREATE POLICY conversations_select ON public.conversations FOR SELECT USING (public.is_account_member(account_id));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='conversations' AND policyname='conversations_insert') THEN
    CREATE POLICY conversations_insert ON public.conversations FOR INSERT WITH CHECK (public.is_account_member(account_id, 'agent'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='conversations' AND policyname='conversations_update') THEN
    CREATE POLICY conversations_update ON public.conversations FOR UPDATE USING (public.is_account_member(account_id, 'agent'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='conversations' AND policyname='conversations_delete') THEN
    CREATE POLICY conversations_delete ON public.conversations FOR DELETE USING (public.is_account_member(account_id, 'agent'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='contacts' AND policyname='contacts_select') THEN
    CREATE POLICY contacts_select ON public.contacts FOR SELECT USING (public.is_account_member(account_id));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='contacts' AND policyname='contacts_insert') THEN
    CREATE POLICY contacts_insert ON public.contacts FOR INSERT WITH CHECK (public.is_account_member(account_id, 'agent'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='contacts' AND policyname='contacts_update') THEN
    CREATE POLICY contacts_update ON public.contacts FOR UPDATE USING (public.is_account_member(account_id, 'agent'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='contacts' AND policyname='contacts_delete') THEN
    CREATE POLICY contacts_delete ON public.contacts FOR DELETE USING (public.is_account_member(account_id, 'agent'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='broadcasts' AND policyname='broadcasts_select') THEN
    CREATE POLICY broadcasts_select ON public.broadcasts FOR SELECT USING (public.is_account_member(account_id));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='broadcasts' AND policyname='broadcasts_insert') THEN
    CREATE POLICY broadcasts_insert ON public.broadcasts FOR INSERT WITH CHECK (public.is_account_member(account_id, 'agent'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='broadcasts' AND policyname='broadcasts_update') THEN
    CREATE POLICY broadcasts_update ON public.broadcasts FOR UPDATE USING (public.is_account_member(account_id, 'agent'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='broadcasts' AND policyname='broadcasts_delete') THEN
    CREATE POLICY broadcasts_delete ON public.broadcasts FOR DELETE USING (public.is_account_member(account_id, 'agent'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='whatsapp_config' AND policyname='whatsapp_config_select') THEN
    CREATE POLICY whatsapp_config_select ON public.whatsapp_config FOR SELECT USING (public.is_account_member(account_id));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='whatsapp_config' AND policyname='whatsapp_config_insert') THEN
    CREATE POLICY whatsapp_config_insert ON public.whatsapp_config FOR INSERT WITH CHECK (public.is_account_member(account_id, 'admin'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='whatsapp_config' AND policyname='whatsapp_config_update') THEN
    CREATE POLICY whatsapp_config_update ON public.whatsapp_config FOR UPDATE USING (public.is_account_member(account_id, 'admin'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='whatsapp_config' AND policyname='whatsapp_config_delete') THEN
    CREATE POLICY whatsapp_config_delete ON public.whatsapp_config FOR DELETE USING (public.is_account_member(account_id, 'admin'));
  END IF;
END $$;

-- 3. Indexes -------------------------------------------------------------------
-- Inbox conversation list: WHERE account_id = ? ORDER BY last_message_at DESC
CREATE INDEX IF NOT EXISTS idx_conversations_account_last_message
  ON public.conversations (account_id, last_message_at DESC NULLS LAST);

-- Webhook flagBroadcastReplyIfAny(): WHERE contact_id = ? AND status IN (...)
CREATE INDEX IF NOT EXISTS idx_broadcast_recipients_contact_status
  ON public.broadcast_recipients (contact_id, status, created_at DESC);

-- Exact duplicate of idx_whatsapp_config_account_id.
DROP INDEX IF EXISTS public.idx_whatsapp_config_account;

-- Keep messages in the realtime publication (no-op when already present).
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime')
     AND NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'messages') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
  END IF;
END $$;
