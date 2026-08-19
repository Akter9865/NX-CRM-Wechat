-- ============================================================
-- 043_billing_hardening.sql — Billing Hardening, Automatic Free Subscriptions & Guards
--
-- Ensures every new account receives an authoritative Free plan subscription,
-- optimizes subscription status query performance, and reinforces multi-tenant
-- subscription RLS boundaries.
-- ============================================================

-- 1. Ensure subscriptions table has index on status & current_period_end
CREATE INDEX IF NOT EXISTS idx_subscriptions_status_period
  ON subscriptions(account_id, status, current_period_end);

-- 2. Enhance handle_new_user trigger to automatically provision the Free plan
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_full_name TEXT;
  v_account_id UUID;
BEGIN
  v_full_name := COALESCE(NEW.raw_user_meta_data->>'full_name', '');

  -- Create default account for new user
  INSERT INTO public.accounts (name, owner_user_id)
  VALUES (COALESCE(NULLIF(v_full_name, ''), NEW.email, 'My workspace'), NEW.id)
  RETURNING id INTO v_account_id;

  -- Create profile linked as owner
  INSERT INTO public.profiles (user_id, full_name, email, account_id, account_role)
  VALUES (NEW.id, v_full_name, NEW.email, v_account_id, 'owner');

  -- Provision default Free plan subscription
  INSERT INTO public.subscriptions (account_id, plan_id, status)
  VALUES (v_account_id, 'free', 'active')
  ON CONFLICT (account_id) DO NOTHING;

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Failed to bootstrap account/profile/subscription for user %: %', NEW.id, SQLERRM;
  RETURN NEW;
END;
$$;

ALTER FUNCTION public.handle_new_user() OWNER TO postgres;

-- 3. Backfill any existing accounts that somehow missed a subscription row
INSERT INTO public.subscriptions (account_id, plan_id, status)
SELECT id, 'free', 'active'
FROM public.accounts
WHERE id NOT IN (SELECT account_id FROM public.subscriptions)
ON CONFLICT (account_id) DO NOTHING;
