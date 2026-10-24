/**
 * API Route: Get & Create Prescriptions
 * 
 * GET /api/prescriptions - Returns list of authorized prescriptions
 * POST /api/prescriptions - Creates a new prescription (Doctor assigned to patient, or Admin)
 */

import { NextRequest, NextResponse } from "next/server";
import { getUser } from "@/lib/supabase-auth-server";
import { cookies } from "next/headers";
import { createClient } from "@/utils/supabase/server";

export async function GET(request: NextRequest) {
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
    const searchParams = request.nextUrl.searchParams;
    const requestedPatientId = searchParams.get("patientId");
    const status = searchParams.get("status") || "all";

    let prescriptionsQuery = supabase
      .from("prescriptions")
      .select("*, patient:patient_id(users(name, email)), doctor:doctor_id(users(name, email))");

    if (userRole === "patient") {
      // Patients strictly view own prescriptions
      prescriptionsQuery = prescriptionsQuery.eq("patient_id", user.id);
    } else if (userRole === "doctor") {
      const { data: assignments } = await supabase
        .from("doctor_patient_assignments")
        .select("patient_id")
        .eq("doctor_id", user.id);

      const assignedPatientIds = (assignments || []).map((a: any) => a.patient_id);

      if (requestedPatientId) {
        if (!assignedPatientIds.includes(requestedPatientId)) {
          return NextResponse.json(
            { error: "Forbidden: You are not assigned to this patient." },
            { status: 403 }
          );
        }
        prescriptionsQuery = prescriptionsQuery.eq("patient_id", requestedPatientId);
      } else {
        if (assignedPatientIds.length === 0) {
          return NextResponse.json({ success: true, prescriptions: [], total: 0 });
        }
        prescriptionsQuery = prescriptionsQuery.in("patient_id", assignedPatientIds);
      }
    } else if (userRole === "admin") {
      if (requestedPatientId) {
        prescriptionsQuery = prescriptionsQuery.eq("patient_id", requestedPatientId);
      }
    } else {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    if (status !== "all") {
      prescriptionsQuery = prescriptionsQuery.eq("status", status);
    }

    prescriptionsQuery = prescriptionsQuery.order("created_at", { ascending: false }).limit(100);

    const { data: rawPrescriptions, error: dbError } = await prescriptionsQuery;
    if (dbError) throw dbError;

    const formattedPrescriptions = (rawPrescriptions || []).map((p: any) => ({
      id: p.id,
      patientId: p.patient_id,
      doctorId: p.doctor_id,
      patientName: p.patient?.users?.name || p.patient?.name || "Unknown",
      patientEmail: p.patient?.users?.email || p.patient?.email,
      doctorName: p.doctor?.users?.name || p.doctor?.name || "Unknown",
      medications: Array.isArray(p.medications) ? p.medications : [],
      status: p.status,
      notes: p.notes,
      aiGenerated: p.ai_generated,
      createdAt: p.created_at,
    }));

    return NextResponse.json({
      success: true,
      prescriptions: formattedPrescriptions,
      total: formattedPrescriptions.length,
    });
  } catch (error: any) {
    console.error("Error fetching prescriptions:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch prescriptions" },
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

    if (user.status !== "active") {
      return NextResponse.json({ error: "Account deactivated" }, { status: 403 });
    }

    const userRole = user.role;
    if (userRole === "patient") {
      return NextResponse.json(
        { error: "Forbidden: Patients cannot issue prescriptions." },
        { status: 403 }
      );
    }

    const cookieStore = await cookies();
    const supabase = createClient(cookieStore);

    const body = await request.json();
    const { patientId, medications, notes, status = "active", aiGenerated = false } = body;

    if (!patientId || !medications || !Array.isArray(medications) || medications.length === 0) {
      return NextResponse.json(
        { error: "Patient ID and at least one medication are required." },
        { status: 400 }
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

    const { data: inserted, error: insertErr } = await supabase
      .from("prescriptions")
      .insert({
        patient_id: patientId,
        doctor_id: userRole === "doctor" ? user.id : (body.doctorId || user.id),
        medications,
        status,
        notes: notes || null,
        ai_generated: !!aiGenerated,
      })
      .select("*")
      .single();

    if (insertErr) throw insertErr;

    return NextResponse.json({
      success: true,
      prescription: inserted,
      message: "Prescription created successfully",
    });
  } catch (err: any) {
    console.error("Error creating prescription:", err);
    return NextResponse.json(
      { error: err.message || "Failed to create prescription" },
      { status: 500 }
    );
  }
}
