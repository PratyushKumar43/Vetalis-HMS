/**
 * Neon Auth Page
 * 
 * Custom auth pages with password visibility toggle, Google OAuth, role selection, and proper error handling
 */

"use client";

import { useParams, useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { Eye, EyeOff, Mail, Lock, User, Shield, Stethoscope, Heart } from "lucide-react";
import { authClient } from "@/lib/supabase-auth";
import { toast } from "sonner";

export default function AuthPage() {
  const params = useParams();
  const router = useRouter();
  const pathname = params.pathname as string[] | undefined;
  const authPath = pathname?.[0] || "sign-in";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [role, setRole] = useState<"patient" | "doctor" | "admin">("patient");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [oauthLoading, setOauthLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Check for OAuth callback - Neon Auth redirects back with session
  useEffect(() => {
    const handleOAuthCallback = async () => {
      const urlParams = new URLSearchParams(window.location.search);
      const error = urlParams.get("error");
      const code = urlParams.get("code");

      if (error) {
        setError("OAuth authentication failed. Please try again.");
        setOauthLoading(false);
        window.history.replaceState({}, "", window.location.pathname);
        return;
      }

      if (code) {
        setOauthLoading(true);
        try {
          const session: any = await authClient.getSession();
          
          if (session?.user || session?.data?.user) {
            const user = session.user || session.data?.user;
            
            if (user?.id) {
              document.cookie = `neon-auth-user-id=${user.id}; path=/; max-age=86400; SameSite=Lax`;
              
              try {
                await fetch("/api/auth/sync-user", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    id: user.id,
                    email: user.email,
                    name: user.name || user.email?.split("@")[0] || "User",
                    role: "patient", // OAuth users default to patient
                  }),
                });
              } catch (syncError) {
                console.error("User sync error:", syncError);
              }

              window.history.replaceState({}, "", window.location.pathname);
              setSuccess("Sign in successful! Redirecting...");
              setTimeout(() => {
                router.push("/dashboard");
                router.refresh();
              }, 500);
            } else {
              throw new Error("Failed to get user information");
            }
          } else {
            setTimeout(async () => {
              try {
                const retrySession: any = await authClient.getSession();
                if (retrySession?.user || retrySession?.data?.user) {
                  const user = retrySession.user || retrySession.data?.user;
                  if (user?.id) {
                    document.cookie = `neon-auth-user-id=${user.id}; path=/; max-age=86400; SameSite=Lax`;
                    await fetch("/api/auth/sync-user", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({
                        id: user.id,
                        email: user.email,
                        name: user.name || user.email?.split("@")[0] || "User",
                        role: "patient",
                      }),
                    });
                    window.history.replaceState({}, "", window.location.pathname);
                    router.push("/dashboard");
                    router.refresh();
                  }
                } else {
                  throw new Error("Session not available");
                }
              } catch (retryError) {
                setError("OAuth authentication failed. Please try again.");
                setOauthLoading(false);
              }
            }, 1000);
          }
        } catch (err: any) {
          console.error("OAuth callback error:", err);
          setError(err.message || "OAuth authentication failed");
          setOauthLoading(false);
        }
      }
    };

    handleOAuthCallback();
  }, [router]);

  const handleGoogleSignIn = async () => {
    setOauthLoading(true);
    setError("");
    setSuccess("");

    try {
      const { createClient } = await import("@/utils/supabase/client");
      const supabase = createClient();
      const redirectUri = `${window.location.origin}/auth/callback`;
      const { data, error } = await supabase.auth.signInWithOAuth({
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
      setError(err.message || "Failed to sign in with Google. Please try again.");
      setOauthLoading(false);
    }
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccess("");

    try {
      const result: any = await authClient.signIn.email({
        email,
        password,
      });

      const user = result?.data?.user || result?.user || null;
      
      if (user?.id) {
        document.cookie = `supabase-auth-user-id=${user.id}; path=/; max-age=86400; SameSite=Lax`;
        document.cookie = `neon-auth-user-id=${user.id}; path=/; max-age=86400; SameSite=Lax`;
        
        try {
          await fetch("/api/auth/sync-user", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              id: user.id,
              email: user.email || email,
              name: user.name || name,
            }),
          });
        } catch (syncError) {
          console.error("User sync error:", syncError);
        }

        toast.success("Welcome back!", {
          description: "Signed in successfully.",
        });
        setSuccess("Sign in successful! Redirecting...");
        setTimeout(() => {
          window.location.href = "/dashboard";
        }, 500);
      } else {
        toast.error("Invalid credentials. Please try again.");
        setError("Invalid credentials. Please try again.");
      }
    } catch (err: any) {
      console.error("Sign in error:", err);
      toast.error(err.message || "Failed to sign in. Please check your credentials.");
      setError(err.message || "Failed to sign in. Please check your credentials.");
    } finally {
      setLoading(false);
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccess("");

    try {
      const result: any = await authClient.signUp.email({
        email,
        password,
        name,
        role,
      });

      const user = result?.data?.user || result?.user || null;
      
      if (user?.id) {
        document.cookie = `supabase-auth-user-id=${user.id}; path=/; max-age=86400; SameSite=Lax`;
        document.cookie = `neon-auth-user-id=${user.id}; path=/; max-age=86400; SameSite=Lax`;
        
        // Sync user to database with selected role
        try {
          const syncResponse = await fetch("/api/auth/sync-user", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              id: user.id,
              email: user.email || email,
              name: user.name || name,
              role: role, // Use selected role
            }),
          });

          const syncData = await syncResponse.json();
          
          if (!syncData.success) {
            throw new Error(syncData.error || "Failed to create account");
          }
        } catch (syncError: any) {
          console.error("User sync error:", syncError);
          setError(syncError.message || "Account created but role assignment failed. Please contact support.");
          setLoading(false);
          return;
        }

        toast.success("Account created successfully!", {
          description: "Please check your email inbox to confirm your account.",
          duration: 6000,
        });
        setSuccess("Account created successfully! Redirecting...");
        setTimeout(() => {
          window.location.href = "/dashboard";
        }, 1000);
      } else {
        toast.error("Failed to create account. Please try again.");
        setError("Failed to create account. Please try again.");
      }
    } catch (err: any) {
      console.error("Sign up error:", err);
      toast.error(err.message || "Failed to sign up. Please try again.");
      setError(err.message || "Failed to sign up. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const isLoading = loading || oauthLoading;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-teal-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-lg shadow-xl p-8">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-teal-100 mb-4">
            <Lock className="w-8 h-8 text-teal-600" />
          </div>
          <h1 className="text-3xl font-semibold text-slate-900 mb-2">
            {authPath === "sign-in" ? "Welcome Back" : "Create Account"}
          </h1>
          <p className="text-slate-600">
            {authPath === "sign-in"
              ? "Sign in to access your dashboard"
              : "Get started with your medical management"}
          </p>
        </div>

        {error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm flex items-start gap-2">
            <div className="flex-shrink-0 mt-0.5">
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="flex-1">{error}</div>
          </div>
        )}

        {success && (
          <div className="mb-4 p-4 bg-emerald-50 border border-emerald-200 rounded-lg text-emerald-700 text-sm flex items-start gap-2">
            <div className="flex-shrink-0 mt-0.5">
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="flex-1">{success}</div>
          </div>
        )}

        {/* Google OAuth Button */}
        <button
          type="button"
          onClick={handleGoogleSignIn}
          disabled={isLoading}
          className="w-full mb-6 flex items-center justify-center gap-3 px-4 py-3 border-2 border-slate-300 rounded-lg font-semibold text-slate-700 hover:bg-slate-50 hover:border-slate-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {oauthLoading ? (
            <>
              <div className="w-5 h-5 border-2 border-slate-400 border-t-transparent rounded-full animate-spin"></div>
              <span>Connecting to Google...</span>
            </>
          ) : (
            <>
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
              </svg>
              <span>Continue with Google</span>
            </>
          )}
        </button>

        {/* Divider */}
        <div className="relative mb-6">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-slate-300"></div>
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="px-2 bg-white text-slate-500">Or continue with email</span>
          </div>
        </div>

        {authPath === "sign-in" ? (
          <form onSubmit={handleSignIn} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Email Address
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full pl-10 pr-4 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                  placeholder="you@example.com"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="w-full pl-10 pr-12 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                  placeholder="Enter your password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                  tabIndex={-1}
                >
                  {showPassword ? (
                    <EyeOff className="w-5 h-5" />
                  ) : (
                    <Eye className="w-5 h-5" />
                  )}
                </button>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <label className="flex items-center">
                <input type="checkbox" className="rounded border-slate-300 text-teal-600 focus:ring-teal-500" />
                <span className="ml-2 text-sm text-slate-600">Remember me</span>
              </label>
              <a href="/auth/forgot-password" className="text-sm text-teal-600 hover:text-teal-700 font-medium">
                Forgot password?
              </a>
            </div>
            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-teal-600 text-white py-3 px-4 rounded-lg font-semibold hover:bg-teal-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span>Signing in...</span>
                </>
              ) : (
                "Sign In"
              )}
            </button>
          </form>
        ) : (
          <form onSubmit={handleSignUp} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Full Name
              </label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  className="w-full pl-10 pr-4 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                  placeholder="John Doe"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Email Address
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full pl-10 pr-4 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                  placeholder="you@example.com"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Account Type
              </label>
              <div className="grid grid-cols-3 gap-3">
                <button
                  type="button"
                  onClick={() => setRole("patient")}
                  className={`flex flex-col items-center gap-2 p-4 border-2 rounded-lg transition-colors ${
                    role === "patient"
                      ? "border-teal-500 bg-teal-50 text-teal-700"
                      : "border-slate-200 hover:border-slate-300 text-slate-600"
                  }`}
                >
                  <Heart className="w-6 h-6" />
                  <span className="text-sm font-medium">Patient</span>
                </button>
                <button
                  type="button"
                  onClick={() => setRole("doctor")}
                  className={`flex flex-col items-center gap-2 p-4 border-2 rounded-lg transition-colors ${
                    role === "doctor"
                      ? "border-teal-500 bg-teal-50 text-teal-700"
                      : "border-slate-200 hover:border-slate-300 text-slate-600"
                  }`}
                >
                  <Stethoscope className="w-6 h-6" />
                  <span className="text-sm font-medium">Doctor</span>
                </button>
                <button
                  type="button"
                  onClick={() => setRole("admin")}
                  className={`flex flex-col items-center gap-2 p-4 border-2 rounded-lg transition-colors ${
                    role === "admin"
                      ? "border-teal-500 bg-teal-50 text-teal-700"
                      : "border-slate-200 hover:border-slate-300 text-slate-600"
                  }`}
                >
                  <Shield className="w-6 h-6" />
                  <span className="text-sm font-medium">Admin</span>
                </button>
              </div>
              <p className="mt-2 text-xs text-slate-500">
                {role === "patient" && "Access your medical records and health information"}
                {role === "doctor" && "Manage patients, prescriptions, and medical reports"}
                {role === "admin" && "Full system access and user management"}
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={8}
                  className="w-full pl-10 pr-12 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                  placeholder="Create a password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                  tabIndex={-1}
                >
                  {showPassword ? (
                    <EyeOff className="w-5 h-5" />
                  ) : (
                    <Eye className="w-5 h-5" />
                  )}
                </button>
              </div>
              <p className="mt-1.5 text-xs text-slate-500">
                Must be at least 8 characters long
              </p>
            </div>
            <div className="flex items-start">
              <input
                type="checkbox"
                required
                className="mt-1 rounded border-slate-300 text-teal-600 focus:ring-teal-500"
              />
              <label className="ml-2 text-sm text-slate-600">
                I agree to the{" "}
                <a href="#" className="text-teal-600 hover:text-teal-700 font-medium">
                  Terms of Service
                </a>{" "}
                and{" "}
                <a href="#" className="text-teal-600 hover:text-teal-700 font-medium">
                  Privacy Policy
                </a>
              </label>
            </div>
            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-teal-600 text-white py-3 px-4 rounded-lg font-semibold hover:bg-teal-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span>Creating account...</span>
                </>
              ) : (
                "Create Account"
              )}
            </button>
          </form>
        )}

        <div className="mt-6 text-center">
          <p className="text-sm text-slate-600">
            {authPath === "sign-in" ? "Don't have an account? " : "Already have an account? "}
            <a
              href={authPath === "sign-in" ? "/auth/sign-up" : "/auth/sign-in"}
              className="text-teal-600 hover:text-teal-700 font-semibold"
            >
              {authPath === "sign-in" ? "Sign up" : "Sign in"}
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
