/**
 * Patient Detail Page
 * 
 * View patient information, medical history, vitals, and reports
 */

import { getUser } from "@/lib/supabase-auth-server";
import { redirect } from "next/navigation";
import { ArrowLeft, Edit } from "lucide-react";
import Link from "next/link";
import PatientDetail from "@/components/dashboard/PatientDetail";
import { supabase } from "@/lib/db";

export default async function PatientDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const user = await getUser();

  if (!user) {
    redirect("/auth/sign-in");
  }

  // Redirect "new" to the new patient page
  if (params.id === "new") {
    redirect("/dashboard/patients/new");
  }

  const userRole = user.role;

  // Check permissions:
  // Patients may only view their own chart
  if (userRole === "patient" && user.id !== params.id) {
    redirect("/patient");
  }

  // Doctors may only view charts of assigned patients
  if (userRole === "doctor") {
    const { data: assignment } = await supabase
      .from("doctor_patient_assignments")
      .select("id")
      .eq("doctor_id", user.id)
      .eq("patient_id", params.id)
      .maybeSingle();

    if (!assignment) {
      redirect("/doctor");
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link
            href="/dashboard/patients"
            className="p-2 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 transition-colors shadow-sm"
          >
            <ArrowLeft className="w-4 h-4 text-slate-600" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Patient Chart</h1>
            <p className="text-xs text-slate-500">Confidential medical record and diagnostic timeline</p>
          </div>
        </div>
        {userRole !== "patient" && (
          <div className="flex gap-3">
            <Link
              href={`/dashboard/patients/${params.id}/edit`}
              className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors shadow-sm"
            >
              <Edit className="w-3.5 h-3.5" />
              Edit Record
            </Link>
          </div>
        )}
      </div>

      {/* Patient Detail Component */}
      <PatientDetail patientId={params.id} userRole={userRole} />
    </div>
  );
}
