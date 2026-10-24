/**
 * API Route: Doctor-Patient Assignments
 * 
 * GET /api/assignments - View doctor-patient assignments
 * POST /api/assignments - Assign doctor to patient (Admin only)
 * DELETE /api/assignments - Unassign doctor from patient (Admin only)
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

    const cookieStore = await cookies();
    const supabase = createClient(cookieStore);

    const userRole = user.role;
    let query = supabase
      .from("doctor_patient_assignments")
      .select(`
        id,
        doctor_id,
        patient_id,
        assigned_at,
        doctor:doctor_id(users(name, email)),
        patient:patient_id(users(name, email))
      `);

    if (userRole === "doctor") {
      query = query.eq("doctor_id", user.id);
    } else if (userRole === "patient") {
      query = query.eq("patient_id", user.id);
    } else if (userRole !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { data: assignments, error } = await query;
    if (error) throw error;

    const formatted = (assignments || []).map((a: any) => ({
      id: a.id,
      doctorId: a.doctor_id,
      doctorName: a.doctor?.users?.name || "Dr. Assigned",
      doctorEmail: a.doctor?.users?.email || "",
      patientId: a.patient_id,
      patientName: a.patient?.users?.name || "Patient",
      patientEmail: a.patient?.users?.email || "",
      assignedAt: a.assigned_at,
    }));

    return NextResponse.json({
      success: true,
      assignments: formatted,
    });
  } catch (error: any) {
    console.error("Error fetching assignments:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch assignments" },
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

    if (user.role !== "admin") {
      return NextResponse.json(
        { error: "Forbidden: Only admins can assign doctors to patients." },
        { status: 403 }
      );
    }

    const cookieStore = await cookies();
    const supabase = createClient(cookieStore);

    const body = await request.json();
    const { doctorId, patientId } = body;

    if (!doctorId || !patientId) {
      return NextResponse.json(
        { error: "Missing doctorId or patientId" },
        { status: 400 }
      );
    }

    // Ensure doctor exists in doctors table
    const { data: docExists } = await supabase
      .from("doctors")
      .select("id")
      .eq("id", doctorId)
      .maybeSingle();

    if (!docExists) {
      // If user exists as doctor in users table, insert into doctors
      await supabase.from("doctors").upsert({ id: doctorId });
    }

    // Ensure patient exists in patients table
    const { data: patExists } = await supabase
      .from("patients")
      .select("id")
      .eq("id", patientId)
      .maybeSingle();

    if (!patExists) {
      await supabase.from("patients").upsert({ id: patientId });
    }

    const { data: assignment, error } = await supabase
      .from("doctor_patient_assignments")
      .upsert({
        doctor_id: doctorId,
        patient_id: patientId,
        assigned_by: user.id,
        assigned_at: new Date().toISOString(),
      })
      .select("*")
      .single();

    if (error) throw error;

    return NextResponse.json({
      success: true,
      message: "Doctor assigned to patient successfully",
      assignment,
    });
  } catch (error: any) {
    console.error("Error assigning doctor to patient:", error);
    return NextResponse.json(
      { error: error.message || "Failed to assign doctor" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const user = await getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (user.role !== "admin") {
      return NextResponse.json(
        { error: "Forbidden: Only admins can manage assignments." },
        { status: 403 }
      );
    }

    const cookieStore = await cookies();
    const supabase = createClient(cookieStore);

    const { searchParams } = new URL(request.url);
    const assignmentId = searchParams.get("id");
    const doctorId = searchParams.get("doctorId");
    const patientId = searchParams.get("patientId");

    let deleteQuery = supabase.from("doctor_patient_assignments").delete();

    if (assignmentId) {
      deleteQuery = deleteQuery.eq("id", assignmentId);
    } else if (doctorId && patientId) {
      deleteQuery = deleteQuery.eq("doctor_id", doctorId).eq("patient_id", patientId);
    } else {
      return NextResponse.json(
        { error: "Provide assignment ID or doctorId and patientId" },
        { status: 400 }
      );
    }

    const { error } = await deleteQuery;
    if (error) throw error;

    return NextResponse.json({
      success: true,
      message: "Assignment removed successfully",
    });
  } catch (error: any) {
    console.error("Error removing assignment:", error);
    return NextResponse.json(
      { error: error.message || "Failed to remove assignment" },
      { status: 500 }
    );
  }
}
