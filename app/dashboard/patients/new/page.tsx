/**
 * New Patient Page
 * 
 * Create a new patient account manually (for doctors and admins)
 */

import { getUser } from "@/lib/supabase-auth-server";
import { redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import AddPatientForm from "@/components/dashboard/AddPatientForm";

export default async function NewPatientPage() {
  const user = await getUser();

  if (!user) {
    redirect("/auth/sign-in");
  }

  // Check permissions - only admins can manually create patients
  const userRole = (user.role as string) || "patient";
  if (userRole !== "admin") {
    redirect("/dashboard/patients");
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link
          href="/dashboard/patients"
          className="p-2 rounded-lg hover:bg-slate-100 transition-colors"
        >
          <ArrowLeft className="w-5 h-5 text-slate-600" />
        </Link>
        <div>
          <h1 className="text-3xl font-semibold text-slate-900">Add New Patient</h1>
          <p className="text-slate-600">Create a new patient account manually</p>
        </div>
      </div>

      {/* Info Banner */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <p className="text-sm text-blue-700">
          <strong>Note:</strong> Patients can also create their own accounts by signing up at{" "}
          <code className="bg-blue-100 px-2 py-1 rounded text-blue-900">/auth/sign-up</code>.
          Use this form to create patient accounts manually.
        </p>
      </div>

      {/* Add Patient Form */}
      <AddPatientForm userRole={userRole} />
    </div>
  );
}

