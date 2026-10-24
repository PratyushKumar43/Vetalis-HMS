import { getUser } from "@/lib/supabase-auth-server";
import { Stethoscope, Users, Pill, FileText, ArrowRight, Activity, Plus } from "lucide-react";
import Link from "next/link";
import { cookies } from "next/headers";
import { createClient } from "@/utils/supabase/server";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Doctor Dashboard | Vetalis HMS",
  description: "Clinical patient management and prescription oversight",
};

export default async function DoctorDashboardPage() {
  const user = await getUser();
  const doctorId = user?.id;

  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);

  // Fetch count of assigned patients
  let assignedPatientIds: string[] = [];
  if (doctorId) {
    const { data: assignments } = await supabase
      .from("doctor_patient_assignments")
      .select("patient_id")
      .eq("doctor_id", doctorId);
    assignedPatientIds = (assignments || []).map((a: any) => a.patient_id);
  }

  // Fetch assigned patients with names
  let assignedPatients: any[] = [];
  if (assignedPatientIds.length > 0) {
    const { data: patientsData } = await supabase
      .from("patients")
      .select("*, users(name, email, phone)")
      .in("id", assignedPatientIds)
      .limit(6);
    assignedPatients = patientsData || [];
  }

  // Fetch active prescriptions issued for assigned patients
  let prescriptionCount = 0;
  if (assignedPatientIds.length > 0) {
    const { count } = await supabase
      .from("prescriptions")
      .select("*", { count: "exact", head: true })
      .in("patient_id", assignedPatientIds);
    prescriptionCount = count || 0;
  }

  // Fetch medical reports for assigned patients
  let reportCount = 0;
  if (assignedPatientIds.length > 0) {
    const { count } = await supabase
      .from("medical_reports")
      .select("*", { count: "exact", head: true })
      .in("patient_id", assignedPatientIds);
    reportCount = count || 0;
  }

  return (
    <div className="space-y-6">
      {/* Welcome Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5 mb-1.5">
            <div className="p-2 rounded-xl bg-teal-50 border border-teal-200/60 text-teal-700">
              <Stethoscope className="w-5 h-5 stroke-[2.2]" />
            </div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
              Dr. {user?.name || "Practitioner"}
            </h1>
          </div>
          <p className="text-sm text-slate-500">
            Clinical workstation. Managing {assignedPatientIds.length} assigned patient(s).
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/dashboard/prescriptions/new"
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-teal-600 text-white rounded-xl text-xs font-semibold uppercase tracking-wider hover:bg-teal-700 transition-colors shadow-sm shadow-teal-600/20"
          >
            <Plus className="w-4 h-4" />
            New Prescription
          </Link>
          <Link
            href="/dashboard/reports/upload"
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-200 text-slate-700 rounded-xl text-xs font-semibold uppercase tracking-wider hover:bg-slate-50 transition-colors"
          >
            <FileText className="w-4 h-4 text-slate-500" />
            Upload Report
          </Link>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        <div className="p-5 bg-white rounded-2xl border border-slate-200/80 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Assigned Patients</span>
            <div className="p-2 rounded-xl bg-teal-50 text-teal-600">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <p className="text-3xl font-extrabold text-slate-900 mt-2">{assignedPatientIds.length}</p>
          <p className="text-xs text-slate-500 mt-1">Authorized clinical access only</p>
        </div>

        <div className="p-5 bg-white rounded-2xl border border-slate-200/80 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Patient Reports</span>
            <div className="p-2 rounded-xl bg-indigo-50 text-indigo-600">
              <FileText className="w-4 h-4" />
            </div>
          </div>
          <p className="text-3xl font-extrabold text-slate-900 mt-2">{reportCount}</p>
          <p className="text-xs text-slate-500 mt-1">Lab, Imaging & Pathology files</p>
        </div>

        <div className="p-5 bg-white rounded-2xl border border-slate-200/80 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Active Prescriptions</span>
            <div className="p-2 rounded-xl bg-emerald-50 text-emerald-600">
              <Pill className="w-4 h-4" />
            </div>
          </div>
          <p className="text-3xl font-extrabold text-slate-900 mt-2">{prescriptionCount}</p>
          <p className="text-xs text-slate-500 mt-1">Issued treatment plans</p>
        </div>
      </div>

      {/* Assigned Patients Section */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-slate-100 flex items-center justify-between">
          <h2 className="text-base font-bold text-slate-900">Your Assigned Patients</h2>
          <Link
            href="/dashboard/patients"
            className="text-xs font-semibold text-teal-600 hover:text-teal-700 flex items-center gap-1"
          >
            View All ({assignedPatientIds.length})
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {assignedPatients.length === 0 ? (
          <div className="p-12 text-center">
            <div className="w-12 h-12 rounded-full bg-slate-50 flex items-center justify-center text-slate-400 mx-auto mb-3">
              <Users className="w-6 h-6" />
            </div>
            <p className="text-sm font-semibold text-slate-700">No patients currently assigned</p>
            <p className="text-xs text-slate-500 mt-1">
              Your clinic administrator can assign patients to your roster from the Admin Dashboard.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {assignedPatients.map((patient) => (
              <div
                key={patient.id}
                className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-50/50 transition-colors"
              >
                <div className="flex items-center gap-3.5">
                  <div className="w-10 h-10 rounded-full bg-teal-50 border border-teal-200/60 flex items-center justify-center text-teal-700 font-bold text-sm">
                    {patient.users?.name?.charAt(0) || "P"}
                  </div>
                  <div>
                    <h3 className="font-semibold text-slate-900 text-sm">{patient.users?.name || "Patient"}</h3>
                    <p className="text-xs text-slate-500">{patient.users?.email} • {patient.gender || "Gender unspecified"}</p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Link
                    href={`/dashboard/patients/${patient.id}`}
                    className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-teal-50 text-teal-700 hover:bg-teal-100 transition-colors"
                  >
                    Medical Chart
                  </Link>
                  <Link
                    href={`/dashboard/prescriptions/new?patientId=${patient.id}`}
                    className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-100 text-slate-700 hover:bg-slate-200 transition-colors"
                  >
                    Prescribe
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
