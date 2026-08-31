/**
 * Patient Management Dashboard
 * 
 * List view with search, filter, and patient management
 */

import { getUser } from "@/lib/supabase-auth-server";
import { redirect } from "next/navigation";
import { Users, Plus, Calendar, Clock, AlertCircle } from "lucide-react";
import Link from "next/link";
import PatientList from "@/components/dashboard/PatientList";
import { supabase } from "@/lib/db";

export default async function PatientsPage() {
  const user = await getUser();

  if (!user) {
    redirect("/auth/sign-in");
  }

  // Check permissions
  const userRole = (user.role as string) || "patient";
  if (userRole === "patient") {
    redirect("/dashboard");
  }

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const weekStart = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  const [
    { count: totalPatients },
    { count: activeToday },
    { count: newThisWeek },
    { count: pendingRecords },
  ] = await Promise.all([
    supabase.from("users").select("*", { count: "exact", head: true }).eq("role", "patient"),
    supabase.from("users").select("*", { count: "exact", head: true }).eq("role", "patient").gte("created_at", todayStart.toISOString()),
    supabase.from("users").select("*", { count: "exact", head: true }).eq("role", "patient").gte("created_at", weekStart.toISOString()),
    supabase.from("patients").select("*", { count: "exact", head: true }).is("date_of_birth", null),
  ]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold text-slate-900 mb-2">Patient Management</h1>
          <p className="text-slate-600">Manage patient records, medical history, and vital signs</p>
        </div>
        {userRole === "admin" && (
          <Link
            href="/dashboard/patients/new"
            className="inline-flex items-center gap-2 bg-teal-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-teal-700 transition-colors"
          >
            <Plus className="w-5 h-5" />
            Add New Patient
          </Link>
        )}
      </div>

      {/* Real Database Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white rounded-lg border border-slate-200 p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 rounded-lg bg-blue-100 text-blue-700">
              <Users className="w-6 h-6" />
            </div>
          </div>
          <p className="text-2xl font-semibold text-slate-900 mb-1">{totalPatients ?? 0}</p>
          <p className="text-sm text-slate-500">Total Patients</p>
        </div>
        <div className="bg-white rounded-lg border border-slate-200 p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 rounded-lg bg-emerald-100 text-emerald-700">
              <Clock className="w-6 h-6" />
            </div>
          </div>
          <p className="text-2xl font-semibold text-slate-900 mb-1">{activeToday ?? 0}</p>
          <p className="text-sm text-slate-500">Active Today</p>
        </div>
        <div className="bg-white rounded-lg border border-slate-200 p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 rounded-lg bg-amber-100 text-amber-700">
              <Calendar className="w-6 h-6" />
            </div>
          </div>
          <p className="text-2xl font-semibold text-slate-900 mb-1">{newThisWeek ?? 0}</p>
          <p className="text-sm text-slate-500">New This Week</p>
        </div>
        <div className="bg-white rounded-lg border border-slate-200 p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 rounded-lg bg-purple-100 text-purple-700">
              <AlertCircle className="w-6 h-6" />
            </div>
          </div>
          <p className="text-2xl font-semibold text-slate-900 mb-1">{pendingRecords ?? 0}</p>
          <p className="text-sm text-slate-500">Pending Records</p>
        </div>
      </div>

      {/* Patient List */}
      <PatientList userRole={userRole} />
    </div>
  );
}
