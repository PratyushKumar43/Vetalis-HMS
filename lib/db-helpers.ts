/**
 * Database Helper Functions
 * 
 * Helper functions for common database operations using Supabase
 */

import { supabase } from "./db";

// ============================================
// User Operations
// ============================================

export async function getUserById(userId: string) {
  const { data, error } = await supabase
    .from("users")
    .select("*")
    .eq("id", userId)
    .single();
  if (error) {
    console.error("getUserById error:", error);
    return null;
  }
  return data;
}

export async function getUserByEmail(email: string) {
  const { data, error } = await supabase
    .from("users")
    .select("*")
    .eq("email", email)
    .single();
  if (error) {
    console.error("getUserByEmail error:", error);
    return null;
  }
  return data;
}

export async function getUsersByRole(role: "admin" | "doctor" | "patient") {
  const { data, error } = await supabase
    .from("users")
    .select("*")
    .eq("role", role)
    .order("created_at", { ascending: false });
  if (error) {
    console.error("getUsersByRole error:", error);
    return [];
  }
  return data || [];
}

// ============================================
// Patient Operations
// ============================================

export async function getPatientById(patientId: string) {
  const { data, error } = await supabase
    .from("patients")
    .select("*, users(*)")
    .eq("id", patientId)
    .single();
  if (error) {
    console.error("getPatientById error:", error);
    return null;
  }
  return data;
}

export async function getPatientsByDoctor(doctorId: string) {
  const { data, error } = await supabase
    .from("patients")
    .select("*, users!inner(name, email, phone, created_at)");
  if (error) {
    console.error("getPatientsByDoctor error:", error);
    return [];
  }
  return (data || []).map((p: any) => ({
    ...p,
    name: p.users?.name,
    email: p.users?.email,
    phone: p.users?.phone,
    created_at: p.users?.created_at,
  }));
}

export async function getAllPatients(limit: number = 100, offset: number = 0) {
  const { data, error } = await supabase
    .from("patients")
    .select("*, users!inner(name, email, phone, created_at, role)")
    .eq("users.role", "patient")
    .range(offset, offset + limit - 1);
  if (error) {
    console.error("getAllPatients error:", error);
    return [];
  }
  return (data || []).map((p: any) => ({
    ...p,
    name: p.users?.name,
    email: p.users?.email,
    phone: p.users?.phone,
    created_at: p.users?.created_at,
    role: p.users?.role,
  }));
}

// ============================================
// Prescription Operations
// ============================================

export async function getPrescriptionsByPatient(patientId: string) {
  const { data, error } = await supabase
    .from("prescriptions")
    .select("*, users!doctor_id(name)")
    .eq("patient_id", patientId)
    .order("created_at", { ascending: false });
  if (error) {
    console.error("getPrescriptionsByPatient error:", error);
    return [];
  }
  return (data || []).map((p: any) => ({
    ...p,
    doctor_name: p.users?.name,
  }));
}

export async function getPrescriptionsByDoctor(doctorId: string) {
  const { data, error } = await supabase
    .from("prescriptions")
    .select("*, users!patient_id(name)")
    .eq("doctor_id", doctorId)
    .order("created_at", { ascending: false });
  if (error) {
    console.error("getPrescriptionsByDoctor error:", error);
    return [];
  }
  return (data || []).map((p: any) => ({
    ...p,
    patient_name: p.users?.name,
  }));
}

// ============================================
// Vitals Operations
// ============================================

export async function getVitalsByPatient(
  patientId: string,
  limit: number = 30
) {
  const { data, error } = await supabase
    .from("vitals")
    .select("*")
    .eq("patient_id", patientId)
    .order("recorded_at", { ascending: false })
    .limit(limit);
  if (error) {
    console.error("getVitalsByPatient error:", error);
    return [];
  }
  return data || [];
}

export async function getLatestVitals(patientId: string) {
  const { data, error } = await supabase
    .from("vitals")
    .select("*")
    .eq("patient_id", patientId)
    .order("recorded_at", { ascending: false })
    .limit(1);
  if (error || !data || data.length === 0) {
    return null;
  }
  return data[0];
}

// ============================================
// Report Operations
// ============================================

export async function getReportsByPatient(patientId: string) {
  const { data, error } = await supabase
    .from("medical_reports")
    .select("*")
    .eq("patient_id", patientId)
    .order("uploaded_at", { ascending: false });
  if (error) {
    console.error("getReportsByPatient error:", error);
    return [];
  }
  return data || [];
}

export async function getReportById(reportId: string) {
  const { data, error } = await supabase
    .from("medical_reports")
    .select("*")
    .eq("id", reportId)
    .single();
  if (error) {
    console.error("getReportById error:", error);
    return null;
  }
  return data;
}

// ============================================
// Doctor Operations
// ============================================

export async function getDoctorById(doctorId: string) {
  const { data, error } = await supabase
    .from("doctors")
    .select("*, users!inner(name, email, phone)")
    .eq("id", doctorId)
    .single();
  if (error) {
    console.error("getDoctorById error:", error);
    return null;
  }
  return {
    ...data,
    name: data.users?.name,
    email: data.users?.email,
    phone: data.users?.phone,
  };
}

export async function getAllDoctors() {
  const { data, error } = await supabase
    .from("doctors")
    .select("*, users!inner(name, email)")
    .eq("verified", true);
  if (error) {
    console.error("getAllDoctors error:", error);
    return [];
  }
  return (data || []).map((d: any) => ({
    ...d,
    name: d.users?.name,
    email: d.users?.email,
  }));
}
