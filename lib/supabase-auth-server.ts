/**
 * Server-Side Auth Helpers (Supabase integration)
 */

import { cookies } from "next/headers";
import { supabase } from "./db";
import { createClient } from "@/utils/supabase/server";

// Get user from database based on session cookie or Supabase Auth session
export async function getUser() {
  try {
    const cookieStore = await cookies();
    const supabaseServer = createClient(cookieStore);
    const { data: { user: authUser } } = await supabaseServer.auth.getUser();

    if (!authUser) {
      return null;
    }

    const userId = authUser.id;

    // Get user from database using Supabase
    const { data: user } = await supabase
      .from("users")
      .select("id, email, name, phone, role, created_at")
      .eq("id", userId)
      .single();

    if (user) {
      return {
        id: user.id,
        email: user.email,
        name: user.name,
        phone: user.phone,
        role: user.role,
      };
    }

    // Fallback: If user row in 'users' table doesn't exist yet, auto-create it from authUser
    if (authUser) {
      const userRole = authUser.user_metadata?.role || "patient";
      const userName = authUser.user_metadata?.name || authUser.email?.split("@")[0] || "User";

      await supabase.from("users").upsert({
        id: authUser.id,
        email: authUser.email,
        name: userName,
        role: userRole,
      });

      if (userRole === "patient") {
        await supabase.from("patients").upsert({ id: authUser.id });
      } else if (userRole === "doctor") {
        await supabase.from("doctors").upsert({ id: authUser.id });
      }

      return {
        id: authUser.id,
        email: authUser.email,
        name: userName,
        role: userRole,
      };
    }

    return null;
  } catch (error) {
    console.error("Error getting user:", error);
    return null;
  }
}

// Get session helper
export async function getSession() {
  const user = await getUser();
  return user ? { user } : null;
}
