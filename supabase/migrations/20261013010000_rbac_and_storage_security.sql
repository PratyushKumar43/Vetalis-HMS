-- ============================================================
-- Migration: 20261013010000_rbac_and_storage_security.sql
-- Description: Enforce PostgreSQL RLS, doctor-patient assignments,
--              account activation state, private storage, and secure
--              role provisioning without client self-escalation.
-- ============================================================

-- 1. Ensure user status column exists
ALTER TABLE public.users 
  ADD COLUMN IF NOT EXISTS status VARCHAR(20) NOT NULL DEFAULT 'active';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'users_status_check'
  ) THEN
    ALTER TABLE public.users 
      ADD CONSTRAINT users_status_check CHECK (status IN ('active', 'deactivated', 'suspended'));
  END IF;
END $$;

-- 2. Doctor-Patient Assignments table
CREATE TABLE IF NOT EXISTS public.doctor_patient_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  doctor_id UUID NOT NULL REFERENCES public.doctors(id) ON DELETE CASCADE,
  patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  assigned_by UUID REFERENCES public.users(id),
  assigned_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (doctor_id, patient_id)
);

CREATE INDEX IF NOT EXISTS idx_dpa_doctor_id ON public.doctor_patient_assignments(doctor_id);
CREATE INDEX IF NOT EXISTS idx_dpa_patient_id ON public.doctor_patient_assignments(patient_id);

-- 3. Pre-authorized roles table for administrative provisioning
CREATE TABLE IF NOT EXISTS public.preauthorized_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  role VARCHAR(20) NOT NULL CHECK (role IN ('admin', 'doctor', 'patient')),
  created_by UUID REFERENCES public.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  claimed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_preauthorized_email ON public.preauthorized_roles(email);

-- 4. Seed initial doctor-patient assignments based on existing records
INSERT INTO public.doctor_patient_assignments (doctor_id, patient_id, assigned_at)
VALUES
  ('00000000-0000-0000-0000-000000000010', '00000000-0000-0000-0000-000000000100', NOW()),
  ('00000000-0000-0000-0000-000000000010', '00000000-0000-0000-0000-000000000104', NOW()),
  ('00000000-0000-0000-0000-000000000011', '00000000-0000-0000-0000-000000000101', NOW()),
  ('00000000-0000-0000-0000-000000000012', '00000000-0000-0000-0000-000000000102', NOW()),
  ('00000000-0000-0000-0000-000000000012', '00000000-0000-0000-0000-000000000103', NOW())
ON CONFLICT (doctor_id, patient_id) DO NOTHING;

-- 5. Helper authorization functions (SECURITY DEFINER with fixed search_path)
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

CREATE OR REPLACE FUNCTION public.is_doctor_assigned(doc_id uuid, pat_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.doctor_patient_assignments
    WHERE doctor_id = doc_id AND patient_id = pat_id
  );
$$;

