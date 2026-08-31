/**
 * Vitals Tracking Dashboard
 * 
 * Record and visualize patient vital signs (Doctor & Admin access only)
 */

import { getUser } from "@/lib/supabase-auth-server";
import { redirect } from "next/navigation";
import { Plus } from "lucide-react";
import Link from "next/link";
import VitalsTracking from "@/components/dashboard/VitalsTracking";
import VitalsStats from "@/components/dashboard/VitalsStats";

export default async function VitalsPage() {
  const user = await getUser();

  if (!user) {
    redirect("/auth/sign-in");
  }

  const userRole = (user.role as string) || "patient";

  // Patients cannot access vitals tracking management page
  if (userRole === "patient") {
    redirect("/dashboard");
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold text-slate-900 mb-2">Vitals Tracking</h1>
          <p className="text-slate-600">Monitor and track patient vital signs over time</p>
        </div>
        <Link
          href="/dashboard/vitals/new"
          className="inline-flex items-center gap-2 bg-teal-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-teal-700 transition-colors"
        >
          <Plus className="w-5 h-5" />
          Record Vitals
        </Link>
      </div>

      {/* Stats */}
      <VitalsStats userId={user.id} userRole={userRole} />

      {/* Vitals Tracking Component */}
      <VitalsTracking userRole={userRole} userId={user.id} />
    </div>
  );
}
