/**
 * Patient Detail Page
 * 
 * View patient information, medical history, vitals, and reports
 */

import { getUser } from "@/lib/supabase-auth-server";
import { redirect } from "next/navigation";
import { ArrowLeft, Edit, Download, Calendar, Activity, FileText, Pill, Heart } from "lucide-react";
import Link from "next/link";
import PatientDetail from "@/components/dashboard/PatientDetail";

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

  // Check permissions - patients can only view their own records
  const userRole = (user.role as string) || "patient";
  if (userRole === "patient" && user.id !== params.id) {
    redirect("/dashboard");
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link
            href="/dashboard/patients"
            className="p-2 rounded-lg hover:bg-slate-100 transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-slate-600" />
          </Link>
          <div>
            <h1 className="text-3xl font-semibold text-slate-900">Patient Details</h1>
            <p className="text-slate-600">View and manage patient information</p>
          </div>
        </div>
        <div className="flex gap-3">
          <Link
            href={`/dashboard/patients/${params.id}/edit`}
            className="inline-flex items-center gap-2 px-4 py-2 border border-slate-200 rounded-lg font-medium text-slate-700 hover:bg-slate-50 transition-colors"
          >
            <Edit className="w-4 h-4" />
            Edit
          </Link>
        </div>
      </div>

      {/* Patient Detail Component */}
      <PatientDetail patientId={params.id} userRole={userRole} />
    </div>
  );
}