REVOKE ALL ON FUNCTION public.is_admin(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_admin(uuid) TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.is_doctor(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_doctor(uuid) TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.is_patient(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_patient(uuid) TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.is_doctor_assigned(uuid, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_doctor_assigned(uuid, uuid) TO authenticated, service_role;

-- 6. Replace handle_new_user trigger function:
-- Enforces that public sign-up defaults strictly to 'patient' unless an admin pre-authorized the email.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
DECLARE
  assigned_role VARCHAR(20) := 'patient';
  user_full_name VARCHAR(255);
BEGIN
  -- Check for pre-authorized role created by admin
  SELECT role INTO assigned_role
  FROM public.preauthorized_roles
  WHERE email = LOWER(NEW.email) AND claimed_at IS NULL
  LIMIT 1;

  IF assigned_role IS NULL THEN
    assigned_role := 'patient';
  ELSE
    UPDATE public.preauthorized_roles
    SET claimed_at = NOW()
    WHERE email = LOWER(NEW.email);
  END IF;

  user_full_name := COALESCE(
    NEW.raw_user_meta_data->>'name',
    split_part(NEW.email, '@', 1)
  );

  INSERT INTO public.users (id, email, name, role, status, email_verified, created_at, updated_at)
  VALUES (
    NEW.id,
    NEW.email,
    user_full_name,
    assigned_role,
    'active',
    (NEW.email_confirmed_at IS NOT NULL),
    NOW(),
    NOW()
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    name = COALESCE(EXCLUDED.name, users.name),
    updated_at = NOW();

  IF assigned_role = 'patient' THEN
    INSERT INTO public.patients (id, created_at, updated_at)
    VALUES (NEW.id, NOW(), NOW())
    ON CONFLICT (id) DO NOTHING;
  ELSIF assigned_role = 'doctor' THEN
    INSERT INTO public.doctors (id, verified, created_at)
    VALUES (NEW.id, false, NOW())
    ON CONFLICT (id) DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 7. Secure Storage: Ensure bucket is private & configure storage policies
INSERT INTO storage.buckets (id, name, public)
VALUES ('medical-reports', 'medical-reports', false)
ON CONFLICT (id) DO UPDATE SET public = false;

DROP POLICY IF EXISTS "Allow all for storage medical-reports" ON storage.objects;
DROP POLICY IF EXISTS "Public access to medical reports" ON storage.objects;
DROP POLICY IF EXISTS "Patients download own medical report files" ON storage.objects;
DROP POLICY IF EXISTS "Doctors download assigned patient medical report files" ON storage.objects;
DROP POLICY IF EXISTS "Admins download medical report files" ON storage.objects;
DROP POLICY IF EXISTS "Doctors and admins upload medical report files" ON storage.objects;
DROP POLICY IF EXISTS "Admins delete medical report files" ON storage.objects;

CREATE POLICY "Patients download own medical report files"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'medical-reports'
    AND (storage.foldername(name))[1] = (select auth.uid())::text
  );

CREATE POLICY "Doctors download assigned patient medical report files"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'medical-reports'
    AND public.is_doctor((select auth.uid()))
    AND public.is_doctor_assigned((select auth.uid()), (storage.foldername(name))[1]::uuid)
  );

CREATE POLICY "Admins download medical report files"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'medical-reports'
    AND public.is_admin((select auth.uid()))
  );

CREATE POLICY "Doctors and admins upload medical report files"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'medical-reports'
    AND (
      public.is_admin((select auth.uid()))
      OR (
        public.is_doctor((select auth.uid()))
        AND public.is_doctor_assigned((select auth.uid()), (storage.foldername(name))[1]::uuid)
      )
    )
  );

CREATE POLICY "Admins delete medical report files"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'medical-reports'
    AND public.is_admin((select auth.uid()))
  );

-- 8. Remove ALL permissive policies from database tables
DROP POLICY IF EXISTS "Allow all for users" ON public.users;
DROP POLICY IF EXISTS "Allow all for patients" ON public.patients;
DROP POLICY IF EXISTS "Allow all for doctors" ON public.doctors;
DROP POLICY IF EXISTS "Allow all for prescriptions" ON public.prescriptions;
DROP POLICY IF EXISTS "Allow all for vitals" ON public.vitals;
DROP POLICY IF EXISTS "Allow all for medical_reports" ON public.medical_reports;
DROP POLICY IF EXISTS "Allow all for chatbot_sessions" ON public.chatbot_sessions;
DROP POLICY IF EXISTS "Allow all for notifications" ON public.notifications;
DROP POLICY IF EXISTS "Allow all for patient_records" ON public.patient_records;

-- ============================================================
-- 9. Table Row Level Security Policies
-- ============================================================

