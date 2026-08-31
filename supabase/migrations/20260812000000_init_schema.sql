-- ============================================
-- Vetalis / MedCore Schema & Seed Data for Supabase
-- ============================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- Users Table
-- ============================================
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email VARCHAR(255) UNIQUE NOT NULL,
  name VARCHAR(255),
  phone VARCHAR(20),
  role VARCHAR(20) NOT NULL DEFAULT 'patient' CHECK (role IN ('admin', 'doctor', 'patient')),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  email_verified BOOLEAN DEFAULT FALSE
);

-- ============================================
-- Doctors Table
-- ============================================
CREATE TABLE IF NOT EXISTS doctors (
  id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  license_number VARCHAR(50) UNIQUE,
  specialization VARCHAR(100),
  clinic_id UUID,
  bio TEXT,
  verified BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW()
);

-- ============================================
-- Patients Table
-- ============================================
CREATE TABLE IF NOT EXISTS patients (
  id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  date_of_birth DATE,
  gender VARCHAR(20) CHECK (gender IN ('male', 'female', 'other')),
  blood_type VARCHAR(10),
  emergency_contact JSONB,
  medical_history JSONB DEFAULT '[]'::jsonb,
  allergies JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- ============================================
-- Clinics Table
-- ============================================
CREATE TABLE IF NOT EXISTS clinics (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  address JSONB,
  phone VARCHAR(20),
  admin_id UUID REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW()
);

-- ============================================
-- Patient Records Table
-- ============================================
CREATE TABLE IF NOT EXISTS patient_records (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  patient_id UUID REFERENCES patients(id) ON DELETE CASCADE,
  doctor_id UUID REFERENCES doctors(id) ON DELETE CASCADE,
  visit_date TIMESTAMP DEFAULT NOW(),
  diagnosis TEXT,
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- ============================================
-- Prescriptions Table
-- ============================================
CREATE TABLE IF NOT EXISTS prescriptions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  patient_id UUID REFERENCES patients(id) ON DELETE CASCADE,
  doctor_id UUID REFERENCES doctors(id) ON DELETE CASCADE,
  medications JSONB NOT NULL DEFAULT '[]'::jsonb,
  ai_generated BOOLEAN DEFAULT FALSE,
  ai_suggestions JSONB,
  status VARCHAR(20) DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'completed', 'cancelled')),
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- ============================================
-- Medical Reports Table
-- ============================================
CREATE TABLE IF NOT EXISTS medical_reports (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  patient_id UUID REFERENCES patients(id) ON DELETE CASCADE,
  doctor_id UUID REFERENCES doctors(id) ON DELETE CASCADE,
  report_type VARCHAR(50) CHECK (report_type IN ('lab', 'imaging', 'pathology', 'other')),
  public_id VARCHAR(255),
  file_url TEXT,
  file_format VARCHAR(10),
  file_size INTEGER,
  extracted_text TEXT,
  ai_analysis JSONB,
  uploaded_at TIMESTAMP DEFAULT NOW()
);

-- ============================================
-- Vitals Table
-- ============================================
CREATE TABLE IF NOT EXISTS vitals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  patient_id UUID REFERENCES patients(id) ON DELETE CASCADE,
  recorded_by UUID REFERENCES users(id),
  heart_rate INTEGER,
  blood_pressure_systolic INTEGER,
  blood_pressure_diastolic INTEGER,
  temperature DECIMAL(4, 1),
  oxygen_saturation DECIMAL(4, 1),
  respiratory_rate INTEGER,
  weight DECIMAL(5, 2),
  notes TEXT,
  recorded_at TIMESTAMP DEFAULT NOW()
);

-- ============================================
-- Chatbot Sessions Table
-- ============================================
CREATE TABLE IF NOT EXISTS chatbot_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  role VARCHAR(20) DEFAULT 'patient',
  messages JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- ============================================
-- Audit Logs Table
-- ============================================
CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id),
  action VARCHAR(100) NOT NULL,
  entity_type VARCHAR(50),
  entity_id UUID,
  details JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);

-- ============================================
-- Notifications Table
-- ============================================
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  type VARCHAR(50) DEFAULT 'info',
  read BOOLEAN DEFAULT FALSE,
  link TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- ============================================
