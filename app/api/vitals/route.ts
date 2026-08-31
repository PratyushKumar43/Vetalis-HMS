/**
 * API Route: Get & Record Vitals
 * 
 * GET /api/vitals - Retrieve vital sign history
 * POST /api/vitals - Record vital signs (Doctor and Admin only)
 */

import { NextRequest, NextResponse } from "next/server";
import { getUser } from "@/lib/supabase-auth-server";
import { getVitalsByPatient } from "@/lib/db-helpers";
import { supabase } from "@/lib/db";

export async function GET(request: NextRequest) {
  try {
    const user = await getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userRole = (user.role as string) || "patient";
    const searchParams = request.nextUrl.searchParams;
    const patientId = searchParams.get("patientId") || (userRole === "patient" ? user.id : null);
    const limit = parseInt(searchParams.get("limit") || "30");

    if (!patientId) {
      return NextResponse.json(
        { error: "Patient ID is required" },
        { status: 400 }
      );
    }

    // Check permissions
    if (userRole === "patient" && user.id !== patientId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const vitals = await getVitalsByPatient(patientId, limit);

    // Format vitals for display
    const formattedVitals = vitals.map((vital: any) => ({
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

    // Calculate averages
    const averages = {
      heartRate: formattedVitals.length > 0
        ? Math.round(
            formattedVitals.reduce((sum, v) => sum + (v.heartRate || 0), 0) /
              formattedVitals.filter((v) => v.heartRate).length
          )
        : 0,
      temperature: formattedVitals.length > 0
        ? parseFloat(
            (
              formattedVitals.reduce((sum, v) => sum + (v.temperature || 0), 0) /
              formattedVitals.filter((v) => v.temperature).length
            ).toFixed(1)
          )
        : 0,
      oxygenSat: formattedVitals.length > 0
        ? Math.round(
            formattedVitals.reduce((sum, v) => sum + (v.oxygenSat || 0), 0) /
              formattedVitals.filter((v) => v.oxygenSat).length
          )
        : 0,
    };

    // Calculate average blood pressure
    let avgBP = "0/0";
    const bpReadings = formattedVitals.filter((v) => v.bloodPressure);
    if (bpReadings.length > 0) {
      const systolic = Math.round(
        bpReadings.reduce((sum, v) => {
          const [s] = v.bloodPressure!.split("/").map(Number);
          return sum + s;
        }, 0) / bpReadings.length
      );
      const diastolic = Math.round(
        bpReadings.reduce((sum, v) => {
          const [, d] = v.bloodPressure!.split("/").map(Number);
          return sum + d;
        }, 0) / bpReadings.length
      );
      avgBP = `${systolic}/${diastolic}`;
    }

    return NextResponse.json({
      success: true,
      vitals: formattedVitals,
      averages: {
        ...averages,
        bloodPressure: avgBP,
      },
      total: formattedVitals.length,
    });
  } catch (error) {
    console.error("Error fetching vitals:", error);
    return NextResponse.json(
      { error: "Failed to fetch vitals" },
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

    const userRole = (user.role as string) || "patient";
    if (userRole === "patient") {
      return NextResponse.json(
        { error: "Forbidden: Patients are not allowed to record or edit vitals." },
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

    if (dbErr) {
      console.error("Database error saving vitals:", dbErr);
      throw new Error(dbErr.message);
    }

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
