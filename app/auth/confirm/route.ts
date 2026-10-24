/**
 * Supabase Auth OTP / Email Token Confirmation Handler
 * 
 * Handles:
 * - type='invite': Redirects to /auth/set-password for first-time password setup
 * - type='recovery': Redirects to /auth/reset-password for password reset
 * - type='signup' | 'email': Verifies email and establishes session
 */

import { type EmailOtpType } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { cookies } from 'next/headers';

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const token_hash = searchParams.get('token_hash');
  const type = searchParams.get('type') as EmailOtpType | null;
  const nextParam = searchParams.get('next');
  const errorParam = searchParams.get('error');
  const errorDesc = searchParams.get('error_description') || searchParams.get('error_code');

  // 1. Forward any provider/Supabase redirect errors to target page (e.g., /auth/reset-password)
  if (errorParam || errorDesc) {
    const target = nextParam || '/auth/reset-password';
    const message = errorDesc || errorParam || 'Verification link expired or invalid';
    return NextResponse.redirect(`${origin}${target}?error=${encodeURIComponent(message)}`);
  }

  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);

  let authUser: any = null;

  // 2. Case A: PKCE Authorization Code Exchange (Default for modern Supabase recovery links)
  if (code) {
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error && data?.user) {
      authUser = data.user;
    } else {
      console.error('exchangeCodeForSession error in confirm route:', error);
      const target = nextParam || '/auth/reset-password';
      const msg = error?.message || 'Password recovery link has expired or is invalid.';
      return NextResponse.redirect(`${origin}${target}?error=${encodeURIComponent(msg)}`);
    }
  } 
  // 3. Case B: Direct Token Hash verification (Email OTP / Invite token)
  else if (token_hash && type) {
    const { data, error } = await supabase.auth.verifyOtp({
      type,
      token_hash,
    });
    if (!error && data?.user) {
      authUser = data.user;
    } else {
      console.error('verifyOtp error in confirm route:', error);
      const target = nextParam || (type === 'invite' ? '/auth/set-password' : '/auth/reset-password');
      const msg = error?.message || 'Verification token has expired or is invalid.';
      return NextResponse.redirect(`${origin}${target}?error=${encodeURIComponent(msg)}`);
    }
  }
  // 4. Case C: Client-Side Hash Fragment Passthrough (when tokens are passed via #access_token=...)
  else if (nextParam) {
    return NextResponse.redirect(`${origin}${nextParam}`);
  }

  // 5. If user session established, reconcile database profile and redirect to destination
  if (authUser) {
    const userEmail = (authUser.email || '').toLowerCase().trim();

    // Determine appropriate target destination
    let destination = nextParam;
    if (!destination) {
      if (type === 'invite') {
        destination = '/auth/set-password';
      } else if (type === 'recovery') {
        destination = '/auth/reset-password';
      } else {
        destination = '/auth/sign-in?verified=true';
      }
    }

    try {
      // Check existing user record
      const { data: existingUser } = await supabase
        .from('users')
        .select('id, role, status')
        .eq('id', authUser.id)
        .maybeSingle();

      let assignedRole: 'admin' | 'doctor' | 'patient' = existingUser?.role || 'patient';
      let metadataObj: any = {};

      // Check preauthorized_roles table
      const { data: preauth } = await supabase
        .from('preauthorized_roles')
        .select('id, role, metadata')
        .eq('email', userEmail)
        .is('claimed_at', null)
        .maybeSingle();

      if (preauth?.role) {
        assignedRole = preauth.role as 'admin' | 'doctor' | 'patient';
        metadataObj = preauth.metadata || {};
        await supabase
          .from('preauthorized_roles')
          .update({ claimed_at: new Date().toISOString() })
          .eq('id', preauth.id);
      }

      const fullName = authUser.user_metadata?.name || userEmail.split('@')[0] || 'User';
      const statusToSet = type === 'invite' ? 'active' : (existingUser?.status || 'active');

      await supabase.from('users').upsert({
        id: authUser.id,
        email: authUser.email,
        name: fullName,
        role: assignedRole,
        status: statusToSet,
        email_verified: true,
        activated_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });

      if (assignedRole === 'patient') {
        await supabase.from('patients').upsert({
          id: authUser.id,
          updated_at: new Date().toISOString(),
        });
      } else if (assignedRole === 'doctor') {
        await supabase.from('doctors').upsert({
          id: authUser.id,
          specialization: metadataObj.specialization || null,
          license_number: metadataObj.licenseNumber || null,
          verified: false,
        });
      }
    } catch (syncError) {
      console.error('Error syncing user profile on confirmation:', syncError);
    }

    return NextResponse.redirect(`${origin}${destination}`);
  }

  // Fallback if verification fails
  return NextResponse.redirect(`${origin}/auth/sign-in?error=verification_failed`);
}
