/**
 * API Route: Get & Record Vitals
 * 
 * GET /api/vitals - Retrieve vital sign history
 * POST /api/vitals - Record vital signs (Doctor assigned to patient, or Admin)
 */

import { NextRequest, NextResponse } from "next/server";
import { getUser } from "@/lib/supabase-auth-server";
import { supabase } from "@/lib/db";

export async function GET(request: NextRequest) {
  try {
    const user = await getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (user.status !== "active") {
      return NextResponse.json({ error: "Account deactivated" }, { status: 403 });
    }

    const userRole = user.role;
    const searchParams = request.nextUrl.searchParams;
    let patientId = searchParams.get("patientId");
    const limit = parseInt(searchParams.get("limit") || "30");

    if (userRole === "patient") {
      patientId = user.id;
    }

    if (!patientId) {
      return NextResponse.json(
        { error: "Patient ID is required" },
        { status: 400 }
      );
    }

    // Role checks
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

    const { data: vitalsData, error: vitalsErr } = await supabase
      .from("vitals")
      .select("*")
      .eq("patient_id", patientId)
      .order("recorded_at", { ascending: false })
      .limit(limit);

    if (vitalsErr) throw vitalsErr;

    const formattedVitals = (vitalsData || []).map((vital: any) => ({
      id: vital.id,
      date: vital.recorded_at,
      heartRate: vital.heart_rate,
      bloodPressure: vital.blood_pressure_systolic && vital.blood_pressure_diastolic
        ? `${vital.blood_pressure_systolic}/${vital.blood_pressure_diastolic}`
        : null,
      temperature: vital.temperature ? parseFloat(vital.temperature) : null,
      oxygenSat: vital.oxygen_saturation ? parseFloat(vital.oxygen_saturation) : null,
      respiratoryRate: vital.respiratory_rate,
      weight: vital.weight ? parseFloat(vital.weight) : null,
    }));

    return NextResponse.json({
      success: true,
      vitals: formattedVitals,
      total: formattedVitals.length,
    });
  } catch (error: any) {
    console.error("Error fetching vitals:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch vitals" },
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
        { error: "Forbidden: Patients are not allowed to record vitals." },
        { status: 403 }
      );
    }

    const body = await request.json();
    const {
      patientId,
      heartRate,
      bloodPressureSystolic,
      bloodPressureDiastolic,
      temperature,
      oxygenSaturation,
      respiratoryRate,
      weight,
      notes,
    } = body;

    if (!patientId) {
      return NextResponse.json(
        { error: "Patient ID is required" },
        { status: 400 }
      );
    }

    // Verify doctor assignment
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

    const { data: inserted, error: dbErr } = await supabase
      .from("vitals")
      .insert({
        patient_id: patientId,
        recorded_by: user.id,
        heart_rate: heartRate ? parseInt(heartRate) : null,
        blood_pressure_systolic: bloodPressureSystolic ? parseInt(bloodPressureSystolic) : null,
        blood_pressure_diastolic: bloodPressureDiastolic ? parseInt(bloodPressureDiastolic) : null,
        temperature: temperature ? parseFloat(temperature) : null,
        oxygen_saturation: oxygenSaturation ? parseFloat(oxygenSaturation) : null,
        respiratory_rate: respiratoryRate ? parseInt(respiratoryRate) : null,
        weight: weight ? parseFloat(weight) : null,
        notes: notes || null,
      })
      .select("*")
      .single();

    if (dbErr) throw dbErr;

    return NextResponse.json({
      success: true,
      vital: inserted,
      message: "Vitals recorded successfully",
    });
  } catch (err: any) {
    console.error("Error creating vitals:", err);
    return NextResponse.json(
      { error: err.message || "Failed to record vitals" },
      { status: 500 }
    );
  }
}
