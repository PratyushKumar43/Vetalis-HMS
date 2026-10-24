/**
 * API Route: Get/Create Patients
 * 
 * GET /api/patients - Get list of authorized patients
 * POST /api/patients - Create/update patient record
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
    const search = searchParams.get("search") || "";

    let patients: any[] = [];

    if (userRole === "patient") {
      // Patients may only view their own record
      const { data, error } = await supabase
        .from("patients")
        .select("*, users(name, email, phone, created_at, role, status)")
        .eq("id", user.id);

      if (error) throw error;
      patients = (data || []).map((p: any) => ({
        ...p,
        name: p.users?.name,
        email: p.users?.email,
        phone: p.users?.phone,
        created_at: p.users?.created_at,
      }));
    } else if (userRole === "doctor") {
      // Doctors may only view patients assigned to them
      const { data: assignments, error: assignErr } = await supabase
        .from("doctor_patient_assignments")
        .select("patient_id")
        .eq("doctor_id", user.id);

      if (assignErr) throw assignErr;

      const assignedIds = (assignments || []).map((a: any) => a.patient_id);

      if (assignedIds.length > 0) {
        const { data, error } = await supabase
          .from("patients")
          .select("*, users(name, email, phone, created_at, role, status)")
          .in("id", assignedIds);

        if (error) throw error;
        patients = (data || []).map((p: any) => ({
          ...p,
          name: p.users?.name,
          email: p.users?.email,
          phone: p.users?.phone,
          created_at: p.users?.created_at,
        }));
      }
    } else if (userRole === "admin") {
      // Admins may view all patients
      const { data, error } = await supabase
        .from("patients")
        .select("*, users(name, email, phone, created_at, role, status)")
        .order("created_at", { ascending: false });

      if (error) throw error;
      patients = (data || []).map((p: any) => ({
        ...p,
        name: p.users?.name,
        email: p.users?.email,
        phone: p.users?.phone,
        created_at: p.users?.created_at,
      }));
    } else {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Filter by search query if provided
    let filteredPatients = patients;
    if (search) {
      const q = search.toLowerCase();
      filteredPatients = patients.filter((p: any) =>
        p.name?.toLowerCase().includes(q) ||
        p.email?.toLowerCase().includes(q) ||
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
    });
  } catch (error: any) {
    console.error("Error fetching patients:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch patients" },
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

    if (user.role === "patient") {
      return NextResponse.json(
        { error: "Forbidden: Patients cannot create patient accounts" },
        { status: 403 }
      );
    }

    const cookieStore = await cookies();
    const supabase = createClient(cookieStore);

    const body = await request.json();
    const {
      name,
      email,
      phone,
      dateOfBirth,
      gender,
      bloodType,
      emergencyContact,
      medicalHistory,
      allergies,
    } = body;

    if (!email || !name) {
      return NextResponse.json(
        { error: "Name and email are required" },
        { status: 400 }
      );
    }

    // Check if user already exists
    const { data: existingUser } = await supabase
      .from("users")
      .select("id")
      .eq("email", email)
      .maybeSingle();

    let patientId = existingUser?.id;

    if (!patientId) {
      patientId = crypto.randomUUID();
      const { error: userErr } = await supabase.from("users").insert({
        id: patientId,
        email,
        name,
        phone: phone || null,
        role: "patient",
        status: "active",
      });

      if (userErr) throw userErr;
    }

    // Create or update patients record
    const { error: patErr } = await supabase.from("patients").upsert({
      id: patientId,
      date_of_birth: dateOfBirth || null,
      gender: gender || null,
      blood_type: bloodType || null,
      emergency_contact: emergencyContact || null,
      medical_history: medicalHistory || [],
      allergies: allergies || [],
      updated_at: new Date().toISOString(),
    });

    if (patErr) throw patErr;

    // If a doctor created this patient, automatically assign doctor to patient
    if (user.role === "doctor") {
      await supabase.from("doctor_patient_assignments").upsert({
        doctor_id: user.id,
        patient_id: patientId,
        assigned_by: user.id,
      });
    }

    return NextResponse.json({
      success: true,
      message: "Patient record saved successfully",
      patient: { id: patientId, name, email },
    });
  } catch (error: any) {
    console.error("Error creating patient:", error);
    return NextResponse.json(
      { error: error.message || "Failed to save patient" },
      { status: 500 }
    );
  }
}
