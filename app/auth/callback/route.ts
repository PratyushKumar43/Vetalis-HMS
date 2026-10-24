/**
 * OAuth Callback Handler (Google OAuth & Social Providers)
 */

import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { cookies } from 'next/headers';

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');

  if (code) {
    const cookieStore = await cookies();
    const supabase = createClient(cookieStore);

    const { data, error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error && data.user) {
      const authUser = data.user;
      const userEmail = (authUser.email || '').toLowerCase().trim();

      let assignedRole: 'admin' | 'doctor' | 'patient' = 'patient';

      try {
        // 1. Check existing record in public.users
        const { data: existingUser } = await supabase
          .from('users')
          .select('role, status')
          .eq('id', authUser.id)
          .maybeSingle();

        if (existingUser?.role) {
          assignedRole = existingUser.role as 'admin' | 'doctor' | 'patient';
        } else {
          // 2. Check preauthorized_roles
          const { data: preauth } = await supabase
            .from('preauthorized_roles')
            .select('id, role')
            .eq('email', userEmail)
            .is('claimed_at', null)
            .maybeSingle();

          if (preauth?.role) {
            assignedRole = preauth.role as 'admin' | 'doctor' | 'patient';
            await supabase
              .from('preauthorized_roles')
              .update({ claimed_at: new Date().toISOString() })
              .eq('id', preauth.id);
          }
        }

        const fullName = authUser.user_metadata?.name || userEmail.split('@')[0] || 'User';

        await supabase.from('users').upsert({
          id: authUser.id,
          email: authUser.email,
          name: fullName,
          role: assignedRole,
          status: 'active',
          email_verified: true,
          activated_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });

        if (assignedRole === 'patient') {
          await supabase.from('patients').upsert({ id: authUser.id });
        } else if (assignedRole === 'doctor') {
          await supabase.from('doctors').upsert({ id: authUser.id, verified: false });
        }
      } catch (syncError) {
        console.error('Error syncing OAuth user:', syncError);
      }

      return NextResponse.redirect(`${origin}/${assignedRole}`);
    }
  }

  return NextResponse.redirect(`${origin}/auth/sign-in?error=oauth_failed`);
}
