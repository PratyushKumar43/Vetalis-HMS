/**
 * Server-Side Auth Helpers (Supabase integration)
 */

import { cookies } from "next/headers";
import { createClient } from "@/utils/supabase/server";

export interface AuthenticatedUser {
  id: string;
  email: string;
  name: string;
  phone?: string | null;
  role: "admin" | "doctor" | "patient";
  status: "invited" | "pending_verification" | "active" | "deactivated" | "suspended";
}

// Get verified user from database based on authenticated Supabase Auth session
export async function getUser(): Promise<AuthenticatedUser | null> {
  try {
    const cookieStore = await cookies();
    const supabaseServer = createClient(cookieStore);
    const { data: { user: authUser }, error: authError } = await supabaseServer.auth.getUser();

    if (authError || !authUser) {
      return null;
    }

    const userId = authUser.id;

    // Get verified user profile from database using authenticated server client
    const { data: userProfile, error: profileError } = await supabaseServer
      .from("users")
      .select("id, email, name, phone, role, status")
      .eq("id", userId)
      .single();

    if (userProfile) {
      // If user had an unclaimed preauthorized role, claim it now
      try {
        const { data: preauth } = await supabaseServer
          .from("preauthorized_roles")
          .select("id, role, metadata")
          .eq("email", (userProfile.email || authUser.email || "").toLowerCase())
          .is("claimed_at", null)
          .maybeSingle();

        if (preauth?.id) {
          await supabaseServer
            .from("preauthorized_roles")
            .update({ claimed_at: new Date().toISOString() })
            .eq("id", preauth.id);
        }
      } catch (claimErr) {
        // Silently continue if preauthorized_roles check fails
      }

      return {
        id: userProfile.id,
        email: userProfile.email || authUser.email || "",
        name: userProfile.name || authUser.email?.split("@")[0] || "User",
        phone: userProfile.phone || null,
        role: (userProfile.role as "admin" | "doctor" | "patient") || "patient",
        status: (userProfile.status as "invited" | "pending_verification" | "active" | "deactivated" | "suspended") || "active",
      };
    }

    // Fallback: If user profile record in 'public.users' doesn't exist yet,
    // safely create a profile. Public signup always strictly defaults to 'patient'.
    // Only pre-authorized administrative invites can assign doctor or admin.
    let assignedRole: "admin" | "doctor" | "patient" = "patient";
    
    // Check pre-authorized roles table
    const { data: preauth } = await supabaseServer
      .from("preauthorized_roles")
      .select("role")
      .eq("email", authUser.email?.toLowerCase())
      .is("claimed_at", null)
      .maybeSingle();

    if (preauth?.role && ["admin", "doctor", "patient"].includes(preauth.role)) {
      assignedRole = preauth.role as "admin" | "doctor" | "patient";
      await supabaseServer
        .from("preauthorized_roles")
        .update({ claimed_at: new Date().toISOString() })
        .eq("email", authUser.email?.toLowerCase());
    }

    const userName = authUser.user_metadata?.name || authUser.email?.split("@")[0] || "User";

    await supabaseServer.from("users").upsert({
      id: authUser.id,
      email: authUser.email,
      name: userName,
      role: assignedRole,
      status: "active",
      email_verified: !!authUser.email_confirmed_at,
    });

    if (assignedRole === "patient") {
      await supabaseServer.from("patients").upsert({ id: authUser.id });
    } else if (assignedRole === "doctor") {
      await supabaseServer.from("doctors").upsert({ id: authUser.id, verified: false });
    }

    return {
      id: authUser.id,
      email: authUser.email || "",
      name: userName,
      role: assignedRole,
      status: "active",
    };
  } catch (error) {
    console.error("Error in getUser:", error);
    return null;
  }
}

// Get session helper
export async function getSession() {
  const user = await getUser();
  return user ? { user } : null;
}