-- --- USERS TABLE ---
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users view own profile" ON public.users;
DROP POLICY IF EXISTS "Doctors view assigned patients basic profile" ON public.users;
DROP POLICY IF EXISTS "Admins manage all users" ON public.users;
DROP POLICY IF EXISTS "Users update own non-sensitive profile" ON public.users;
DROP POLICY IF EXISTS "users_select_authenticated" ON public.users;
DROP POLICY IF EXISTS "users_update_own" ON public.users;
DROP POLICY IF EXISTS "admins_update_users" ON public.users;
DROP POLICY IF EXISTS "admins_delete_users" ON public.users;
DROP POLICY IF EXISTS "admins_insert_users" ON public.users;

-- 1. Base non-recursive SELECT policy:
-- Authenticated users can read user directory records.
-- Using `USING (true)` eliminates recursive subqueries when is_admin/is_doctor executes.
CREATE POLICY "users_select_authenticated"
  ON public.users FOR SELECT TO authenticated
  USING (true);

-- 2. Self-update policy:
CREATE POLICY "users_update_own"
  ON public.users FOR UPDATE TO authenticated
  USING ((select auth.uid()) = id)
  WITH CHECK ((select auth.uid()) = id);

-- 3. Admin UPDATE policy:
CREATE POLICY "admins_update_users"
  ON public.users FOR UPDATE TO authenticated
  USING (public.is_admin((select auth.uid())))
  WITH CHECK (public.is_admin((select auth.uid())));

-- 4. Admin INSERT policy:
CREATE POLICY "admins_insert_users"
  ON public.users FOR INSERT TO authenticated
  WITH CHECK (public.is_admin((select auth.uid())));

-- 5. Admin DELETE policy:
CREATE POLICY "admins_delete_users"
  ON public.users FOR DELETE TO authenticated
  USING (public.is_admin((select auth.uid())));

-- 6. Enforce role integrity via trigger rather than recursive RLS checks
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

-- --- DOCTORS TABLE ---
ALTER TABLE public.doctors ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated users view doctors" ON public.doctors;
CREATE POLICY "Authenticated users view doctors"
  ON public.doctors FOR SELECT TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Doctors update own profile" ON public.doctors;
CREATE POLICY "Doctors update own profile"
  ON public.doctors FOR UPDATE TO authenticated
  USING ((select auth.uid()) = id)
  WITH CHECK ((select auth.uid()) = id);

DROP POLICY IF EXISTS "Admins manage doctors" ON public.doctors;
CREATE POLICY "Admins manage doctors"
  ON public.doctors FOR ALL TO authenticated
  USING (public.is_admin((select auth.uid())))
  WITH CHECK (public.is_admin((select auth.uid())));

-- --- PATIENTS TABLE ---
ALTER TABLE public.patients ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Patients view own record" ON public.patients;
CREATE POLICY "Patients view own record"
  ON public.patients FOR SELECT TO authenticated
  USING ((select auth.uid()) = id);

DROP POLICY IF EXISTS "Doctors view assigned patients" ON public.patients;
CREATE POLICY "Doctors view assigned patients"
  ON public.patients FOR SELECT TO authenticated
  USING (
    public.is_doctor((select auth.uid()))
    AND public.is_doctor_assigned((select auth.uid()), id)
  );

DROP POLICY IF EXISTS "Patients update own record" ON public.patients;
CREATE POLICY "Patients update own record"
  ON public.patients FOR UPDATE TO authenticated
  USING ((select auth.uid()) = id)
  WITH CHECK ((select auth.uid()) = id);

DROP POLICY IF EXISTS "Admins manage patients" ON public.patients;
CREATE POLICY "Admins manage patients"
  ON public.patients FOR ALL TO authenticated
  USING (public.is_admin((select auth.uid())))
  WITH CHECK (public.is_admin((select auth.uid())));

-- --- DOCTOR_PATIENT_ASSIGNMENTS TABLE ---
ALTER TABLE public.doctor_patient_assignments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Doctors view own assignments" ON public.doctor_patient_assignments;
CREATE POLICY "Doctors view own assignments"
  ON public.doctor_patient_assignments FOR SELECT TO authenticated
  USING (doctor_id = (select auth.uid()));

