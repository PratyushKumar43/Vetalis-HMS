"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Lock, Eye, EyeOff, Activity, CheckCircle2, AlertCircle, ShieldCheck } from "lucide-react";
import { supabaseClient } from "@/lib/supabase-auth";
import { toast } from "sonner";

export default function SetPasswordPage() {
  const router = useRouter();

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [verifyingSession, setVerifyingSession] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [currentUser, setCurrentUser] = useState<any>(null);

  useEffect(() => {
    async function checkSession() {
      try {
        const { data: { user }, error: authErr } = await supabaseClient.auth.getUser();
        if (authErr || !user) {
          setError("No active setup session found. Please open the link from your invitation email, or request a new invitation from your administrator.");
          setVerifyingSession(false);
          return;
        }

        setCurrentUser(user);
      } catch (err: any) {
        setError(err.message || "Failed to verify session.");
      } finally {
        setVerifyingSession(false);
      }
    }

    checkSession();
  }, []);

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
      setError("Please ensure your password satisfies all security criteria.");
      return;
    }

    setLoading(true);

    try {
      // 1. Update password in Supabase Auth
      const { data, error: updateErr } = await supabaseClient.auth.updateUser({
        password,
      });

      if (updateErr) throw updateErr;

      // 2. Fetch user profile to activate status and determine dashboard
      const userId = data.user?.id || currentUser?.id;
      let role = "patient";

      if (userId) {
        const { data: profile } = await supabaseClient
          .from("users")
          .select("role, status")
          .eq("id", userId)
          .maybeSingle();

        if (profile?.role) {
          role = profile.role;
        }

        // Activate user in public.users if currently invited
        await supabaseClient
          .from("users")
          .update({
            status: "active",
            activated_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq("id", userId);
      }

      toast.success("Password configured successfully!", {
        description: "Welcome to Vetalis HMS. Redirecting to your dashboard...",
      });

      setSuccess("Account activated! Redirecting to your dashboard...");

      setTimeout(() => {
        if (role === "admin") {
          router.push("/admin");
        } else if (role === "doctor") {
          router.push("/doctor");
        } else {
          router.push("/patient");
        }
        router.refresh();
      }, 1000);
    } catch (err: any) {
      console.error("Set password error:", err);
      const msg = err.message || "Failed to set password. Please try again.";
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
          <p className="text-sm text-slate-500 font-medium">Validating invitation credentials...</p>
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
            <ShieldCheck className="w-8 h-8 stroke-[2.2]" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Set Your Password</h1>
          <p className="text-sm text-slate-500 mt-1">
            {currentUser?.email ? (
              <>Setup secure access for <span className="font-semibold text-slate-700">{currentUser.email}</span></>
            ) : (
              "Complete your account onboarding"
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

        {currentUser && (
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
                  placeholder="Create a strong password"
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
                Confirm Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Re-enter your password"
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500 transition-all"
                />
              </div>
            </div>

            {/* Password Policy Checklist */}
            <div className="p-3.5 bg-slate-50/90 border border-slate-200/80 rounded-xl space-y-1.5 text-xs">
              <span className="font-semibold text-slate-700 block mb-1">Security Requirements:</span>
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
                  Activating Account...
                </span>
              ) : (
                "Set Password & Complete Setup"
              )}
            </button>
          </form>
        )}

        {!currentUser && (
          <div className="mt-6 text-center">
            <a
              href="/auth/sign-in"
              className="inline-flex items-center justify-center px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition-colors"
            >
              Return to Sign In
            </a>
          </div>
        )}
      </div>
    </div>
  );
}
