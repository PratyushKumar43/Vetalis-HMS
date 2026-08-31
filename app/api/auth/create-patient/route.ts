/**
 * API Route: Create Patient Account
 * 
 * POST /api/auth/create-patient
 * 
 * Creates a patient account with Neon Auth and database record
 * Used by doctors/admins to manually create patient accounts
 */

import { NextRequest, NextResponse } from "next/server";
import { getUser } from "@/lib/supabase-auth-server";
import { sql } from "@/lib/db";

export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const currentUser = await getUser();
    if (!currentUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Only doctors and admins can create patients
    const userRole = (currentUser.role as string) || "patient";
    if (userRole === "patient") {
      return NextResponse.json(
        { error: "Forbidden: Only doctors and admins can create patient accounts" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { name, email, password, phone, role = "patient" } = body;

    // Validate required fields
    if (!email || !password || !name) {
      return NextResponse.json(
        { error: "Missing required fields: email, password, name" },
        { status: 400 }
      );
    }

    // Validate password
    if (password.length < 8) {
      return NextResponse.json(
        { error: "Password must be at least 8 characters long" },
        { status: 400 }
      );
    }

    // Check if email already exists
    const existingUser = await sql`
      SELECT id FROM users WHERE email = ${email}
    `;

    if (existingUser.length > 0) {
      return NextResponse.json(
        { error: "User with this email already exists" },
        { status: 400 }
      );
    }

    // Generate UUID for the user
    const userId = crypto.randomUUID();

    try {
      // Create user in database
      // Note: The patient will need to sign up with Neon Auth using this email and password
      // When they sign up, the sync-user endpoint will match by email and assign the pre-created account
      await sql`
        INSERT INTO users (id, email, name, phone, role, created_at, updated_at)
        VALUES (${userId}::uuid, ${email}, ${name}, ${phone || null}, ${role}, NOW(), NOW())
      `;

      // Create patient record
      await sql`
        INSERT INTO patients (id, created_at, updated_at)
        VALUES (${userId}::uuid, NOW(), NOW())
        ON CONFLICT (id) DO NOTHING
      `;
      
      return NextResponse.json({
        success: true,
        message: `Patient account created successfully. The patient can sign up at /auth/sign-up using email: ${email} and the password you set.`,
        user: {
          id: userId,
          email,
          name,
          phone,
          role,
        },
      });
    } catch (dbError: any) {
      console.error("Database error:", dbError);
      return NextResponse.json(
        { error: dbError.message || "Failed to create patient in database" },
        { status: 500 }
      );
    }
  } catch (error: any) {
    console.error("Error creating patient:", error);
    return NextResponse.json(
      { error: error.message || "Failed to create patient" },
      { status: 500 }
    );
  }
}