DROP POLICY IF EXISTS "Patients view own assignments" ON public.doctor_patient_assignments;
CREATE POLICY "Patients view own assignments"
  ON public.doctor_patient_assignments FOR SELECT TO authenticated
  USING (patient_id = (select auth.uid()));

DROP POLICY IF EXISTS "Admins manage doctor patient assignments" ON public.doctor_patient_assignments;
CREATE POLICY "Admins manage doctor patient assignments"
  ON public.doctor_patient_assignments FOR ALL TO authenticated
  USING (public.is_admin((select auth.uid())))
  WITH CHECK (public.is_admin((select auth.uid())));

-- --- PREAUTHORIZED_ROLES TABLE ---
ALTER TABLE public.preauthorized_roles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins manage preauthorized roles" ON public.preauthorized_roles;
CREATE POLICY "Admins manage preauthorized roles"
  ON public.preauthorized_roles FOR ALL TO authenticated
  USING (public.is_admin((select auth.uid())))
  WITH CHECK (public.is_admin((select auth.uid())));

-- --- PATIENT_RECORDS TABLE ---
ALTER TABLE public.patient_records ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Patients view own clinical records" ON public.patient_records;
CREATE POLICY "Patients view own clinical records"
  ON public.patient_records FOR SELECT TO authenticated
  USING (patient_id = (select auth.uid()));

DROP POLICY IF EXISTS "Doctors view assigned patient clinical records" ON public.patient_records;
CREATE POLICY "Doctors view assigned patient clinical records"
  ON public.patient_records FOR SELECT TO authenticated
  USING (
    public.is_doctor((select auth.uid()))
    AND public.is_doctor_assigned((select auth.uid()), patient_id)
  );

DROP POLICY IF EXISTS "Doctors create records for assigned patients" ON public.patient_records;
CREATE POLICY "Doctors create records for assigned patients"
  ON public.patient_records FOR INSERT TO authenticated
  WITH CHECK (
    public.is_doctor((select auth.uid()))
    AND public.is_doctor_assigned((select auth.uid()), patient_id)
    AND doctor_id = (select auth.uid())
  );

DROP POLICY IF EXISTS "Admins manage patient records" ON public.patient_records;
CREATE POLICY "Admins manage patient records"
  ON public.patient_records FOR ALL TO authenticated
  USING (public.is_admin((select auth.uid())))
  WITH CHECK (public.is_admin((select auth.uid())));

-- --- PRESCRIPTIONS TABLE ---
ALTER TABLE public.prescriptions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Patients view own prescriptions" ON public.prescriptions;
CREATE POLICY "Patients view own prescriptions"
  ON public.prescriptions FOR SELECT TO authenticated
  USING (patient_id = (select auth.uid()));

DROP POLICY IF EXISTS "Doctors view assigned patient prescriptions" ON public.prescriptions;
CREATE POLICY "Doctors view assigned patient prescriptions"
  ON public.prescriptions FOR SELECT TO authenticated
  USING (
    public.is_doctor((select auth.uid()))
    AND public.is_doctor_assigned((select auth.uid()), patient_id)
  );

DROP POLICY IF EXISTS "Doctors create prescriptions for assigned patients" ON public.prescriptions;
CREATE POLICY "Doctors create prescriptions for assigned patients"
  ON public.prescriptions FOR INSERT TO authenticated
  WITH CHECK (
    public.is_doctor((select auth.uid()))
    AND public.is_doctor_assigned((select auth.uid()), patient_id)
    AND doctor_id = (select auth.uid())
  );

DROP POLICY IF EXISTS "Doctors update own prescriptions for assigned patients" ON public.prescriptions;
CREATE POLICY "Doctors update own prescriptions for assigned patients"
  ON public.prescriptions FOR UPDATE TO authenticated
  USING (
    doctor_id = (select auth.uid())
    AND public.is_doctor_assigned((select auth.uid()), patient_id)
  )
  WITH CHECK (
    doctor_id = (select auth.uid())
    AND public.is_doctor_assigned((select auth.uid()), patient_id)
  );

