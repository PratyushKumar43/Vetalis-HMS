"use client";

/**
 * Supabase Auth Client Integration
 */

import { createClient } from "@/utils/supabase/client";

export const supabaseClient = createClient();

export const authClient = {
  signIn: {
    email: async ({ email, password }: { email: string; password: string }) => {
      const { data, error } = await supabaseClient.auth.signInWithPassword({
        email,
        password,
      });
      if (error) throw error;
      return { user: data.user, data: { user: data.user, session: data.session } };
    },
  },
  signUp: {
    email: async ({
      email,
      password,
      name,
    }: {
      email: string;
      password: string;
      name?: string;
    }) => {
      // Public signup does NOT pass role - server and DB trigger strictly enforce 'patient' role
      const { data, error } = await supabaseClient.auth.signUp({
        email,
        password,
        options: {
          data: { name },
        },
      });
      if (error) throw error;
      return { user: data.user, data: { user: data.user, session: data.session } };
    },
  },
  signOut: async () => {
    const { error } = await supabaseClient.auth.signOut();
    if (error) console.error("SignOut error:", error);
  },
  getSession: async () => {
    const { data } = await supabaseClient.auth.getSession();
    return { user: data.session?.user || null, session: data.session };
  },
};

export async function getSession() {
  return await authClient.getSession();
}

export async function getUser() {
  const session = await getSession();
  return session.user;
}
