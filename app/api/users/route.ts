/**
 * API Route: Get Users
 * 
 * GET /api/users
 * 
 * Returns list of users (Admin only)
 */

import { NextRequest, NextResponse } from "next/server";
import { getUser } from "@/lib/supabase-auth-server";
import { getUsersByRole } from "@/lib/db-helpers";
import { sql } from "@/lib/db";

export async function GET(request: NextRequest) {
  try {
    const user = await getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userRole = (user.role as string) || "patient";
    
    // Only admins can view all users
    if (userRole !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const searchParams = request.nextUrl.searchParams;
    const role = searchParams.get("role") as "admin" | "doctor" | "patient" | null;

    let users;

    if (role) {
      users = await getUsersByRole(role);
    } else {
      // Get all users
      users = await sql`
        SELECT u.*, 
          d.specialization, d.license_number,
          p.date_of_birth, p.gender, p.blood_type
        FROM users u
        LEFT JOIN doctors d ON u.id = d.id
        LEFT JOIN patients p ON u.id = p.id
        ORDER BY u.created_at DESC
      `;
    }

    // Format users
    const formattedUsers = users.map((u: any) => ({
      id: u.id,
      name: u.name,
      email: u.email,
      phone: u.phone,
      role: u.role,
      status: "Active", // You can add a status field to users table
      lastLogin: u.updated_at || u.created_at,
      specialization: u.specialization,
      licenseNumber: u.license_number,
    }));

    return NextResponse.json({
      success: true,
      users: formattedUsers,
      total: formattedUsers.length,
    });
  } catch (error) {
    console.error("Error fetching users:", error);
    return NextResponse.json(
      { error: "Failed to fetch users" },
      { status: 500 }
    );
  }
}

