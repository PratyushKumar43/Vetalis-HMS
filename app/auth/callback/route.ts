import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { cookies } from 'next/headers';
import { supabase as adminSupabase } from '@/lib/db';

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const next = searchParams.get('next') ?? '/dashboard';

  if (code) {
    const cookieStore = await cookies();
    const supabase = createClient(cookieStore);
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error && data.user) {
      const response = NextResponse.redirect(`${origin}${next}`);
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

      // Sync user to database, preserving their pre-registered role
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
        console.error('Error syncing OAuth user to DB:', syncError);
      }

      return response;
    }
  }

  return NextResponse.redirect(`${origin}/auth/sign-in?error=oauth_failed`);
}
