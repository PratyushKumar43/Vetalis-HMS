/**
 * API Route: Sync User to Supabase Database
 * 
 * POST /api/auth/sync-user
 * 
 * Creates or updates user in database after Supabase Auth sign-up/sign-in
 */

import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/db";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, email, name, role = "patient" } = body;

    if (!id || !email) {
      return NextResponse.json(
        { error: "Missing required fields: id, email" },
        { status: 400 }
      );
    }

    const displayName = name || email.split("@")[0] || "User";

    // Upsert into users table
    const { error: userErr } = await supabase.from("users").upsert({
      id,
      email,
      name: displayName,
      role,
    });

    if (userErr) {
      console.error("Supabase user sync error:", userErr.message);
      return NextResponse.json(
        { error: userErr.message || "Failed to sync user in database" },
        { status: 500 }
      );
    }

    if (role === "patient") {
      const { error: patientErr } = await supabase.from("patients").upsert({ id });
      if (patientErr) {
        console.error("Patient upsert error:", patientErr.message);
        return NextResponse.json(
          { error: patientErr.message || "Failed to create patient record" },
          { status: 500 }
        );
      }
    } else if (role === "doctor") {
      const { error: doctorErr } = await supabase.from("doctors").upsert({ id, verified: false });
      if (doctorErr) {
        console.error("Doctor upsert error:", doctorErr.message);
        return NextResponse.json(
          { error: doctorErr.message || "Failed to create doctor record" },
          { status: 500 }
        );
      }
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Error syncing user:", error);
    return NextResponse.json(
      { error: error.message || "Failed to sync user" },
      { status: 500 }
    );
  }
}
