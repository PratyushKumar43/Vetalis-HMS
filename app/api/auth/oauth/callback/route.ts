/**
 * OAuth Callback Handler
 * 
 * Handles OAuth callbacks from providers (Google, etc.)
 * Exchanges authorization code for user information
 */

import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { code, state, provider } = body;

    if (!code || !state) {
      return NextResponse.json(
        { error: "Missing code or state parameter" },
        { status: 400 }
      );
    }

    // Exchange code for token via Neon Auth
    const authUrl = process.env.NEXT_PUBLIC_NEON_AUTH_URL;
    if (!authUrl) {
      return NextResponse.json(
        { error: "Neon Auth URL not configured" },
        { status: 500 }
      );
    }

    const appBaseUrl = process.env.NEXT_PUBLIC_APP_URL || (request.nextUrl.origin && request.nextUrl.origin !== "null" ? request.nextUrl.origin : "http://localhost:3000");

    // Exchange authorization code for access token
    const tokenResponse = await fetch(`${authUrl}/oauth/${provider}/callback`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        code,
        state,
        redirect_uri: `${appBaseUrl}/auth/sign-in`,
      }),
    });

    if (!tokenResponse.ok) {
      const errorData = await tokenResponse.json().catch(() => ({}));
      return NextResponse.json(
        { error: errorData.error || "Failed to exchange OAuth code" },
        { status: tokenResponse.status }
      );
    }

    const tokenData = await tokenResponse.json();
    
    // Get user info using the access token
    if (tokenData.access_token) {
      const userResponse = await fetch(`${authUrl}/user`, {
        headers: {
          Authorization: `Bearer ${tokenData.access_token}`,
        },
      });

      if (userResponse.ok) {
        const user = await userResponse.json();
        return NextResponse.json({
          success: true,
          user: {
            id: user.id,
            email: user.email,
            name: user.name,
          },
        });
      }
    }

    // Fallback: try to extract user from token response
    if (tokenData.user) {
      return NextResponse.json({
        success: true,
        user: tokenData.user,
      });
    }

    return NextResponse.json(
      { error: "Failed to retrieve user information" },
      { status: 500 }
    );
  } catch (error) {
    console.error("OAuth callback error:", error);
    return NextResponse.json(
      { error: "OAuth callback processing failed" },
      { status: 500 }
    );
  }
}

// GET handler for direct redirects
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const code = searchParams.get("code");
    const state = searchParams.get("state");
    const error = searchParams.get("error");

    if (error) {
      return NextResponse.redirect(new URL("/auth/sign-in?error=oauth_failed", request.url));
    }

    if (!code) {
      return NextResponse.redirect(new URL("/auth/sign-in?error=missing_code", request.url));
    }

    // Redirect back to auth page with OAuth params for client-side processing
    const redirectUrl = new URL("/auth/sign-in", request.url);
    redirectUrl.searchParams.set("code", code);
    if (state) redirectUrl.searchParams.set("state", state);

    return NextResponse.redirect(redirectUrl);
  } catch (error) {
    console.error("OAuth callback error:", error);
    return NextResponse.redirect(new URL("/auth/sign-in?error=oauth_failed", request.url));
  }
}

