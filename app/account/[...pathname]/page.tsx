/**
 * Account Management Page
 * 
 * Custom account management since Neon Auth React components require Next.js 16+
 */

"use client";

import { useParams } from "next/navigation";
import { useState, useEffect } from "react";
import { authClient } from "@/lib/supabase-auth";

export default function AccountPage() {
  const params = useParams();
  const pathname = params.pathname as string[] | undefined;
  const accountPath = pathname?.[0] || "profile";

  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadUser();
  }, []);

  const loadUser = async () => {
    try {
      const session: any = await authClient.getSession();
      // Handle different session structures
      const user = session?.user || session?.data?.user;
      if (user) {
        setUser(user);
      }
    } catch (error) {
      console.error("Error loading user:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 py-12 px-4 flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-teal-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-slate-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-slate-50 py-12 px-4 flex items-center justify-center">
        <div className="text-center">
          <p className="text-slate-600 mb-4">Please sign in to view your account.</p>
          <a href="/auth/sign-in" className="text-teal-600 hover:text-teal-700 font-medium">
            Sign In
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 py-12 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-lg shadow-lg p-8">
          <h1 className="text-3xl font-semibold text-slate-900 mb-6">Account Settings</h1>
          
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-semibold text-slate-900 mb-4">Profile Information</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Name</label>
                  <input
                    type="text"
                    value={user.name || ""}
                    readOnly
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg bg-slate-50 text-slate-600"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Email</label>
                  <input
                    type="email"
                    value={user.email || ""}
                    readOnly
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg bg-slate-50 text-slate-600"
                  />
                </div>
              </div>
            </div>

            <div>
              <h2 className="text-xl font-semibold text-slate-900 mb-4">Account Management</h2>
              <p className="text-slate-600 mb-4">
                For password changes and other account settings, please contact support or use the Neon Auth dashboard.
              </p>
              <a
                href="/dashboard"
                className="inline-block px-4 py-2 bg-teal-600 text-white rounded-lg font-semibold hover:bg-teal-700 transition-colors"
              >
                Back to Dashboard
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
