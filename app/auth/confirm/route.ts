import { type EmailOtpType } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { supabase as adminSupabase } from '@/lib/db';
import { cookies } from 'next/headers';

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const token_hash = searchParams.get('token_hash');
  const type = searchParams.get('type') as EmailOtpType | null;
  const next = searchParams.get('next') ?? '/dashboard';

  if (token_hash && type) {
    const cookieStore = await cookies();
    const supabase = createClient(cookieStore);

    const { data, error } = await supabase.auth.verifyOtp({
      type,
      token_hash,
    });

    if (!error && data.user) {
      const response = NextResponse.redirect(`${origin}${next}`);
      
      // Set session cookies for legacy compatibility
      response.cookies.set('supabase-auth-user-id', data.user.id, {
        path: '/',
        maxAge: 86400,
        sameSite: 'lax',
      });
      response.cookies.set('neon-auth-user-id', data.user.id, {
        path: '/',
        maxAge: 86400,
        sameSite: 'lax',
      });

      // Sync/Verify user in database, preserving their pre-registered role
      try {
        const { data: existingUser } = await adminSupabase
          .from('users')
          .select('role')
          .eq('id', data.user.id)
          .single();

        const userRole = existingUser?.role || data.user.user_metadata?.role || 'patient';

        await adminSupabase.from('users').upsert({
          id: data.user.id,
          email: data.user.email,
          name: data.user.user_metadata?.name || data.user.email?.split('@')[0] || 'User',
          role: userRole,
        });

        if (userRole === 'patient') {
          await adminSupabase.from('patients').upsert({
            id: data.user.id,
          });
        } else if (userRole === 'doctor') {
          await adminSupabase.from('doctors').upsert({
            id: data.user.id,
            verified: false,
          });
        }
      } catch (syncError) {
        console.error('Error syncing user on confirm:', syncError);
      }

      return response;
    }
  }

  // Redirect to sign-in with error if verification fails
  return NextResponse.redirect(`${origin}/auth/sign-in?error=verification_failed`);
}
