-- 058_performance_and_hardening.sql
--
-- Performance + security pass driven by the Supabase advisors.
-- Everything here is additive / semantics-preserving:
--   1. Covering indexes for every unindexed foreign key (advisor 0001).
--   2. Hot-path indexes for the inbox list and dashboard charts.
--   3. Drop an exact-duplicate index on whatsapp_config.
--   4. RLS "initplan" fix: wrap auth.uid()/auth.jwt() in a scalar
--      sub-select so Postgres evaluates it once per statement instead of
--      once per row (advisor 0003). Same predicate, same roles.
--   5. Pin search_path on trigger/helper functions (advisor 0011).
--   6. Revoke PostgREST execute on internal SECURITY DEFINER helpers that
--      are only ever called by triggers or the service-role server code.
--      (merge_duplicate_* in particular could be invoked anonymously.)
--   7. Server-side dashboard aggregations so the browser no longer
--      downloads every message of the last 90 days (which was slow AND
--      silently truncated at PostgREST's 1000-row cap).

-- ---------------------------------------------------------------------
-- 1. Foreign-key covering indexes
-- ---------------------------------------------------------------------
do $$
declare
  r record;
  idx_name text;
begin
  for r in
    select c.conrelid::regclass as tbl,
           cls.relname as tbl_name,
           a.attname as col
    from pg_constraint c
    join pg_class cls on cls.oid = c.conrelid
    join pg_namespace n on n.oid = cls.relnamespace
    join pg_attribute a on a.attrelid = c.conrelid and a.attnum = c.conkey[1]
    where c.contype = 'f'
      and n.nspname = 'public'
      and array_length(c.conkey, 1) = 1
      and not exists (
        select 1 from pg_index i
        where i.indrelid = c.conrelid
          and i.indkey[0] = c.conkey[1]
      )
  loop
    idx_name := left(format('idx_%s_%s', r.tbl_name, r.col), 63);
    execute format('create index if not exists %I on %s (%I)', idx_name, r.tbl, r.col);
  end loop;
end $$;

-- ---------------------------------------------------------------------
-- 2. Hot-path indexes
-- ---------------------------------------------------------------------
-- Inbox conversation list: WHERE account_id = ? ORDER BY last_message_at DESC
create index if not exists idx_conversations_account_last_message
  on public.conversations (account_id, last_message_at desc nulls last);

-- Dashboard series / response-time windows: WHERE created_at >= ?
create index if not exists idx_messages_created_at
  on public.messages (created_at);

-- Some deployed databases carry a `messages.wamid` column that predates
-- the tracked migrations; index it only where it exists.
do $$
begin
  if exists (select 1 from information_schema.columns
             where table_schema = 'public' and table_name = 'messages' and column_name = 'wamid') then
    execute 'create index if not exists idx_messages_wamid on public.messages (wamid) where wamid is not null';
  end if;
end $$;

-- ---------------------------------------------------------------------
-- 3. Duplicate index
-- ---------------------------------------------------------------------
drop index if exists public.idx_whatsapp_config_account_id;

-- ---------------------------------------------------------------------
-- 4. RLS initplan (identical predicates, evaluated once per query)
-- ---------------------------------------------------------------------
-- Each ALTER runs only if that policy exists, so the migration also
-- applies cleanly to databases that never received the hand-applied
-- policies (fresh installs / CI).
create or replace function pg_temp.alter_policy_if_exists(p_table text, p_policy text, p_sql text)
returns void language plpgsql as $f$
begin
  if exists (select 1 from pg_policies where schemaname = 'public' and tablename = p_table and policyname = p_policy) then
    execute p_sql;
  end if;
end $f$;

select pg_temp.alter_policy_if_exists('notifications', 'notifications_select', $q$alter policy notifications_select on public.notifications
  using ((select auth.uid()) = user_id)$q$);
select pg_temp.alter_policy_if_exists('notifications', 'notifications_update', $q$alter policy notifications_update on public.notifications
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id)$q$);
select pg_temp.alter_policy_if_exists('profiles', 'Users can update own profile', $q$alter policy "Users can update own profile" on public.profiles
  using ((select auth.uid()) = user_id)$q$);
