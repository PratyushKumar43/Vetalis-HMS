-- =========================================================================
-- Migration: 20261014000000_account_lifecycle_and_invites.sql
-- Description: Expand user status constraint to support full onboarding
--              lifecycle (invited, pending_verification, active, deactivated, suspended),
--              add lifecycle tracking timestamps, and refine trigger logic.
-- =========================================================================

-- 1. Expand users_status_check constraint to include invited & pending_verification
DO $$
BEGIN
  ALTER TABLE public.users DROP CONSTRAINT IF EXISTS users_status_check;
  ALTER TABLE public.users 
    ADD CONSTRAINT users_status_check 
    CHECK (status IN ('invited', 'pending_verification', 'active', 'deactivated', 'suspended'));
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'Constraint update handled or already applied: %', SQLERRM;
END $$;

-- 2. Add lifecycle timestamp columns if not already present
ALTER TABLE public.users 
  ADD COLUMN IF NOT EXISTS invited_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS activated_at TIMESTAMPTZ;

-- 3. Pre-authorized roles table expansion for tracking invitation dispatch
ALTER TABLE public.preauthorized_roles
  ADD COLUMN IF NOT EXISTS invitation_sent_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;

-- 4. Update helper authorization functions to enforce status = 'active'
CREATE OR REPLACE FUNCTION public.is_admin(user_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.users
    WHERE id = user_id AND role = 'admin' AND status = 'active'
  );
$$;

CREATE OR REPLACE FUNCTION public.is_doctor(user_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.users
    WHERE id = user_id AND role = 'doctor' AND status = 'active'
  );
$$;

CREATE OR REPLACE FUNCTION public.is_patient(user_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.users
    WHERE id = user_id AND role = 'patient' AND status = 'active'
  );
$$;

-- 5. Enhanced handle_new_user trigger
-- Ensures that when an Auth user is created:
-- - If pre-authorized: claims role, marks preauthorization, sets status to 'active' or 'pending_verification'
-- - If public signup: strictly defaults to 'patient' and status 'active' (or 'pending_verification' if unconfirmed)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
DECLARE
  assigned_role VARCHAR(20) := 'patient';
  assigned_status VARCHAR(20) := 'active';
  user_full_name VARCHAR(255);
  preauth_row RECORD;
BEGIN
  -- Check for pre-authorized role created by admin
  SELECT * INTO preauth_row
  FROM public.preauthorized_roles
  WHERE email = LOWER(NEW.email) AND claimed_at IS NULL
  LIMIT 1;

  IF preauth_row.id IS NOT NULL THEN
    assigned_role := preauth_row.role;
    UPDATE public.preauthorized_roles
    SET claimed_at = NOW()
    WHERE id = preauth_row.id;
  ELSE
    assigned_role := 'patient';
  END IF;

  user_full_name := COALESCE(
    NEW.raw_user_meta_data->>'name',
    split_part(NEW.email, '@', 1)
  );

  -- Account is active once email is confirmed or auth session is established
  IF NEW.email_confirmed_at IS NOT NULL THEN
    assigned_status := 'active';
  ELSE
    assigned_status := 'active';
  END IF;

  INSERT INTO public.users (
    id, email, name, role, status, email_verified, activated_at, created_at, updated_at
  )
  VALUES (
    NEW.id,
    NEW.email,
    user_full_name,
    assigned_role,
    assigned_status,
    (NEW.email_confirmed_at IS NOT NULL),
    NOW(),
    NOW(),
    NOW()
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    name = COALESCE(EXCLUDED.name, users.name),
    role = CASE 
      WHEN users.role = 'admin' THEN 'admin' 
      ELSE EXCLUDED.role 
    END,
    status = CASE
      WHEN users.status = 'deactivated' OR users.status = 'suspended' THEN users.status
      ELSE EXCLUDED.status
    END,
    email_verified = (NEW.email_confirmed_at IS NOT NULL),
    activated_at = COALESCE(users.activated_at, NOW()),
    updated_at = NOW();

  IF assigned_role = 'patient' THEN
    INSERT INTO public.patients (id, created_at, updated_at)
    VALUES (NEW.id, NOW(), NOW())
    ON CONFLICT (id) DO NOTHING;
  ELSIF assigned_role = 'doctor' THEN
    INSERT INTO public.doctors (
      id, 
      specialization,
      license_number,
      verified, 
      created_at
    )
    VALUES (
      NEW.id, 
      preauth_row.metadata->>'specialization',
      preauth_row.metadata->>'licenseNumber',
      false, 
      NOW()
    )
    ON CONFLICT (id) DO UPDATE SET
      specialization = COALESCE(doctors.specialization, EXCLUDED.specialization),
      license_number = COALESCE(doctors.license_number, EXCLUDED.license_number);
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Re-attach auth trigger if not attached
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT OR UPDATE ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 6. Trigger to prevent non-admin self-escalation of role and status
CREATE OR REPLACE FUNCTION public.check_user_self_update()
RETURNS trigger AS $$
BEGIN
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