DROP POLICY IF EXISTS "Admins manage prescriptions" ON public.prescriptions;
CREATE POLICY "Admins manage prescriptions"
  ON public.prescriptions FOR ALL TO authenticated
  USING (public.is_admin((select auth.uid())))
  WITH CHECK (public.is_admin((select auth.uid())));

-- --- MEDICAL_REPORTS TABLE ---
ALTER TABLE public.medical_reports ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Patients view own reports" ON public.medical_reports;
CREATE POLICY "Patients view own reports"
  ON public.medical_reports FOR SELECT TO authenticated
  USING (patient_id = (select auth.uid()));

DROP POLICY IF EXISTS "Doctors view assigned patient reports" ON public.medical_reports;
CREATE POLICY "Doctors view assigned patient reports"
  ON public.medical_reports FOR SELECT TO authenticated
  USING (
    public.is_doctor((select auth.uid()))
    AND public.is_doctor_assigned((select auth.uid()), patient_id)
  );

DROP POLICY IF EXISTS "Doctors insert reports for assigned patients" ON public.medical_reports;
CREATE POLICY "Doctors insert reports for assigned patients"
  ON public.medical_reports FOR INSERT TO authenticated
  WITH CHECK (
    public.is_doctor((select auth.uid()))
    AND public.is_doctor_assigned((select auth.uid()), patient_id)
  );

DROP POLICY IF EXISTS "Admins manage medical reports" ON public.medical_reports;
CREATE POLICY "Admins manage medical reports"
  ON public.medical_reports FOR ALL TO authenticated
  USING (public.is_admin((select auth.uid())))
  WITH CHECK (public.is_admin((select auth.uid())));

-- --- VITALS TABLE ---
ALTER TABLE public.vitals ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Patients view own vitals" ON public.vitals;
CREATE POLICY "Patients view own vitals"
  ON public.vitals FOR SELECT TO authenticated
  USING (patient_id = (select auth.uid()));

DROP POLICY IF EXISTS "Doctors view assigned patient vitals" ON public.vitals;
CREATE POLICY "Doctors view assigned patient vitals"
  ON public.vitals FOR SELECT TO authenticated
  USING (
    public.is_doctor((select auth.uid()))
    AND public.is_doctor_assigned((select auth.uid()), patient_id)
  );

DROP POLICY IF EXISTS "Doctors record vitals for assigned patients" ON public.vitals;
CREATE POLICY "Doctors record vitals for assigned patients"
  ON public.vitals FOR INSERT TO authenticated
  WITH CHECK (
    public.is_doctor((select auth.uid()))
    AND public.is_doctor_assigned((select auth.uid()), patient_id)
  );

DROP POLICY IF EXISTS "Admins manage vitals" ON public.vitals;
CREATE POLICY "Admins manage vitals"
  ON public.vitals FOR ALL TO authenticated
  USING (public.is_admin((select auth.uid())))
  WITH CHECK (public.is_admin((select auth.uid())));

-- --- NOTIFICATIONS TABLE ---
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage own notifications" ON public.notifications;
CREATE POLICY "Users manage own notifications"
  ON public.notifications FOR ALL TO authenticated
  USING (user_id = (select auth.uid()))
  WITH CHECK (user_id = (select auth.uid()));

-- --- CHATBOT_SESSIONS TABLE ---
ALTER TABLE public.chatbot_sessions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage own chatbot sessions" ON public.chatbot_sessions;
CREATE POLICY "Users manage own chatbot sessions"
  ON public.chatbot_sessions FOR ALL TO authenticated
  USING (user_id = (select auth.uid()))
  WITH CHECK (user_id = (select auth.uid()));
