/**
 * Sign Up Page (Alternative)
 * 
 * Redirects to Neon Auth sign-up or provides custom sign-up form
 */

"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Activity } from "lucide-react";

export default function SignUpPage() {
  const router = useRouter();
  const useAuth = !!process.env.NEXT_PUBLIC_SUPABASE_URL;

  useEffect(() => {
    // If Supabase Auth is configured, redirect to Custom sign-up
    if (useAuth) {
      router.push("/auth/sign-up");
    }
  }, [useAuth, router]);

  // If Auth is not configured, show custom sign-up form
  if (!useAuth) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-teal-50 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <Link href="/" className="inline-flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-lg border border-teal-600/20 flex items-center justify-center text-teal-600 bg-teal-50/50 shadow-sm">
                <Activity className="w-6 h-6 stroke-[2.5]" />
              </div>
              <span className="text-2xl font-semibold tracking-tight text-slate-900">
                VITALIS <span className="text-teal-600 text-sm align-top font-bold">HMS</span>
              </span>
            </Link>
            <h1 className="text-3xl font-semibold text-slate-900 mb-2">Create Account</h1>
            <p className="text-slate-600">Sign up to access your dashboard</p>
          </div>

          <div className="bg-white rounded-xl shadow-lg border border-slate-200 p-8">
            <p className="text-center text-slate-600 mb-4">
              Custom sign-up form will be implemented here.
            </p>
            <p className="text-center text-sm text-slate-500">
              Or configure Supabase Auth to use their authentication system.
            </p>
            <div className="mt-6 text-center">
              <Link
                href="/login"
                className="text-sm text-teal-600 hover:text-teal-700 font-medium"
              >
                Already have an account? Sign in
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return null; // Will redirect to Auth
}

