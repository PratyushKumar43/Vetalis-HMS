/**
 * API Route: Get Patient by ID
 * 
 * GET /api/patients/[id]
 * 
 * Returns detailed patient information
 */

import { NextRequest, NextResponse } from "next/server";
import { getUser } from "@/lib/supabase-auth-server";
import { getPatientById } from "@/lib/db-helpers";
import { sql } from "@/lib/db";

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userRole = (user.role as string) || "patient";
    const patientId = params.id;

    // Reject "new" as it's not a valid patient ID
    if (patientId === "new") {
      return NextResponse.json(
        { error: "Invalid patient ID. Use /api/patients to create a new patient." },
        { status: 400 }
      );
    }

    // Check permissions - patients can only view their own records
    if (userRole === "patient" && user.id !== patientId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Get patient data
    const patient = await sql`
      SELECT 
        p.*,
        u.name, u.email, u.phone, u.created_at as user_created_at
      FROM patients p
      JOIN users u ON p.id = u.id
      WHERE p.id = ${patientId}::uuid
    `;

    if (!patient || patient.length === 0) {
      return NextResponse.json({ error: "Patient not found" }, { status: 404 });
    }

    const patientData = patient[0];

    // Get medical history (patient records)
    const records = await sql`
      SELECT pr.*, u.name as doctor_name
      FROM patient_records pr
      JOIN users u ON pr.doctor_id = u.id
      WHERE pr.patient_id = ${patientId}::uuid
      ORDER BY pr.visit_date DESC
      LIMIT 10
    `;

    // Get current prescriptions
    const prescriptions = await sql`
      SELECT p.*, u.name as doctor_name
      FROM prescriptions p
      JOIN users u ON p.doctor_id = u.id
      WHERE p.patient_id = ${patientId}::uuid
        AND p.status = 'active'
      ORDER BY p.created_at DESC
    `;

    // Get latest vitals
    const latestVitals = await sql`
      SELECT *
      FROM vitals
      WHERE patient_id = ${patientId}::uuid
      ORDER BY recorded_at DESC
      LIMIT 1
    `;

    // Calculate age
    let age = null;
    if (patientData.date_of_birth) {
      const birthDate = new Date(patientData.date_of_birth);
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
        ...patientData,
        age,
        medicalHistory: records,
        currentMedications: prescriptions.map((p: any) => ({
          medications: p.medications,
          doctor: p.doctor_name,
        })),
        lastVitals: latestVitals.length > 0 ? latestVitals[0] : null,
      },
    });
  } catch (error) {
    console.error("Error fetching patient:", error);
    return NextResponse.json(
      { error: "Failed to fetch patient" },
      { status: 500 }
    );
  }
}

