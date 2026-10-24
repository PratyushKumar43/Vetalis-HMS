import { createClient } from "@/utils/supabase/server";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

async function handleSignOut(request: Request) {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);

  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      await supabase.auth.signOut();
    }
  } catch (err) {
    console.error("Signout error:", err);
  }

  const response = NextResponse.redirect(new URL("/auth/sign-in", request.url), {
    status: 302,
  });

  // Prevent browser back caching of medical or clinical views
  response.headers.set("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
  response.headers.set("Pragma", "no-cache");
  response.headers.set("Expires", "0");

  return response;
}

export async function POST(request: Request) {
  return handleSignOut(request);
}

export async function GET(request: Request) {
  return handleSignOut(request);
}
