/**
 * API Route: Get & Manage Users (Admin Only)
 * 
 * GET /api/users - List users with roles, account status, and doctor credentials
 * PATCH /api/users - Update account status (active/deactivated) or doctor verification
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

    if (user.role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const cookieStore = await cookies();
    const supabase = createClient(cookieStore);

    const searchParams = request.nextUrl.searchParams;
    const roleFilter = searchParams.get("role");
    const statusFilter = searchParams.get("status");
    const searchQuery = searchParams.get("search")?.toLowerCase().trim();

    let query = supabase
      .from("users")
      .select(`
        id,
        name,
        email,
        phone,
        role,
        status,
        created_at,
        updated_at,
        doctors:doctors(specialization, license_number, verified)
      `)
      .order("created_at", { ascending: false });

    if (roleFilter && ["admin", "doctor", "patient"].includes(roleFilter)) {
      query = query.eq("role", roleFilter);
    }

    const { data: users, error } = await query;
    if (error) throw error;

    // Fetch preauthorized roles to accurately identify pending invitations
    let preauthMap = new Map();
    try {
      const { data: preauthList } = await supabase
        .from("preauthorized_roles")
        .select("email, claimed_at, created_at");

      (preauthList || []).forEach((p) => {
        preauthMap.set(p.email.toLowerCase(), p);
      });
    } catch (e) {
      // Gracefully continue if preauthorized_roles is empty
    }

    let formattedUsers = (users || []).map((u: any) => {
      const emailLower = (u.email || "").toLowerCase();
      const preauth = preauthMap.get(emailLower);

      // Determine effective lifecycle status:
      // If user is in preauthorized_roles with unclaimed status, mark as 'invited'
      let effectiveStatus = u.status || "active";
      if (preauth && !preauth.claimed_at) {
        effectiveStatus = "invited";
      }

      return {
        id: u.id,
        name: u.name || "User",
        email: u.email,
        phone: u.phone,
        role: u.role,
        status: effectiveStatus,
        lastLogin: u.updated_at || u.created_at,
        invitedAt: preauth?.created_at || null,
        specialization: u.doctors?.[0]?.specialization || null,
        licenseNumber: u.doctors?.[0]?.license_number || null,
        doctorVerified: u.doctors?.[0]?.verified || false,
      };
    });

    // Apply status filter if requested
    if (statusFilter && statusFilter !== "all") {
      formattedUsers = formattedUsers.filter((u) => u.status === statusFilter);
    }

    // Apply search query if requested
    if (searchQuery) {
      formattedUsers = formattedUsers.filter(
        (u) =>
          u.name.toLowerCase().includes(searchQuery) ||
          u.email.toLowerCase().includes(searchQuery) ||
          (u.specialization && u.specialization.toLowerCase().includes(searchQuery))
      );
    }

    return NextResponse.json({
      success: true,
      users: formattedUsers,
      total: formattedUsers.length,
    });
  } catch (error: any) {
    console.error("Error fetching users:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch users" },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const user = await getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (user.role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const cookieStore = await cookies();
    const supabase = createClient(cookieStore);

    const body = await request.json();
    const { userId, status, doctorVerified } = body;

    if (!userId) {
      return NextResponse.json({ error: "userId is required." }, { status: 400 });
    }

    // Prevent admin from deactivating their own account
    if (userId === user.id && status && status !== "active") {
      return NextResponse.json(
        { error: "Cannot deactivate your own administrator account." },
        { status: 400 }
      );
    }

    // 1. Update user status if provided
    if (status) {
      if (!["active", "deactivated", "suspended", "invited"].includes(status)) {
        return NextResponse.json(
          { error: "Invalid status value. Must be active, deactivated, suspended, or invited." },
          { status: 400 }
        );
      }

      const { error: statusErr } = await supabase
        .from("users")
        .update({
          status,
          updated_at: new Date().toISOString(),
        })
        .eq("id", userId);

      if (statusErr) throw statusErr;
    }

    // 2. Update doctor professional verification if provided
    if (typeof doctorVerified === "boolean") {
      const { error: docErr } = await supabase
        .from("doctors")
        .update({
          verified: doctorVerified,
        })
        .eq("id", userId);

      if (docErr) throw docErr;
    }

    // Return updated record
    const { data: updated } = await supabase
      .from("users")
      .select("id, email, name, role, status")
      .eq("id", userId)
      .single();

    return NextResponse.json({
      success: true,
      message: "User account updated successfully.",
      user: updated,
    });
  } catch (error: any) {
    console.error("Error updating user:", error);
    return NextResponse.json(
      { error: error.message || "Failed to update user" },
      { status: 500 }
    );
  }
}
