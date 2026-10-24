/**
 * API Route: Get Patient by ID
 * 
 * GET /api/patients/[id]
 * 
 * Returns detailed patient information
 */

import { NextRequest, NextResponse } from "next/server";
import { getUser } from "@/lib/supabase-auth-server";
import { cookies } from "next/headers";
import { createClient } from "@/utils/supabase/server";

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (user.status !== "active") {
      return NextResponse.json({ error: "Account deactivated" }, { status: 403 });
    }

    const cookieStore = await cookies();
    const supabase = createClient(cookieStore);

    const userRole = user.role;
    const patientId = params.id;

    if (patientId === "new") {
      return NextResponse.json(
        { error: "Invalid patient ID" },
        { status: 400 }
      );
    }

    // Role-based authorization
    if (userRole === "patient" && user.id !== patientId) {
      return NextResponse.json(
        { error: "Forbidden: You cannot access other patients' records." },
        { status: 403 }
      );
    }

    if (userRole === "doctor") {
      const { data: assignment } = await supabase
        .from("doctor_patient_assignments")
        .select("id")
        .eq("doctor_id", user.id)
        .eq("patient_id", patientId)
        .maybeSingle();

      if (!assignment) {
        return NextResponse.json(
          { error: "Forbidden: You are not assigned to this patient." },
          { status: 403 }
        );
      }
    }

    // Fetch patient data
    const { data: patient, error: patientErr } = await supabase
      .from("patients")
      .select("*, users(name, email, phone, created_at)")
      .eq("id", patientId)
      .maybeSingle();

    if (patientErr || !patient) {
      return NextResponse.json({ error: "Patient not found" }, { status: 404 });
    }

    // Fetch patient records
    const { data: records } = await supabase
      .from("patient_records")
      .select("*, doctor:doctor_id(users(name))")
      .eq("patient_id", patientId)
      .order("visit_date", { ascending: false });

    // Calculate age
    let age = null;
    if (patient.date_of_birth) {
      const birthDate = new Date(patient.date_of_birth);
      const today = new Date();
      age = today.getFullYear() - birthDate.getFullYear();
      const monthDiff = today.getMonth() - birthDate.getMonth();
      if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
        age--;
      }
    }

    return NextResponse.json({
      success: true,
      patient: {
        id: patient.id,
        name: patient.users?.name,
        email: patient.users?.email,
        phone: patient.users?.phone,
        dateOfBirth: patient.date_of_birth,
        age,
        gender: patient.gender,
        bloodType: patient.blood_type,
        emergencyContact: patient.emergency_contact,
        medicalHistory: patient.medical_history || [],
        allergies: patient.allergies || [],
        createdAt: patient.users?.created_at,
        records: (records || []).map((r: any) => ({
          id: r.id,
          date: r.visit_date,
          doctorName: r.doctor?.users?.name || "Attending Physician",
          diagnosis: r.diagnosis,
          notes: r.notes,
        })),
      },
    });
  } catch (error: any) {
    console.error("Error fetching patient detail:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch patient" },
      { status: 500 }
    );
  }
}
