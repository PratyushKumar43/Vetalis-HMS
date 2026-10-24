"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Lock, Eye, EyeOff, Activity, CheckCircle2, AlertCircle, Shield } from "lucide-react";
import { supabaseClient } from "@/lib/supabase-auth";
import { toast } from "sonner";
import Link from "next/link";

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [verifyingSession, setVerifyingSession] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [currentUser, setCurrentUser] = useState<any>(null);

  useEffect(() => {
    // 1. Check if error was passed in URL query params (from Supabase or /auth/confirm)
    const urlError = searchParams.get("error_description") || searchParams.get("error");
    if (urlError) {
      setError(decodeURIComponent(urlError));
      setVerifyingSession(false);
      return;
    }

    // 2. Check if error was passed in URL hash (from implicit provider flow)
    if (typeof window !== "undefined" && window.location.hash) {
      const hashParams = new URLSearchParams(window.location.hash.substring(1));
      const hashError = hashParams.get("error_description") || hashParams.get("error");
      if (hashError) {
        setError(decodeURIComponent(hashError));
        setVerifyingSession(false);
        return;
      }
    }

    // 3. Listen for Supabase PASSWORD_RECOVERY or SIGNED_IN event
    const { data: { subscription } } = supabaseClient.auth.onAuthStateChange(
      (event, session) => {
        if (event === "PASSWORD_RECOVERY" || session?.user) {
          setCurrentUser(session?.user);
          setError("");
          setVerifyingSession(false);
        }
      }
    );

    // 4. Verify existing active session
    supabaseClient.auth.getUser().then(({ data: { user }, error: authErr }) => {
      if (user) {
        setCurrentUser(user);
        setError("");
        setVerifyingSession(false);
      } else {
        // Small buffer to allow hash fragment token processing if arriving via redirect
        setTimeout(async () => {
          const { data: { user: retryUser } } = await supabaseClient.auth.getUser();
          if (retryUser) {
            setCurrentUser(retryUser);
            setError("");
          } else if (!urlError) {
            setError("No active password recovery session detected. Your reset link may have expired or already been used. Please request a new link.");
          }
          setVerifyingSession(false);
        }, 500);
      }
    }).catch((err: any) => {
      setError(err.message || "Failed to verify recovery session.");
      setVerifyingSession(false);
    });

    return () => {
      subscription?.unsubscribe();
    };
  }, [searchParams]);

  // Validation rules
  const hasMinLength = password.length >= 8;
  const hasUpper = /[A-Z]/.test(password);
  const hasLower = /[a-z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  const hasSpecial = /[^A-Za-z0-9]/.test(password);
  const passwordsMatch = password.length > 0 && password === confirmPassword;
  const isValid = hasMinLength && hasUpper && hasLower && hasNumber && hasSpecial && passwordsMatch;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!isValid) {
      setError("Please ensure your new password satisfies all requirements.");
      return;
    }

    setLoading(true);

    try {
      const { data, error: updateErr } = await supabaseClient.auth.updateUser({
        password,
      });

      if (updateErr) throw updateErr;

      toast.success("Password updated successfully!", {
        description: "You can now log in using your new credentials.",
      });

      setSuccess("Your password has been changed successfully. Redirecting to sign in...");

      // Cleanly sign out session so user logs in with new password
      await supabaseClient.auth.signOut();

      setTimeout(() => {
        router.push("/auth/sign-in?password_updated=true");
        router.refresh();
      }, 1500);
    } catch (err: any) {
      console.error("Password reset update error:", err);
      const msg = err.message || "Failed to update password. Please try again.";
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  if (verifyingSession) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="text-center">
          <div className="w-8 h-8 border-3 border-teal-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-sm text-slate-500 font-medium">Verifying reset credentials...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-teal-50/25 to-slate-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl border border-slate-200/80 p-8">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-teal-50 border border-teal-200/50 text-teal-600 mb-4 shadow-sm">
            <Lock className="w-8 h-8 stroke-[2.2]" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Reset Password</h1>
          <p className="text-sm text-slate-500 mt-1">
            {currentUser?.email ? (
              <>Choose a new password for <span className="font-semibold text-slate-700">{currentUser.email}</span></>
            ) : (
              "Enter your new account password"
            )}
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
            <CheckCircle2 className="w-5 h-5 flex-shrink-0 text-emerald-600 mt-0.5" />
            <div className="flex-1 font-medium">{success}</div>
          </div>
        )}

        {currentUser && !success && (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                New Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
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

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                Confirm New Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500 transition-all"
                />
              </div>
            </div>

            {/* Checklist */}
            <div className="p-3.5 bg-slate-50/90 border border-slate-200/80 rounded-xl space-y-1.5 text-xs">
              <span className="font-semibold text-slate-700 block mb-1">Password Requirements:</span>
              <div className={`flex items-center gap-2 ${hasMinLength ? "text-emerald-700" : "text-slate-500"}`}>
                <span className={`w-1.5 h-1.5 rounded-full ${hasMinLength ? "bg-emerald-600" : "bg-slate-300"}`} />
                <span>At least 8 characters</span>
              </div>
              <div className={`flex items-center gap-2 ${hasUpper ? "text-emerald-700" : "text-slate-500"}`}>
                <span className={`w-1.5 h-1.5 rounded-full ${hasUpper ? "bg-emerald-600" : "bg-slate-300"}`} />
                <span>At least 1 uppercase letter</span>
              </div>
              <div className={`flex items-center gap-2 ${hasLower ? "text-emerald-700" : "text-slate-500"}`}>
                <span className={`w-1.5 h-1.5 rounded-full ${hasLower ? "bg-emerald-600" : "bg-slate-300"}`} />
                <span>At least 1 lowercase letter</span>
              </div>
              <div className={`flex items-center gap-2 ${hasNumber ? "text-emerald-700" : "text-slate-500"}`}>
                <span className={`w-1.5 h-1.5 rounded-full ${hasNumber ? "bg-emerald-600" : "bg-slate-300"}`} />
                <span>At least 1 number</span>
              </div>
              <div className={`flex items-center gap-2 ${hasSpecial ? "text-emerald-700" : "text-slate-500"}`}>
                <span className={`w-1.5 h-1.5 rounded-full ${hasSpecial ? "bg-emerald-600" : "bg-slate-300"}`} />
                <span>At least 1 special character</span>
              </div>
              <div className={`flex items-center gap-2 ${passwordsMatch ? "text-emerald-700" : "text-slate-500"}`}>
                <span className={`w-1.5 h-1.5 rounded-full ${passwordsMatch ? "bg-emerald-600" : "bg-slate-300"}`} />
                <span>Passwords match</span>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading || !isValid}
              className="w-full mt-2 py-3 bg-teal-600 text-white rounded-xl font-semibold text-sm hover:bg-teal-700 active:scale-[0.99] transition-all disabled:opacity-50 disabled:pointer-events-none shadow-sm shadow-teal-600/20"
            >
              {loading ? (
                <span className="inline-flex items-center gap-2">
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Updating Password...
                </span>
              ) : (
                "Update Password"
              )}
            </button>
          </form>
        )}

        {(!currentUser || error) && (
          <div className="mt-6 flex flex-col gap-2">
            <Link
              href="/auth/forgot-password"
              className="w-full py-2.5 px-4 bg-teal-600 text-white text-center rounded-xl text-xs font-semibold hover:bg-teal-700 transition-colors"
            >
              Request New Recovery Link
            </Link>
            <Link
              href="/auth/sign-in"
              className="w-full py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 text-center rounded-xl text-xs font-semibold transition-colors"
            >
              Back to Sign In
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
          <div className="text-center">
            <div className="w-8 h-8 border-3 border-teal-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            <p className="text-sm text-slate-500 font-medium">Verifying reset credentials...</p>
          </div>
        </div>
      }
    >
      <ResetPasswordForm />
    </Suspense>
  );
}
