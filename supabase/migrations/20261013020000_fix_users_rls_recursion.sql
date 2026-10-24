-- =========================================================================
-- Fix: Prevent Infinite Recursion on public.users Row Level Security
-- =========================================================================

-- Step 1: Drop all existing recursive / conflicting policies on public.users
DROP POLICY IF EXISTS "Users view own profile" ON public.users;
DROP POLICY IF EXISTS "Doctors view assigned patients basic profile" ON public.users;
DROP POLICY IF EXISTS "Admins manage all users" ON public.users;
DROP POLICY IF EXISTS "Users update own non-sensitive profile" ON public.users;
DROP POLICY IF EXISTS "users_select_authenticated" ON public.users;
DROP POLICY IF EXISTS "users_update_own" ON public.users;
DROP POLICY IF EXISTS "admins_update_users" ON public.users;
DROP POLICY IF EXISTS "admins_delete_users" ON public.users;
DROP POLICY IF EXISTS "admins_insert_users" ON public.users;

-- Step 2: Ensure RLS is active on public.users
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Step 3: Base non-recursive SELECT policy
-- Authenticated users can read directory profiles (name, email, role, status).
-- Using `USING (true)` guarantees that helper functions (like is_admin or is_doctor)
-- that query public.users will evaluate in constant time with ZERO recursive subqueries.
CREATE POLICY "users_select_authenticated"
  ON public.users FOR SELECT TO authenticated
  USING (true);

-- Step 4: Self-update policy
-- Authenticated users can update their own personal information (name, phone).
CREATE POLICY "users_update_own"
  ON public.users FOR UPDATE TO authenticated
  USING ((select auth.uid()) = id)
  WITH CHECK ((select auth.uid()) = id);

-- Step 5: Admin UPDATE policy
-- Administrators can update any user's profile and account activation status.
CREATE POLICY "admins_update_users"
  ON public.users FOR UPDATE TO authenticated
  USING (public.is_admin((select auth.uid())))
  WITH CHECK (public.is_admin((select auth.uid())));

-- Step 6: Admin INSERT policy
-- Administrators can provision users directly.
CREATE POLICY "admins_insert_users"
  ON public.users FOR INSERT TO authenticated
  WITH CHECK (public.is_admin((select auth.uid())));

-- Step 7: Admin DELETE policy
-- Administrators can delete user records.
CREATE POLICY "admins_delete_users"
  ON public.users FOR DELETE TO authenticated
  USING (public.is_admin((select auth.uid())));

-- Step 8: Trigger to enforce role integrity on self-update without recursive subqueries
CREATE OR REPLACE FUNCTION public.check_user_self_update()
RETURNS trigger AS $$
BEGIN
  -- If the caller is not an administrator, preserve their existing role and status
  IF NOT public.is_admin(auth.uid()) THEN
    NEW.role := OLD.role;
    NEW.status := OLD.status;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS trg_prevent_role_escalation ON public.users;
CREATE TRIGGER trg_prevent_role_escalation
  BEFORE UPDATE ON public.users
  FOR EACH ROW
  EXECUTE FUNCTION public.check_user_self_update();