select pg_temp.alter_policy_if_exists('profiles', 'profiles_insert', $q$alter policy profiles_insert on public.profiles
  with check ((select auth.uid()) = user_id)$q$);
select pg_temp.alter_policy_if_exists('profiles', 'profiles_select', $q$alter policy profiles_select on public.profiles
  using (((select auth.uid()) = user_id) or is_account_member(account_id))$q$);
select pg_temp.alter_policy_if_exists('profiles', 'profiles_update', $q$alter policy profiles_update on public.profiles
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id)$q$);
select pg_temp.alter_policy_if_exists('audit_logs', 'Admins can view audit logs', $q$alter policy "Admins can view audit logs" on public.audit_logs
  using (account_id in (
    select p.account_id from public.profiles p
    where p.user_id = (select auth.uid())
      and p.account_role = any (array['owner'::account_role_enum, 'admin'::account_role_enum])))$q$);
select pg_temp.alter_policy_if_exists('audit_logs', 'Service role and admins can insert audit logs', $q$alter policy "Service role and admins can insert audit logs" on public.audit_logs
  with check (account_id in (
    select p.account_id from public.profiles p where p.user_id = (select auth.uid())))$q$);
select pg_temp.alter_policy_if_exists('channel_connections', 'Account members can view channel connections', $q$alter policy "Account members can view channel connections" on public.channel_connections
  using ((account_id in (
    select p.account_id from public.profiles p where p.user_id = (select auth.uid())))
    and is_archived = false)$q$);
select pg_temp.alter_policy_if_exists('channel_connections', 'Admins can manage channel connections', $q$alter policy "Admins can manage channel connections" on public.channel_connections
  using (account_id in (
    select p.account_id from public.profiles p
    where p.user_id = (select auth.uid())
      and p.account_role = any (array['owner'::account_role_enum, 'admin'::account_role_enum])))$q$);
select pg_temp.alter_policy_if_exists('contact_inquiries', 'Allow service role full access on contact_inquiries', $q$alter policy "Allow service role full access on contact_inquiries" on public.contact_inquiries
  using (((select auth.jwt()) ->> 'role') = 'service_role')$q$);
select pg_temp.alter_policy_if_exists('team_whatsapp_permissions', 'Admins can manage team whatsapp permissions', $q$alter policy "Admins can manage team whatsapp permissions" on public.team_whatsapp_permissions
  using (account_id in (
    select p.account_id from public.profiles p
    where p.user_id = (select auth.uid())
      and p.account_role = any (array['owner'::account_role_enum, 'admin'::account_role_enum])))$q$);
select pg_temp.alter_policy_if_exists('team_whatsapp_permissions', 'Users can view their team whatsapp permissions', $q$alter policy "Users can view their team whatsapp permissions" on public.team_whatsapp_permissions
  using (account_id in (
    select p.account_id from public.profiles p where p.user_id = (select auth.uid())))$q$);
select pg_temp.alter_policy_if_exists('whatsapp_config', 'Account members can view non-archived connections', $q$alter policy "Account members can view non-archived connections" on public.whatsapp_config
  using ((account_id in (
    select p.account_id from public.profiles p where p.user_id = (select auth.uid())))
    and is_archived = false)$q$);
select pg_temp.alter_policy_if_exists('whatsapp_config', 'Admins can manage whatsapp connections', $q$alter policy "Admins can manage whatsapp connections" on public.whatsapp_config
  using (account_id in (
    select p.account_id from public.profiles p
    where p.user_id = (select auth.uid())
      and p.account_role = any (array['owner'::account_role_enum, 'admin'::account_role_enum])))$q$);

