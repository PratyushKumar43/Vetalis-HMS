/**
 * API Route: Create User (Admin Only)
 * 
 * POST /api/users/create
 * 
 * Allows admins to create user accounts with specific roles in Supabase.
 */

import { NextRequest, NextResponse } from "next/server";
import { getUser } from "@/lib/supabase-auth-server";
import { supabase } from "@/lib/db";

export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const currentUser = await getUser();
    if (!currentUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Only admins can create users
    const userRole = (currentUser.role as string) || "patient";
    if (userRole !== "admin") {
      return NextResponse.json(
        { error: "Forbidden: Only admins can create users" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { email, name, role, phone } = body;

    // Validate required fields
    if (!email || !name || !role) {
      return NextResponse.json(
        { error: "Missing required fields: email, name, role" },
        { status: 400 }
      );
    }

    // Validate role
    if (!["admin", "doctor", "patient"].includes(role)) {
      return NextResponse.json(
        { error: "Invalid role. Must be admin, doctor, or patient" },
        { status: 400 }
      );
    }

    // Check if email already exists
    const { data: existingUser } = await supabase
      .from("users")
      .select("id")
      .eq("email", email)
      .single();

    if (existingUser) {
      return NextResponse.json(
        { error: "User with this email already exists" },
        { status: 400 }
      );
    }

    const tempUserId = crypto.randomUUID();

    try {
      const { error: insertError } = await supabase.from("users").insert({
        id: tempUserId,
        email,
        name,
        phone: phone || null,
        role,
      });

      if (insertError) {
        throw new Error(insertError.message);
      }

      // Create role-specific records
      if (role === "doctor") {
        await supabase.from("doctors").upsert({
          id: tempUserId,
          verified: false,
        });
      } else if (role === "patient") {
        await supabase.from("patients").upsert({
          id: tempUserId,
        });
      }

      return NextResponse.json({
        success: true,
        message: `User account created with ${role} role. User can now sign up using email: ${email}.`,
        user: {
          id: tempUserId,
          email,
          name,
          phone,
          role,
        },
      });
    } catch (dbError: any) {
      console.error("Database error:", dbError);
      return NextResponse.json(
        { error: dbError.message || "Failed to create user in database" },
        { status: 500 }
      );
    }
  } catch (error: any) {
    console.error("Error creating user:", error);
    return NextResponse.json(
      { error: error.message || "Failed to create user" },
      { status: 500 }
    );
  }
}
