/**
 * Admin Dashboard
 * 
 * System administration, user management, and analytics
 */

import { getUser } from "@/lib/supabase-auth-server";
import { redirect } from "next/navigation";
import { Shield, Users, TrendingUp, FileText, Settings, Activity } from "lucide-react";
import AdminPanel from "@/components/dashboard/AdminPanel";

export default async function AdminPage() {
  const user = await getUser();

  if (!user) {
    redirect("/auth/sign-in");
  }

  const userRole = (user.role as string) || "patient";
  if (userRole !== "admin") {
    redirect("/dashboard");
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2 rounded-lg bg-indigo-100 text-indigo-700">
            <Shield className="w-6 h-6" />
          </div>
          <h1 className="text-3xl font-semibold text-slate-900">Admin Panel</h1>
        </div>
        <p className="text-slate-600">System administration and user management</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white rounded-lg border border-slate-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 rounded-lg bg-blue-100 text-blue-700">
              <Users className="w-6 h-6" />
            </div>
          </div>
          <p className="text-2xl font-semibold text-slate-900 mb-1">1,234</p>
          <p className="text-sm text-slate-500">Total Users</p>
        </div>
        <div className="bg-white rounded-lg border border-slate-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 rounded-lg bg-teal-100 text-teal-700">
              <Users className="w-6 h-6" />
            </div>
          </div>
          <p className="text-2xl font-semibold text-slate-900 mb-1">156</p>
          <p className="text-sm text-slate-500">Doctors</p>
        </div>
        <div className="bg-white rounded-lg border border-slate-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 rounded-lg bg-purple-100 text-purple-700">
              <Users className="w-6 h-6" />
            </div>
          </div>
          <p className="text-2xl font-semibold text-slate-900 mb-1">1,078</p>
          <p className="text-sm text-slate-500">Patients</p>
        </div>
        <div className="bg-white rounded-lg border border-slate-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 rounded-lg bg-emerald-100 text-emerald-700">
              <Activity className="w-6 h-6" />
            </div>
          </div>
          <p className="text-2xl font-semibold text-slate-900 mb-1">99.9%</p>
          <p className="text-sm text-slate-500">System Uptime</p>
        </div>
      </div>

      {/* Admin Panel Component */}
      <AdminPanel />
    </div>
  );
}

