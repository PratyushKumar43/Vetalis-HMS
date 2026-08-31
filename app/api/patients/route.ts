/**
 * API Route: Get/Create Patients
 * 
 * GET /api/patients - Get list of patients
 * POST /api/patients - Create patient record (after user account is created)
 */

import { NextRequest, NextResponse } from "next/server";
import { getUser } from "@/lib/supabase-auth-server";
import { getAllPatients, getPatientsByDoctor } from "@/lib/db-helpers";
import { sql } from "@/lib/db";

export async function GET(request: NextRequest) {
  try {
    const user = await getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userRole = (user.role as string) || "patient";
    const searchParams = request.nextUrl.searchParams;
    const search = searchParams.get("search") || "";
    const limit = parseInt(searchParams.get("limit") || "100");
    const offset = parseInt(searchParams.get("offset") || "0");

    let patients: any[] = [];

    // Patients can only see themselves
    if (userRole === "patient") {
      const patient = await sql`
        SELECT 
          p.*, 
          u.name, 
          u.email, 
          u.phone, 
          u.created_at
        FROM users u
        LEFT JOIN patients p ON p.id = u.id
        WHERE u.id = ${user.id}::uuid
      `;
      patients = patient;
    } else {
      // Doctors and Admins see ALL signed up patients
      const allPatients = await sql`
        SELECT 
          u.id,
          u.name,
          u.email,
          u.phone,
          u.role,
          u.created_at,
          p.date_of_birth,
          p.gender,
          p.blood_type,
          p.emergency_contact,
          p.medical_history,
          p.allergies
        FROM users u
        LEFT JOIN patients p ON p.id = u.id
        WHERE u.role = 'patient' OR p.id IS NOT NULL
        ORDER BY u.created_at DESC
      `;
      patients = allPatients;
    }

    // Apply search filter if provided
    let filteredPatients = patients;
    if (search) {
      filteredPatients = patients.filter((p: any) =>
        p.name?.toLowerCase().includes(search.toLowerCase()) ||
        p.email?.toLowerCase().includes(search.toLowerCase()) ||
        p.phone?.includes(search)
      );
    }

    // Calculate age from date_of_birth
    const patientsWithAge = filteredPatients.map((p: any) => {
      if (p.date_of_birth) {
        const birthDate = new Date(p.date_of_birth);
        const today = new Date();
        const age = today.getFullYear() - birthDate.getFullYear();
        const monthDiff = today.getMonth() - birthDate.getMonth();
        const finalAge = monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate()) ? age - 1 : age;
        return { ...p, age: finalAge };
      }
      return { ...p, age: null };
    });

    return NextResponse.json({
      success: true,
      patients: patientsWithAge,
      total: patientsWithAge.length,
      message: `Found ${patientsWithAge.length} patient(s)`,
    });
  } catch (error: any) {
    console.error("Error fetching patients:", error);
    return NextResponse.json(
      { 
        error: "Failed to fetch patients",
        details: error.message || "Unknown error"
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Only doctors and admins can create patient records
    const userRole = (user.role as string) || "patient";
    if (userRole === "patient") {
      return NextResponse.json(
        { error: "Forbidden: Only doctors and admins can create patient records" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { id, date_of_birth, gender, blood_type, emergency_contact } = body;

    if (!id) {
      return NextResponse.json(
        { error: "Missing required field: id" },
        { status: 400 }
      );
    }

    // Check if patient record already exists
    const existingPatient = await sql`
      SELECT id FROM patients WHERE id = ${id}::uuid
    `;

    if (existingPatient.length > 0) {
      // Update existing patient record
      await sql`
        UPDATE patients
        SET 
          date_of_birth = ${date_of_birth || null},
          gender = ${gender || null},
          blood_type = ${blood_type || null},
          emergency_contact = ${emergency_contact ? JSON.stringify(emergency_contact) : null}::jsonb,
          updated_at = NOW()
        WHERE id = ${id}::uuid
      `;
    } else {
      // Create new patient record
      await sql`
        INSERT INTO patients (
          id, 
          date_of_birth, 
          gender, 
          blood_type, 
          emergency_contact,
          created_at, 
          updated_at
        )
        VALUES (
          ${id}::uuid,
          ${date_of_birth || null},
          ${gender || null},
          ${blood_type || null},
          ${emergency_contact ? JSON.stringify(emergency_contact) : null}::jsonb,
          NOW(),
          NOW()
        )
      `;
    }

    return NextResponse.json({
      success: true,
      message: "Patient record created/updated successfully",
    });
  } catch (error: any) {
    console.error("Error creating patient record:", error);
    return NextResponse.json(
      { 
        error: "Failed to create patient record",
        details: error.message || "Unknown error"
      },
      { status: 500 }
    );
  }
}
