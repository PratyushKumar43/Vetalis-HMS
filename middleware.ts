/**
 * Middleware for Route Protection (Supabase integrated)
 */

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { supabase } from "@/lib/db";
import { updateSession } from "@/utils/supabase/middleware";

export async function middleware(request: NextRequest) {
  const { supabaseResponse, user } = await updateSession(request);

  // Public routes
  const publicRoutes = ["/", "/login", "/signup"];
  const isPublicRoute = publicRoutes.some((route) =>
    request.nextUrl.pathname === route || 
    request.nextUrl.pathname.startsWith("/auth/") ||
    request.nextUrl.pathname.startsWith("/account/")
  );

  if (isPublicRoute) {
    return supabaseResponse;
  }

  const userId = user?.id;

  // Protect dashboard routes
  if (request.nextUrl.pathname.startsWith("/dashboard")) {
    if (!userId) {
      return NextResponse.redirect(new URL("/auth/sign-in", request.url));
    }

    // Check user role from database for admin routes
    if (request.nextUrl.pathname.startsWith("/dashboard/admin")) {
      try {
        const { data: user } = await supabase
          .from("users")
          .select("role")
          .eq("id", userId)
          .single();
        
        if (!user || user.role !== "admin") {
          return NextResponse.redirect(new URL("/dashboard", request.url));
        }
      } catch (error) {
        console.error("Error checking user role:", error);
        return NextResponse.redirect(new URL("/auth/sign-in", request.url));
      }
    }
  }

  // Protect API routes (except auth endpoints)
  if (request.nextUrl.pathname.startsWith("/api") && 
      !request.nextUrl.pathname.startsWith("/api/auth")) {
    if (!userId) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/api/:path*",
  ],
};
