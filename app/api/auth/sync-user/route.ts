/**
 * API Route: Sync User to Supabase Database
 * 
 * POST /api/auth/sync-user
 * 
 * Synchronizes authenticated user record. Role is strictly determined from verified
 * profile or pre-authorized invitations, never unverified client parameters.
 */

import { NextRequest, NextResponse } from "next/server";
import { getUser } from "@/lib/supabase-auth-server";
import { supabase } from "@/lib/db";

export async function POST(request: NextRequest) {
  try {
    const authUser = await getUser();
    if (!authUser) {
      return NextResponse.json(
        { error: "Unauthorized: Active session required to sync profile" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { name, phone } = body;

    const displayName = name || authUser.name || authUser.email.split("@")[0] || "User";

    // Update user profile - keep existing verified role
    const { error: userErr } = await supabase.from("users").upsert({
      id: authUser.id,
      email: authUser.email,
      name: displayName,
      phone: phone || authUser.phone || null,
      role: authUser.role, // Preserves verified role
      status: authUser.status || "active",
      updated_at: new Date().toISOString(),
    });

    if (userErr) {
      console.error("Supabase user sync error:", userErr.message);
      return NextResponse.json(
        { error: userErr.message || "Failed to sync user in database" },
        { status: 500 }
      );
    }

    if (authUser.role === "patient") {
      await supabase.from("patients").upsert({ id: authUser.id });
    } else if (authUser.role === "doctor") {
      await supabase.from("doctors").upsert({ id: authUser.id });
    }

    return NextResponse.json({
      success: true,
      user: {
        id: authUser.id,
        email: authUser.email,
        role: authUser.role,
      },
    });
  } catch (error: any) {
    console.error("Error syncing user:", error);
    return NextResponse.json(
      { error: error.message || "Failed to sync user" },
      { status: 500 }
    );
  }
}
