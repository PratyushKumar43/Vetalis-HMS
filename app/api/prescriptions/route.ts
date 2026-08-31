/**
 * API Route: Get Prescriptions
 * 
 * GET /api/prescriptions
 * 
 * Returns list of prescriptions
 */

import { NextRequest, NextResponse } from "next/server";
import { getUser } from "@/lib/supabase-auth-server";
import { getPrescriptionsByPatient, getPrescriptionsByDoctor } from "@/lib/db-helpers";
import { sql } from "@/lib/db";

export async function GET(request: NextRequest) {
  try {
    const user = await getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userRole = (user.role as string) || "patient";
    const searchParams = request.nextUrl.searchParams;
    const patientId = searchParams.get("patientId");
    const status = searchParams.get("status") || "all";

    let prescriptions;

    if (userRole === "patient") {
      // Patients see their own prescriptions
      prescriptions = await getPrescriptionsByPatient(user.id);
    } else if (userRole === "doctor") {
      // Doctors see prescriptions for their patients or all if patientId specified
      if (patientId) {
        prescriptions = await getPrescriptionsByPatient(patientId);
      } else {
        prescriptions = await getPrescriptionsByDoctor(user.id);
      }
    } else {
      // Admins see all prescriptions
      if (patientId) {
        prescriptions = await getPrescriptionsByPatient(patientId);
      } else {
        prescriptions = await sql`
          SELECT p.*, 
            u1.name as patient_name, u1.email as patient_email,
            u2.name as doctor_name
          FROM prescriptions p
          JOIN users u1 ON p.patient_id = u1.id
          JOIN users u2 ON p.doctor_id = u2.id
          ORDER BY p.created_at DESC
          LIMIT 100
        `;
      }
    }

    // Format prescriptions with patient/doctor names
    const formattedPrescriptions = await Promise.all(
      prescriptions.map(async (prescription: any) => {
        // Get patient name if not included
        if (!prescription.patient_name) {
          const patient = await sql`
            SELECT name FROM users WHERE id = ${prescription.patient_id}::uuid
          `;
          prescription.patient_name = patient[0]?.name || "Unknown";
        }

        // Get doctor name if not included
        if (!prescription.doctor_name) {
          const doctor = await sql`
            SELECT name FROM users WHERE id = ${prescription.doctor_id}::uuid
          `;
          prescription.doctor_name = doctor[0]?.name || "Unknown";
        }

        // Format medications
        const medications = Array.isArray(prescription.medications)
          ? prescription.medications
          : [];

        return {
          id: prescription.id,
          patientName: prescription.patient_name,
          doctorName: prescription.doctor_name,
          medications: medications.map((med: any) =>
            typeof med === "string"
              ? med
              : `${med.name} ${med.dosage} - ${med.frequency}`
          ),
          status: prescription.status,
          createdDate: prescription.created_at,
          aiGenerated: prescription.ai_generated || false,
        };
      })
    );

    // Filter by status if specified
    let filtered = formattedPrescriptions;
    if (status !== "all") {
      filtered = formattedPrescriptions.filter((p) => p.status === status);
    }

    return NextResponse.json({
      success: true,
      prescriptions: filtered,
      total: filtered.length,
    });
  } catch (error) {
    console.error("Error fetching prescriptions:", error);
    return NextResponse.json(
      { error: "Failed to fetch prescriptions" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getUser();
    if (!user) {
      console.error("POST /api/prescriptions: Unauthorized - No user");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Only doctors and admins can create prescriptions
    const userRole = (user.role as string) || "patient";
    if (userRole === "patient") {
      console.error(`POST /api/prescriptions: Forbidden - User role: ${userRole}`);
      return NextResponse.json(
        { error: "Forbidden: Only doctors and admins can create prescriptions" },
        { status: 403 }
      );
    }

    const body = await request.json();
    console.log("POST /api/prescriptions: Request body:", body);
    const { patientId, medications, notes, aiGenerated } = body;

    // Validate required fields
    if (!patientId || !medications || !Array.isArray(medications) || medications.length === 0) {
      console.error("POST /api/prescriptions: Missing required fields", { patientId, medications });
      return NextResponse.json(
        { error: "Missing required fields: patientId, medications" },
        { status: 400 }
      );
    }

    // Validate medications array
    const validMedications = medications.filter((med: any) => 
      med.name && med.dosage && med.frequency && med.duration
    );

    console.log("POST /api/prescriptions: Valid medications:", validMedications);

    if (validMedications.length === 0) {
      console.error("POST /api/prescriptions: No valid medications", medications);
      return NextResponse.json(
        { error: "At least one valid medication is required (name, dosage, frequency, duration)" },
        { status: 400 }
      );
    }

    // Check if patient exists
    const patient = await sql`
      SELECT id FROM patients WHERE id = ${patientId}::uuid
    `;

    if (patient.length === 0) {
      console.error(`POST /api/prescriptions: Patient not found: ${patientId}`);
      return NextResponse.json(
        { error: "Patient not found" },
        { status: 404 }
      );
    }

    console.log("POST /api/prescriptions: Creating prescription for patient:", patientId, "by doctor:", user.id);

    // Create prescription
    try {
      const prescription = await sql`
        INSERT INTO prescriptions (
          patient_id,
          doctor_id,
          medications,
          ai_generated,
          status,
          notes,
          created_at,
          updated_at
        )
        VALUES (
          ${patientId}::uuid,
          ${user.id}::uuid,
          ${JSON.stringify(validMedications)}::jsonb,
          ${aiGenerated || false},
          'active',
          ${notes || null},
          NOW(),
          NOW()
        )
        RETURNING id, created_at
      `;

      console.log("POST /api/prescriptions: Prescription created successfully:", prescription[0]);

      // Create notification for the patient
      try {
        // Get patient name for notification
        const patientInfo = await sql`
          SELECT name FROM users WHERE id = ${patientId}::uuid
        `;
        const patientName = patientInfo[0]?.name || "Patient";

        // Get doctor name for notification
        const doctorInfo = await sql`
          SELECT name FROM users WHERE id = ${user.id}::uuid
        `;
        const doctorName = doctorInfo[0]?.name || "Doctor";

        // Create notification
        await sql`
          INSERT INTO notifications (user_id, type, title, message, link, created_at)
          VALUES (
            ${patientId}::uuid,
            'prescription',
            'New Prescription Created',
            ${`Dr. ${doctorName} has created a new prescription for you with ${validMedications.length} medication(s).`},
            ${`/dashboard/prescriptions`},
            NOW()
          )
        `;
        console.log("POST /api/prescriptions: Notification created for patient");
      } catch (notifError: any) {
        // Log error but don't fail the prescription creation
        console.error("POST /api/prescriptions: Failed to create notification:", notifError);
      }

      return NextResponse.json({
        success: true,
        prescription: {
          id: prescription[0].id,
          patientId,
          doctorId: user.id,
          medications: validMedications,
          status: "active",
          created_at: prescription[0].created_at,
        },
      });
    } catch (dbError: any) {
      console.error("POST /api/prescriptions: Database error:", dbError);
      throw dbError;
    }
  } catch (error: any) {
    console.error("Error creating prescription:", error);
    return NextResponse.json(
      { 
        error: "Failed to create prescription",
        details: error.message || "Unknown error"
      },
      { status: 500 }
    );
  }
}

