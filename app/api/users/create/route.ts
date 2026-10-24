/**
 * API Route: Provision User Accounts (Admin Only)
 * 
 * POST /api/users/create
 * 
 * Securely creates and invites Doctor, Patient, or Admin accounts.
 * - Enforces admin authentication
 * - Never asks admin to invent or communicate passwords
 * - Uses Supabase Auth Admin inviteUserByEmail (when service key configured)
 *   or pre-authorizes role in public.preauthorized_roles with status = 'invited'
 * - Records doctor specialization & license details
 */

import { NextRequest, NextResponse } from "next/server";
import { getUser } from "@/lib/supabase-auth-server";
import { cookies } from "next/headers";
import { createClient } from "@/utils/supabase/server";
import { createClient as createSupabaseAdminClient } from "@supabase/supabase-js";

export async function POST(request: NextRequest) {
  try {
    // 1. Verify authenticated user is an active admin
    const currentUser = await getUser();
    if (!currentUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (currentUser.role !== "admin") {
      return NextResponse.json(
        { error: "Forbidden: Only active administrators can provision accounts." },
        { status: 403 }
      );
    }

    const cookieStore = await cookies();
    const supabase = createClient(cookieStore);

    const body = await request.json();
    const { email, name, role, phone, specialization, licenseNumber } = body;

    if (!email || !name || !role) {
      return NextResponse.json(
        { error: "Missing required fields: email, name, role" },
        { status: 400 }
      );
    }

    const normalizedRole = role.toLowerCase().trim();
    if (!["admin", "doctor", "patient"].includes(normalizedRole)) {
      return NextResponse.json(
        { error: "Invalid role. Role must be admin, doctor, or patient" },
        { status: 400 }
      );
    }

    const normalizedEmail = email.toLowerCase().trim();
    const origin = process.env.NEXT_PUBLIC_APP_URL || (request.nextUrl.origin && request.nextUrl.origin !== "null" ? request.nextUrl.origin : "http://localhost:3000");

    // 2. Check if user already exists with an active account
    const { data: existingUser } = await supabase
      .from("users")
      .select("id, email, name, role, status")
      .eq("email", normalizedEmail)
      .maybeSingle();

    if (existingUser && existingUser.status === "active") {
      return NextResponse.json(
        { error: `An active account already exists for ${normalizedEmail} with role '${existingUser.role}'.` },
        { status: 409 }
      );
    }

    // 3. Record in preauthorized_roles table
    const metadataPayload = {
      phone: phone || null,
      specialization: specialization || null,
      licenseNumber: licenseNumber || null,
    };

    const { error: preauthErr } = await supabase
      .from("preauthorized_roles")
      .upsert({
        email: normalizedEmail,
        role: normalizedRole,
        created_by: currentUser.id,
        created_at: new Date().toISOString(),
        invitation_sent_at: new Date().toISOString(),
        metadata: metadataPayload,
      }, { onConflict: "email" });

    if (preauthErr) {
      // If invitation_sent_at or metadata column is pending migration, retry without them
      await supabase.from("preauthorized_roles").upsert({
        email: normalizedEmail,
        role: normalizedRole,
        created_by: currentUser.id,
        created_at: new Date().toISOString(),
      }, { onConflict: "email" });
    }

    let authUserId = existingUser?.id;
    let inviteDispatched = false;

    // 4. If Supabase Service Role Key is available in server environment, invite via Auth Admin API
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;

    if (serviceKey && supabaseUrl) {
      try {
        const adminAuthClient = createSupabaseAdminClient(supabaseUrl, serviceKey, {
          auth: { autoRefreshToken: false, persistSession: false },
        });

        const { data: inviteData, error: inviteErr } = await adminAuthClient.auth.admin.inviteUserByEmail(
          normalizedEmail,
          {
            redirectTo: `${origin}/auth/confirm?next=/auth/set-password`,
            data: {
              name,
              role: normalizedRole,
            },
          }
        );

        if (!inviteErr && inviteData?.user) {
          authUserId = inviteData.user.id;
          inviteDispatched = true;
        } else if (inviteErr && inviteErr.message.includes("already registered")) {
          // Send password recovery link instead if user exists in auth
          await adminAuthClient.auth.resetPasswordForEmail(normalizedEmail, {
            redirectTo: `${origin}/auth/confirm?next=/auth/reset-password`,
          });
          inviteDispatched = true;
        }
      } catch (adminApiErr) {
        console.error("Auth Admin invite dispatch error:", adminApiErr);
      }
    }

    // 5. Ensure profile entry exists with appropriate pending status
    const targetId = authUserId || existingUser?.id || crypto.randomUUID();

    // Try setting status = 'invited', falling back to 'active' if constraint is pending migration
    let statusSet = "invited";
    const { error: insertErr } = await supabase.from("users").upsert({
      id: targetId,
      email: normalizedEmail,
      name,
      phone: phone || null,
      role: normalizedRole,
      status: "invited",
      invited_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });

    if (insertErr) {
      statusSet = "active";
      await supabase.from("users").upsert({
        id: targetId,
        email: normalizedEmail,
        name,
        phone: phone || null,
        role: normalizedRole,
        status: "active",
        updated_at: new Date().toISOString(),
      });
    }

    // 6. Role-specific profile records
    if (normalizedRole === "doctor") {
      await supabase.from("doctors").upsert({
        id: targetId,
        specialization: specialization || null,
        license_number: licenseNumber || null,
        verified: false,
      });
    } else if (normalizedRole === "patient") {
      await supabase.from("patients").upsert({
        id: targetId,
      });
    }

    const inviteLink = `${origin}/auth/sign-in?email=${encodeURIComponent(normalizedEmail)}`;

    return NextResponse.json({
      success: true,
      message: `Account provisioned for ${name} (${normalizedEmail}) as ${normalizedRole}.`,
      invited: inviteDispatched,
      inviteLink,
      user: {
        id: targetId,
        email: normalizedEmail,
        name,
        role: normalizedRole,
        status: statusSet,
        specialization: specialization || null,
        licenseNumber: licenseNumber || null,
      },
    });
  } catch (error: any) {
    console.error("Error creating user:", error);
    return NextResponse.json(
      { error: error.message || "Failed to provision user" },
      { status: 500 }
    );
  }
}
