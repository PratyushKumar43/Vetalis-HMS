/**
 * Middleware for Route Protection, Account Lifecycle, and RBAC Enforcement (Supabase SSR)
 */

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { updateSession } from "@/utils/supabase/middleware";

export async function middleware(request: NextRequest) {
  const { supabaseResponse, user, supabase } = await updateSession(request);
  const pathname = request.nextUrl.pathname;

  // Pages meant only for unauthenticated guests (redirect active users to dashboard)
  const isGuestAuthPage = 
    pathname === "/login" ||
    pathname === "/signup" ||
    pathname.startsWith("/auth/sign-in") ||
    pathname.startsWith("/auth/sign-up");

  // Onboarding & recovery pages (must be accessible even when session is active)
  const isOnboardingOrRecoveryPage =
    pathname.startsWith("/auth/set-password") ||
    pathname.startsWith("/auth/reset-password") ||
    pathname.startsWith("/auth/forgot-password");

  const isPublicRoute = 
    pathname === "/" ||
    pathname.startsWith("/auth/callback") ||
    pathname.startsWith("/auth/confirm") ||
    pathname.startsWith("/api/auth/") ||
    isOnboardingOrRecoveryPage;

  const userId = user?.id;

  // 1. Unauthenticated access handling
  if (!userId) {
    // If accessing protected routes without session, redirect to sign-in
    if (
      pathname.startsWith("/admin") ||
      pathname.startsWith("/doctor") ||
      pathname.startsWith("/patient") ||
      pathname.startsWith("/dashboard") ||
      pathname.startsWith("/account")
    ) {
      const redirectUrl = new URL("/auth/sign-in", request.url);
      redirectUrl.searchParams.set("next", pathname);
      return NextResponse.redirect(redirectUrl);
    }

    // Protect non-public API routes
    if (pathname.startsWith("/api") && !isPublicRoute) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    return supabaseResponse;
  }

  // 2. User is authenticated - retrieve verified profile and lifecycle status
  let userRole: "admin" | "doctor" | "patient" = "patient";
  let userStatus: string = "active";

  try {
    const { data: profile } = await supabase
      .from("users")
      .select("role, status")
      .eq("id", userId)
      .single();

    if (profile) {
      userRole = (profile.role as "admin" | "doctor" | "patient") || "patient";
      userStatus = profile.status || "active";
    }
  } catch (err) {
    console.error("Middleware profile lookup error:", err);
  }

  // 3. Handle Deactivated / Suspended Accounts
  if (userStatus === "deactivated" || userStatus === "suspended") {
    if (!pathname.startsWith("/auth/sign-in")) {
      const deactUrl = new URL("/auth/sign-in", request.url);
      deactUrl.searchParams.set("error", "account_deactivated");
      return NextResponse.redirect(deactUrl);
    }
    return supabaseResponse;
  }

  // 4. Handle Pending Invitation / Password Setup Onboarding State
  if (userStatus === "invited") {
    if (
      !pathname.startsWith("/auth/set-password") &&
      !pathname.startsWith("/auth/reset-password") &&
      !pathname.startsWith("/api/")
    ) {
      return NextResponse.redirect(new URL("/auth/set-password", request.url));
    }
    return supabaseResponse;
  }

  const roleDashboard = `/${userRole}`;

  // 5. Redirect active authenticated users away from guest pages (sign-in, sign-up)
  if (isGuestAuthPage) {
    return NextResponse.redirect(new URL(roleDashboard, request.url));
  }

  // 6. Redirect generic /dashboard to role-specific dashboard
  if (pathname === "/dashboard") {
    return NextResponse.redirect(new URL(roleDashboard, request.url));
  }

  // 7. Role-Based Access Control (RBAC) Route Guards
  if (pathname.startsWith("/admin") && userRole !== "admin") {
    return NextResponse.redirect(new URL(roleDashboard, request.url));
  }

  if (pathname.startsWith("/doctor") && userRole !== "doctor") {
    return NextResponse.redirect(new URL(roleDashboard, request.url));
  }

  if (pathname.startsWith("/patient") && userRole !== "patient") {
    return NextResponse.redirect(new URL(roleDashboard, request.url));
  }

  // Sub-dashboard routes (/dashboard/admin, etc.)
  if (pathname.startsWith("/dashboard/admin") && userRole !== "admin") {
    return NextResponse.redirect(new URL(roleDashboard, request.url));
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
