/**
 * Account Settings & Password Management
 * 
 * Allows authenticated users to view profile details and update their password.
 */

"use client";

import { useState, useEffect } from "react";
import { Lock, Eye, EyeOff, User, Mail, Shield, CheckCircle2, AlertCircle, KeyRound, Activity } from "lucide-react";
import { supabaseClient } from "@/lib/supabase-auth";
import { toast } from "sonner";
import Link from "next/link";

export default function AccountPage() {
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Change Password state
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [updatingPassword, setUpdatingPassword] = useState(false);
  const [passwordError, setPasswordError] = useState("");
  const [passwordSuccess, setPasswordSuccess] = useState("");

  useEffect(() => {
    loadUserProfile();
  }, []);

  const loadUserProfile = async () => {
    try {
      setLoading(true);
      const { data: { user: authUser }, error: authErr } = await supabaseClient.auth.getUser();

      if (authErr || !authUser) {
        setUser(null);
        return;
      }

      setUser(authUser);

      const { data: userProfile } = await supabaseClient
        .from("users")
        .select("id, name, email, phone, role, status")
        .eq("id", authUser.id)
        .single();

      if (userProfile) {
        setProfile(userProfile);
      }
    } catch (error) {
      console.error("Error loading account profile:", error);
    } finally {
      setLoading(false);
    }
  };

  const hasMinLength = newPassword.length >= 8;
  const hasUpper = /[A-Z]/.test(newPassword);
  const hasLower = /[a-z]/.test(newPassword);
  const hasNumber = /[0-9]/.test(newPassword);
  const hasSpecial = /[^A-Za-z0-9]/.test(newPassword);
  const passwordsMatch = newPassword.length > 0 && newPassword === confirmPassword;
  const isPasswordValid = hasMinLength && hasUpper && hasLower && hasNumber && hasSpecial && passwordsMatch;

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError("");
    setPasswordSuccess("");

    if (!isPasswordValid) {
      setPasswordError("Please meet all password strength requirements.");
      return;
    }

    setUpdatingPassword(true);

    try {
      const { error } = await supabaseClient.auth.updateUser({
        password: newPassword,
      });

      if (error) throw error;

      toast.success("Password updated successfully!");
      setPasswordSuccess("Your account password has been changed.");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err: any) {
      console.error("Change password error:", err);
      const msg = err.message || "Failed to update password.";
      setPasswordError(msg);
      toast.error(msg);
    } finally {
      setUpdatingPassword(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="text-center">
          <div className="w-8 h-8 border-3 border-teal-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-sm text-slate-500 font-medium">Loading account settings...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="text-center bg-white p-8 rounded-2xl border border-slate-200/80 shadow-sm max-w-sm w-full">
          <p className="text-sm text-slate-600 mb-4 font-medium">Please sign in to view your account settings.</p>
          <Link
            href="/auth/sign-in"
            className="inline-flex items-center justify-center w-full py-2.5 px-4 bg-teal-600 hover:bg-teal-700 text-white font-semibold text-xs rounded-xl transition-all"
          >
            Sign In
          </Link>
        </div>
      </div>
    );
  }

  const role = profile?.role || "patient";
  const dashboardHref = `/${role}`;

  return (
    <div className="min-h-screen bg-slate-50 py-10 px-4 sm:px-6">
      <div className="max-w-3xl mx-auto space-y-6">
        {/* Top Bar */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Account Settings</h1>
            <p className="text-xs text-slate-500 mt-1">
              Manage your personal credentials and security preferences.
            </p>
          </div>
          <Link
            href={dashboardHref}
            className="px-4 py-2 bg-white border border-slate-200/80 hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-semibold shadow-sm transition-all"
          >
            Back to Dashboard
          </Link>
        </div>

        {/* Profile Details Card */}
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-6 sm:p-8 space-y-6">
          <div className="flex items-center gap-3 pb-4 border-b border-slate-100">
            <div className="w-10 h-10 rounded-xl bg-teal-50 border border-teal-200/60 text-teal-600 flex items-center justify-center font-bold text-sm">
              {profile?.name?.charAt(0) || user.email?.charAt(0) || "U"}
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">{profile?.name || "User Profile"}</h2>
              <span className="text-xs text-slate-500 capitalize">{role} Account • Status: {profile?.status || "active"}</span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-600 uppercase mb-1.5">
                Full Name
              </label>
              <div className="relative">
                <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  readOnly
                  value={profile?.name || ""}
                  className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 uppercase mb-1.5">
                Email Address
              </label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="email"
                  readOnly
                  value={user.email || ""}
                  className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Change Password Card */}
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-6 sm:p-8 space-y-6">
          <div className="flex items-center gap-3 pb-4 border-b border-slate-100">
            <div className="p-2 rounded-xl bg-indigo-50 border border-indigo-200/60 text-indigo-600">
              <KeyRound className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">Change Password</h2>
              <p className="text-xs text-slate-500">
                Update your authentication password to secure your account.
              </p>
            </div>
          </div>

          {passwordError && (
            <div className="p-3.5 bg-red-50 border border-red-200 rounded-xl text-red-700 text-xs flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 flex-shrink-0 text-red-600 mt-0.5" />
              <span>{passwordError}</span>
            </div>
          )}

          {passwordSuccess && (
            <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs flex items-start gap-2.5">
              <CheckCircle2 className="w-4 h-4 flex-shrink-0 text-emerald-600 mt-0.5" />
              <span>{passwordSuccess}</span>
            </div>
          )}

          <form onSubmit={handleChangePassword} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase mb-1.5">
                  New Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="New password"
                    className="w-full pl-10 pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500 transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase mb-1.5">
                  Confirm New Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Re-enter new password"
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500 transition-all"
                  />
                </div>
              </div>
            </div>

            {/* Checklist */}
            <div className="p-3 bg-slate-50/80 border border-slate-200/70 rounded-xl grid grid-cols-2 sm:grid-cols-3 gap-2 text-[11px]">
              <span className={hasMinLength ? "text-emerald-700 font-medium" : "text-slate-400"}>
                • Min 8 characters
              </span>
              <span className={hasUpper ? "text-emerald-700 font-medium" : "text-slate-400"}>
                • Uppercase letter
              </span>
              <span className={hasLower ? "text-emerald-700 font-medium" : "text-slate-400"}>
                • Lowercase letter
              </span>
              <span className={hasNumber ? "text-emerald-700 font-medium" : "text-slate-400"}>
                • Number
              </span>
              <span className={hasSpecial ? "text-emerald-700 font-medium" : "text-slate-400"}>
                • Special character
              </span>
              <span className={passwordsMatch ? "text-emerald-700 font-medium" : "text-slate-400"}>
                • Passwords match
              </span>
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={updatingPassword || !isPasswordValid}
                className="px-5 py-2.5 bg-teal-600 hover:bg-teal-700 text-white font-semibold text-xs rounded-xl shadow-sm transition-all disabled:opacity-50 disabled:pointer-events-none flex items-center gap-2"
              >
                {updatingPassword ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Updating Password...
                  </>
                ) : (
                  "Update Password"
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
