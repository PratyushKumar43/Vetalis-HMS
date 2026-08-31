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
      return { user: data.user, data: { user: data.user } };
    },
  },
  signUp: {
    email: async ({
      email,
      password,
      name,
      role = "patient",
    }: {
      email: string;
      password: string;
      name?: string;
      role?: string;
    }) => {
      const { data, error } = await supabaseClient.auth.signUp({
        email,
        password,
        options: {
          data: { name, role },
        },
      });
      if (error) throw error;
      return { user: data.user, data: { user: data.user } };
    },
  },
  signOut: async () => {
    const { error } = await supabaseClient.auth.signOut();
    if (error) throw error;
  },
  getSession: async () => {
    const { data } = await supabaseClient.auth.getSession();
    return { user: data.session?.user || null };
  },
};

export async function getSession() {
  return await authClient.getSession();
}

export async function getUser() {
  const session = await getSession();
  return session.user;
}
