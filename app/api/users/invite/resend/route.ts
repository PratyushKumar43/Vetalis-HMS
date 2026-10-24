/**
 * API Route: Resend Invitation (Admin Only)
 * 
 * POST /api/users/invite/resend
 * 
 * Securely resends invitation or password recovery email for pending accounts.
 */

import { NextRequest, NextResponse } from "next/server";
import { getUser } from "@/lib/supabase-auth-server";
import { cookies } from "next/headers";
import { createClient } from "@/utils/supabase/server";
import { createClient as createSupabaseAdminClient } from "@supabase/supabase-js";

export async function POST(request: NextRequest) {
  try {
    const currentUser = await getUser();
    if (!currentUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (currentUser.role !== "admin") {
      return NextResponse.json(
        { error: "Forbidden: Only active administrators can resend invitations." },
        { status: 403 }
      );
    }

    const cookieStore = await cookies();
    const supabase = createClient(cookieStore);

    const body = await request.json();
    const { userId, email } = body;

    if (!userId && !email) {
      return NextResponse.json(
        { error: "userId or email is required." },
        { status: 400 }
      );
    }

    // Lookup user in public.users
    let userQuery = supabase.from("users").select("id, email, name, role, status");
    if (userId) {
      userQuery = userQuery.eq("id", userId);
    } else {
      userQuery = userQuery.eq("email", email.toLowerCase().trim());
    }

    const { data: targetUser, error: findErr } = await userQuery.maybeSingle();

    if (findErr || !targetUser) {
      return NextResponse.json({ error: "User not found." }, { status: 404 });
    }

    if (targetUser.status === "deactivated" || targetUser.status === "suspended") {
      return NextResponse.json(
        { error: "Cannot send invitations to deactivated or suspended accounts." },
        { status: 400 }
      );
    }

    const targetEmail = targetUser.email.toLowerCase().trim();
    const origin = process.env.NEXT_PUBLIC_APP_URL || (request.nextUrl.origin && request.nextUrl.origin !== "null" ? request.nextUrl.origin : "http://localhost:3000");

    // 1. Update preauthorized_roles timestamp
    await supabase
      .from("preauthorized_roles")
      .upsert({
        email: targetEmail,
        role: targetUser.role,
        invitation_sent_at: new Date().toISOString(),
        created_by: currentUser.id,
      }, { onConflict: "email" });

    // 2. Update invited_at timestamp in public.users
    await supabase
      .from("users")
      .update({
        invited_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", targetUser.id);

    // 3. Dispatch Supabase Auth Admin Invitation if service role key configured
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    let emailDispatched = false;

    if (serviceKey && supabaseUrl) {
      try {
        const adminClient = createSupabaseAdminClient(supabaseUrl, serviceKey, {
          auth: { autoRefreshToken: false, persistSession: false },
        });

        const { error: inviteErr } = await adminClient.auth.admin.inviteUserByEmail(
          targetEmail,
          {
            redirectTo: `${origin}/auth/confirm?next=/auth/set-password`,
            data: {
              name: targetUser.name,
              role: targetUser.role,
            },
          }
        );

        if (!inviteErr) {
          emailDispatched = true;
        } else if (inviteErr.message.includes("already registered")) {
          // If already registered in auth, trigger password recovery link
          await adminClient.auth.resetPasswordForEmail(targetEmail, {
            redirectTo: `${origin}/auth/confirm?next=/auth/reset-password`,
          });
          emailDispatched = true;
        }
      } catch (adminErr) {
        console.error("Admin Auth email dispatch error:", adminErr);
      }
    }

    const setupLink = `${origin}/auth/sign-in?email=${encodeURIComponent(targetEmail)}`;

    return NextResponse.json({
      success: true,
      message: emailDispatched
        ? `Invitation email resent to ${targetEmail}.`
        : `Invitation refreshed for ${targetEmail}.`,
      emailDispatched,
      setupLink,
    });
  } catch (error: any) {
    console.error("Resend invitation error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to resend invitation" },
      { status: 500 }
    );
  }
}