-- Indexes for Performance
-- ============================================
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_patients_user ON patients(id);
CREATE INDEX IF NOT EXISTS idx_doctors_user ON doctors(id);
CREATE INDEX IF NOT EXISTS idx_prescriptions_patient ON prescriptions(patient_id);
CREATE INDEX IF NOT EXISTS idx_prescriptions_doctor ON prescriptions(doctor_id);
CREATE INDEX IF NOT EXISTS idx_medical_reports_patient ON medical_reports(patient_id);
CREATE INDEX IF NOT EXISTS idx_medical_reports_doctor ON medical_reports(doctor_id);
CREATE INDEX IF NOT EXISTS idx_vitals_patient ON vitals(patient_id);
CREATE INDEX IF NOT EXISTS idx_vitals_recorded_at ON vitals(recorded_at);
CREATE INDEX IF NOT EXISTS idx_chatbot_sessions_user ON chatbot_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);

-- ============================================
-- Triggers for updated_at
-- ============================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_users_updated_at ON users;
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- Supabase Auth Auto-Sync Trigger
-- Auto-creates public.users & public.patients on Auth Sign Up
-- ============================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  -- Prevent unique constraint violation if email already exists in public.users (e.g. from pre-seeded data)
  DELETE FROM public.users WHERE email = NEW.email AND id <> NEW.id;

  INSERT INTO public.users (id, email, name, role, email_verified, created_at)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'role', 'patient'),
    (NEW.email_confirmed_at IS NOT NULL),
    NOW()
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    name = COALESCE(EXCLUDED.name, users.name),
    role = COALESCE(users.role, EXCLUDED.role);

  IF (COALESCE(NEW.raw_user_meta_data->>'role', 'patient') = 'patient') THEN
    INSERT INTO public.patients (id, created_at)
    VALUES (NEW.id, NOW())
    ON CONFLICT (id) DO NOTHING;
  ELSIF (NEW.raw_user_meta_data->>'role' = 'doctor') THEN
    INSERT INTO public.doctors (id, created_at)
    VALUES (NEW.id, NOW())
    ON CONFLICT (id) DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT OR UPDATE ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================
-- Seed Data: Admin & Doctors
-- ============================================
INSERT INTO users (id, email, name, phone, role, email_verified, created_at) VALUES
('00000000-0000-0000-0000-000000000001', 'admin@medcore.com', 'Admin User', '+1-555-0100', 'admin', true, NOW()),
('00000000-0000-0000-0000-000000000010', 'dr.smith@medcore.com', 'Dr. John Smith', '+1-555-0101', 'doctor', true, NOW()),
('00000000-0000-0000-0000-000000000011', 'dr.johnson@medcore.com', 'Dr. Sarah Johnson', '+1-555-0102', 'doctor', true, NOW())
ON CONFLICT (email) DO NOTHING;

INSERT INTO doctors (id, license_number, specialization, verified, bio, created_at) VALUES
('00000000-0000-0000-0000-000000000010', 'MD-12345', 'Cardiology', true, 'Board-certified cardiologist', NOW()),
('00000000-0000-0000-0000-000000000011', 'MD-12346', 'Pediatrics', true, 'Pediatrician specializing in child health', NOW())
ON CONFLICT (id) DO NOTHING;

-- ============================================
-- Supabase Storage Bucket & RLS Access Setup
-- ============================================
INSERT INTO storage.buckets (id, name, public)
VALUES ('medical-reports', 'medical-reports', true)
ON CONFLICT (id) DO NOTHING;

-- Disable RLS or create permissive policies
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all for users" ON users;
CREATE POLICY "Allow all for users" ON users FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

ALTER TABLE patients ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all for patients" ON patients;
CREATE POLICY "Allow all for patients" ON patients FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

ALTER TABLE doctors ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all for doctors" ON doctors;
CREATE POLICY "Allow all for doctors" ON doctors FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

ALTER TABLE prescriptions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all for prescriptions" ON prescriptions;
CREATE POLICY "Allow all for prescriptions" ON prescriptions FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

ALTER TABLE vitals ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all for vitals" ON vitals;
CREATE POLICY "Allow all for vitals" ON vitals FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

ALTER TABLE medical_reports ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all for medical_reports" ON medical_reports;
CREATE POLICY "Allow all for medical_reports" ON medical_reports FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

ALTER TABLE chatbot_sessions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all for chatbot_sessions" ON chatbot_sessions;
CREATE POLICY "Allow all for chatbot_sessions" ON chatbot_sessions FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all for notifications" ON notifications;
CREATE POLICY "Allow all for notifications" ON notifications FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