-- ---------------------------------------------------------------------
-- 5. search_path hardening
-- ---------------------------------------------------------------------
do $$
declare fn record;
begin
  for fn in
    select p.oid::regprocedure as sig
    from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname in (
        'update_updated_at_column', '_bcast_cols_for_status', 'handle_new_user',
        'update_ai_configs_updated_at', 'update_ai_knowledge_documents_updated_at',
        'update_account_integrations_updated_at')
  loop
    execute format('alter function %s set search_path = public, pg_temp', fn.sig);
  end loop;
end $$;

-- ---------------------------------------------------------------------
-- 6. Internal SECURITY DEFINER helpers: not callable through the API.
--    (Triggers still fire; service-role server code is unaffected.)
-- ---------------------------------------------------------------------
do $$
declare fn record;
begin
  for fn in
    select p.oid::regprocedure as sig
    from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname in (
        'merge_duplicate_contacts', 'merge_duplicate_conversations', 'rls_auto_enable',
        'recompute_broadcast_counts', '_bcast_bump', 'update_conversation_on_inbound',
        'record_webhook_failure', 'claim_ai_reply_slot', 'handle_new_user',
        'notify_conversation_assigned', 'broadcast_recipient_aggregate_trigger')
  loop
    execute format('revoke execute on function %s from public, anon, authenticated', fn.sig);
    execute format('grant execute on function %s to service_role', fn.sig);
  end loop;
end $$;

-- ---------------------------------------------------------------------
-- 7. Dashboard aggregations (SECURITY INVOKER → caller's RLS applies,
--    so each user only ever aggregates their own account's rows).
-- ---------------------------------------------------------------------
create or replace function public.dashboard_message_series(p_days int, p_tz text default 'UTC')
returns table (day date, incoming bigint, outgoing bigint)
language sql
stable
security invoker
set search_path = public, pg_temp
as $$
  with bounds as (
    select ((now() at time zone p_tz)::date - (greatest(p_days, 1) - 1)) as start_day
  ),
  days as (
    select generate_series((select start_day from bounds),
                           (now() at time zone p_tz)::date,
                           interval '1 day')::date as day
  ),
  agg as (
    select (m.created_at at time zone p_tz)::date as day,
           count(*) filter (where m.sender_type = 'customer') as incoming,
           count(*) filter (where m.sender_type <> 'customer') as outgoing
    from public.messages m
    where m.created_at >= ((select start_day from bounds)::timestamp at time zone p_tz)
    group by 1
  )
  select d.day, coalesce(a.incoming, 0), coalesce(a.outgoing, 0)
  from days d left join agg a using (day)
  order by d.day;
$$;

-- First-response samples for the last 14 days: one row per customer
-- message that received a later agent/bot reply (first reply only).
create or replace function public.dashboard_response_samples(p_days int default 14)
returns table (customer_at timestamptz, response_at timestamptz)
language sql
stable
security invoker
set search_path = public, pg_temp
as $$
  with recent as (
    select conversation_id, sender_type, created_at,
           lag(sender_type) over w as prev_sender
    from public.messages
    where created_at >= now() - make_interval(days => greatest(p_days, 1))
    window w as (partition by conversation_id order by created_at)
  ),
  -- Start of each customer "turn" (first customer msg after a non-customer one)
  turns as (
    select conversation_id, created_at as customer_at
    from recent
    where sender_type = 'customer'
      and (prev_sender is null or prev_sender <> 'customer')
  )
  select t.customer_at,
         (select min(r.created_at) from recent r
           where r.conversation_id = t.conversation_id
             and r.sender_type <> 'customer'
             and r.created_at > t.customer_at) as response_at
  from turns t
  where exists (
    select 1 from recent r
    where r.conversation_id = t.conversation_id
      and r.sender_type <> 'customer'
      and r.created_at > t.customer_at
  )
  limit 20000;
$$;

grant execute on function public.dashboard_message_series(int, text) to authenticated;
grant execute on function public.dashboard_response_samples(int) to authenticated;
revoke execute on function public.dashboard_message_series(int, text) from anon;
revoke execute on function public.dashboard_response_samples(int) from anon;
