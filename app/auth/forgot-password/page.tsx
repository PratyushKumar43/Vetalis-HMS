"use client";

import { useState } from "react";
import { Mail, Activity, AlertCircle, CheckCircle2, ArrowLeft } from "lucide-react";
import { supabaseClient } from "@/lib/supabase-auth";
import Link from "next/link";
import { toast } from "sonner";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const redirectUri = `${window.location.origin}/auth/confirm?next=/auth/reset-password`;

      const { error: resetErr } = await supabaseClient.auth.resetPasswordForEmail(
        email.trim().toLowerCase(),
        {
          redirectTo: redirectUri,
        }
      );

      if (resetErr) {
        throw resetErr;
      }

      setSubmitted(true);
      toast.success("Instructions sent!", {
        description: "If an account exists, a recovery link has been dispatched.",
      });
    } catch (err: any) {
      console.error("Forgot password error:", err);
      // To prevent user enumeration, we still show success or general error on network issues
      if (err.message?.includes("rate limit") || err.message?.includes("security")) {
        setError(err.message);
      } else {
        setSubmitted(true);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-teal-50/25 to-slate-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl border border-slate-200/80 p-8">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-teal-50 border border-teal-200/50 text-teal-600 mb-4 shadow-sm">
            <Activity className="w-8 h-8 stroke-[2.5]" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Forgot Password</h1>
          <p className="text-sm text-slate-500 mt-1">
            Enter your registered email address to receive password reset instructions.
          </p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm flex items-start gap-3">
            <AlertCircle className="w-5 h-5 flex-shrink-0 text-red-600 mt-0.5" />
            <div className="flex-1 font-medium">{error}</div>
          </div>
        )}

        {submitted ? (
          <div className="space-y-6">
            <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-sm flex items-start gap-3">
              <CheckCircle2 className="w-5 h-5 flex-shrink-0 text-emerald-600 mt-0.5" />
              <div className="space-y-1">
                <p className="font-semibold text-emerald-900">Check your inbox</p>
                <p className="text-xs text-emerald-700">
                  If an account exists for <span className="font-semibold">{email}</span>, you will receive an email with instructions to securely reset your password.
                </p>
              </div>
            </div>

            <p className="text-xs text-slate-500 text-center">
              Didn't receive the email? Check your spam folder or wait a few minutes before trying again.
            </p>

            <Link
              href="/auth/sign-in"
              className="w-full py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs rounded-xl transition-all flex items-center justify-center gap-2"
            >
              <ArrowLeft className="w-4 h-4" />
              Return to Sign In
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
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

            <button
              type="submit"
              disabled={loading || !email}
              className="w-full mt-2 py-3 bg-teal-600 text-white rounded-xl font-semibold text-sm hover:bg-teal-700 active:scale-[0.99] transition-all disabled:opacity-50 disabled:pointer-events-none shadow-sm shadow-teal-600/20"
            >
              {loading ? (
                <span className="inline-flex items-center gap-2">
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Sending Instructions...
                </span>
              ) : (
                "Send Reset Link"
              )}
            </button>

            <div className="pt-4 text-center">
              <Link
                href="/auth/sign-in"
                className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-900 font-medium transition-colors"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                Back to Sign In
              </Link>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
