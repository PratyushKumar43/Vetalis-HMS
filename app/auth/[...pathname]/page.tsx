/**
 * Supabase Auth Page
 * 
 * Secure sign-in and sign-up with password visibility toggle,
 * Google OAuth, deactivated account handling, and role-based redirects.
 */

"use client";

import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useState, useEffect } from "react";
import { Eye, EyeOff, Mail, Lock, User, Shield, Stethoscope, Heart, Activity, AlertCircle } from "lucide-react";
import { authClient, supabaseClient } from "@/lib/supabase-auth";
import { toast } from "sonner";
import Link from "next/link";

export default function AuthPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = params?.pathname as string[] | undefined;
  const authPath = pathname?.[0] || "sign-in";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [oauthLoading, setOauthLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const urlError = searchParams?.get("error");

  useEffect(() => {
    if (urlError === "account_deactivated") {
      setError("This account has been deactivated. Please contact your system administrator.");
    } else if (searchParams?.get("password_updated") === "true") {
      setSuccess("Your password has been updated. Please sign in with your new credentials.");
    } else if (searchParams?.get("verified") === "true") {
      setSuccess("Your email has been verified. Please sign in to continue.");
    }
  }, [urlError, searchParams]);

  const handleGoogleSignIn = async () => {
    setOauthLoading(true);
    setError("");
    setSuccess("");

    try {
      const redirectUri = `${window.location.origin}/auth/callback`;
      const { error } = await supabaseClient.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: redirectUri,
          queryParams: {
            prompt: "select_account",
          },
        },
      });
      if (error) throw error;
    } catch (err: any) {
      console.error("Google OAuth error:", err);
      setError(err.message || "Failed to sign in with Google.");
      setOauthLoading(false);
    }
  };

  const redirectUserByRole = async (userId: string) => {
    try {
      const { data: profile } = await supabaseClient
        .from("users")
        .select("role, status")
        .eq("id", userId)
        .single();

      if (profile?.status !== "active") {
        await authClient.signOut();
        setError("This account has been deactivated. Please contact your administrator.");
        return;
      }

      const role = profile?.role || "patient";
      if (role === "admin") {
        router.push("/admin");
      } else if (role === "doctor") {
        router.push("/doctor");
      } else {
        router.push("/patient");
      }
      router.refresh();
    } catch (err) {
      router.push("/patient");
      router.refresh();
    }
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccess("");

    try {
      const result = await authClient.signIn.email({
        email: email.trim(),
        password,
      });

      const user = result?.user;

      if (user?.id) {
        toast.success("Welcome back!", {
          description: "Signed in successfully.",
        });
        setSuccess("Sign in successful! Redirecting to your dashboard...");
        await redirectUserByRole(user.id);
      } else {
        setError("Invalid email or password.");
      }
    } catch (err: any) {
      console.error("Sign in error:", err);
      const msg = err.message || "Failed to sign in. Please verify your credentials.";
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccess("");

    if (password.length < 8) {
      setError("Password must be at least 8 characters long.");
      setLoading(false);
      return;
    }

    try {
      // Public sign-up strictly creates patient accounts
      const result = await authClient.signUp.email({
        email: email.trim(),
        password,
        name: name.trim(),
      });

      const user = result?.user;

      if (user?.id) {
        toast.success("Account created successfully!", {
          description: "Welcome to Vetalis Healthcare.",
        });
        setSuccess("Account created successfully! Redirecting...");
        setTimeout(() => {
          router.push("/patient");
          router.refresh();
        }, 800);
      } else {
        setError("Failed to create account. Please try again.");
      }
    } catch (err: any) {
      console.error("Sign up error:", err);
      const msg = err.message || "Failed to sign up. Please try again.";
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const isLoading = loading || oauthLoading;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-teal-50/30 to-slate-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl border border-slate-200/80 p-8">
        {/* Brand Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-teal-50 border border-teal-200/50 text-teal-600 mb-4 shadow-sm">
            <Activity className="w-8 h-8 stroke-[2.5]" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            {authPath === "sign-in" ? "Sign in to Vetalis" : "Create Patient Account"}
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            {authPath === "sign-in"
              ? "Access your healthcare management dashboard"
              : "Register as a patient to manage your health records"}
          </p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm flex items-start gap-3">
            <AlertCircle className="w-5 h-5 flex-shrink-0 text-red-600 mt-0.5" />
            <div className="flex-1 font-medium">{error}</div>
          </div>
        )}

        {success && (
          <div className="mb-6 p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-700 text-sm flex items-start gap-3">
            <Activity className="w-5 h-5 flex-shrink-0 text-emerald-600 mt-0.5" />
            <div className="flex-1 font-medium">{success}</div>
          </div>
        )}

        {/* Public Signup Notice */}
        {authPath === "sign-up" && (
          <div className="mb-6 p-3 bg-teal-50/70 border border-teal-200/60 rounded-xl text-xs text-teal-800 flex items-center gap-2">
            <Heart className="w-4 h-4 text-teal-600 flex-shrink-0" />
            <span>Public registration creates a patient profile. Staff accounts must be provisioned by a clinic administrator.</span>
          </div>
        )}

        <form onSubmit={authPath === "sign-in" ? handleSignIn : handleSignUp} className="space-y-4">
          {authPath === "sign-up" && (
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                Full Name
              </label>
              <div className="relative">
                <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Jane Doe"
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500 transition-all"
                />
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
              Email Address
            </label>
            <div className="relative">
              <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@example.com"
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500 transition-all"
              />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">
                Password
              </label>
              {authPath === "sign-in" && (
                <Link
                  href="/auth/forgot-password"
                  className="text-xs text-teal-600 hover:text-teal-700 font-semibold transition-colors"
                >
                  Forgot password?
                </Link>
              )}
            </div>
            <div className="relative">
              <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type={showPassword ? "text" : "password"}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={authPath === "sign-up" ? "Minimum 8 characters" : "••••••••"}
                className="w-full pl-10 pr-11 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500 transition-all"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 focus:outline-none"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full mt-2 py-3 bg-teal-600 text-white rounded-xl font-semibold text-sm hover:bg-teal-700 active:scale-[0.99] transition-all disabled:opacity-50 disabled:pointer-events-none shadow-sm shadow-teal-600/20"
          >
            {isLoading ? (
              <span className="inline-flex items-center gap-2">
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Processing...
              </span>
            ) : authPath === "sign-in" ? (
              "Sign In"
            ) : (
              "Create Account"
            )}
          </button>
        </form>

        <div className="relative my-6">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-slate-200" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-white px-3 text-slate-400 font-medium">Or continue with</span>
          </div>
        </div>

        <button
          type="button"
          onClick={handleGoogleSignIn}
          disabled={isLoading}
          className="w-full py-2.5 px-4 border border-slate-200 bg-white hover:bg-slate-50 rounded-xl font-medium text-slate-700 text-sm transition-all flex items-center justify-center gap-3 disabled:opacity-50"
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24">
            <path
              fill="#4285F4"
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            />
            <path
              fill="#34A853"
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            />
            <path
              fill="#FBBC05"
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
            />
            <path
              fill="#EA4335"
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
            />
          </svg>
          Google
        </button>

        {/* Toggle between Sign In and Sign Up */}
        <div className="mt-8 text-center text-xs text-slate-500">
          {authPath === "sign-in" ? (
            <p>
              Don't have an account?{" "}
              <Link href="/auth/sign-up" className="text-teal-600 font-semibold hover:underline">
                Sign up as Patient
              </Link>
            </p>
          ) : (
            <p>
              Already have an account?{" "}
              <Link href="/auth/sign-in" className="text-teal-600 font-semibold hover:underline">
                Sign in
              </Link>
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
