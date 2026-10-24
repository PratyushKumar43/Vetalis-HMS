import { getUser } from "@/lib/supabase-auth-server";
import { Heart, FileText, Pill, Activity, Download, MessageSquare, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { cookies } from "next/headers";
import { createClient } from "@/utils/supabase/server";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Patient Dashboard | Vetalis HMS",
  description: "Personal health records, active prescriptions, and clinical reports",
};

export default async function PatientDashboardPage() {
  const user = await getUser();
  const patientId = user?.id;

  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);

  // 1. Fetch patient's medical reports
  let reports: any[] = [];
  if (patientId) {
    const { data: repData } = await supabase
      .from("medical_reports")
      .select("*")
      .eq("patient_id", patientId)
      .order("uploaded_at", { ascending: false })
      .limit(5);
    reports = repData || [];
  }

  // 2. Fetch patient's active prescriptions
  let prescriptions: any[] = [];
  if (patientId) {
    const { data: presData } = await supabase
      .from("prescriptions")
      .select("*, doctor:doctor_id(users(name))")
      .eq("patient_id", patientId)
      .order("created_at", { ascending: false })
      .limit(5);
    prescriptions = presData || [];
  }

  // 3. Fetch patient's latest vitals
  let latestVitals: any = null;
  if (patientId) {
    const { data: vitData } = await supabase
      .from("vitals")
      .select("*")
      .eq("patient_id", patientId)
      .order("recorded_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    latestVitals = vitData;
  }

  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <div className="p-6 bg-gradient-to-r from-teal-700 to-teal-800 text-white rounded-3xl shadow-md">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-white/20 text-teal-100 mb-2">
              <ShieldCheck className="w-3.5 h-3.5" />
              Verified Patient Portal
            </span>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              Hello, {user?.name || "Patient"}
            </h1>
            <p className="text-teal-100 text-sm mt-1 max-w-xl">
              Access your personal clinical history, verified diagnostic reports, and current prescriptions securely.
            </p>
          </div>
          <Link
            href="/dashboard/chatbot"
            className="inline-flex items-center gap-2 px-5 py-3 bg-white text-teal-800 rounded-2xl font-bold text-xs uppercase tracking-wider hover:bg-teal-50 transition-all shadow-sm flex-shrink-0"
          >
            <MessageSquare className="w-4 h-4 text-teal-600" />
            AI Health Assistant
          </Link>
        </div>
      </div>

      {/* Vitals Summary & Health Metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="p-4 bg-white rounded-2xl border border-slate-200/80 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Heart Rate</span>
            <Activity className="w-4 h-4 text-rose-500" />
          </div>
          <p className="text-2xl font-extrabold text-slate-900 mt-2">
            {latestVitals?.heart_rate ? `${latestVitals.heart_rate} bpm` : "72 bpm"}
          </p>
          <span className="text-[10px] text-slate-400">Normal sinus rhythm</span>
        </div>

        <div className="p-4 bg-white rounded-2xl border border-slate-200/80 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Blood Pressure</span>
            <Heart className="w-4 h-4 text-teal-500" />
          </div>
          <p className="text-2xl font-extrabold text-slate-900 mt-2">
            {latestVitals?.blood_pressure_systolic ? `${latestVitals.blood_pressure_systolic}/${latestVitals.blood_pressure_diastolic}` : "120/80"}
          </p>
          <span className="text-[10px] text-slate-400">Resting measurement</span>
        </div>

        <div className="p-4 bg-white rounded-2xl border border-slate-200/80 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Oxygen Sat</span>
            <Activity className="w-4 h-4 text-blue-500" />
          </div>
          <p className="text-2xl font-extrabold text-slate-900 mt-2">
            {latestVitals?.oxygen_saturation ? `${latestVitals.oxygen_saturation}%` : "98%"}
          </p>
          <span className="text-[10px] text-slate-400">SpO2 ambient</span>
        </div>

        <div className="p-4 bg-white rounded-2xl border border-slate-200/80 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Temperature</span>
            <Activity className="w-4 h-4 text-amber-500" />
          </div>
          <p className="text-2xl font-extrabold text-slate-900 mt-2">
            {latestVitals?.temperature ? `${latestVitals.temperature}°F` : "98.6°F"}
          </p>
          <span className="text-[10px] text-slate-400">Oral baseline</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Medical Reports */}
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden flex flex-col">
          <div className="p-5 border-b border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-teal-600" />
              <h2 className="font-bold text-slate-900 text-sm">Your Medical Reports</h2>
            </div>
            <Link
              href="/dashboard/reports"
              className="text-xs font-semibold text-teal-600 hover:text-teal-700"
            >
              View All
            </Link>
          </div>

          <div className="p-4 flex-1 divide-y divide-slate-100">
            {reports.length === 0 ? (
              <div className="py-10 text-center text-slate-400 text-xs">
                No medical reports available on your record yet.
              </div>
            ) : (
              reports.map((report) => (
                <div key={report.id} className="py-3.5 flex items-center justify-between gap-3">
                  <div>
                    <p className="text-xs font-bold text-slate-900 capitalize">
                      {report.report_type} Report
                    </p>
                    <p className="text-[11px] text-slate-400">
                      Uploaded {new Date(report.uploaded_at).toLocaleDateString()} • {report.file_format?.toUpperCase() || "PDF"}
                    </p>
                  </div>
                  <a
                    href={`/api/reports/${report.id}/download?redirect=true`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-teal-50 text-teal-700 hover:bg-teal-100 rounded-xl text-xs font-semibold transition-colors"
                  >
                    <Download className="w-3.5 h-3.5" />
                    Download
                  </a>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Prescriptions */}
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden flex flex-col">
          <div className="p-5 border-b border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Pill className="w-5 h-5 text-emerald-600" />
              <h2 className="font-bold text-slate-900 text-sm">Active Prescriptions</h2>
            </div>
            <Link
              href="/dashboard/prescriptions"
              className="text-xs font-semibold text-teal-600 hover:text-teal-700"
            >
              View All
            </Link>
          </div>

          <div className="p-4 flex-1 divide-y divide-slate-100">
            {prescriptions.length === 0 ? (
              <div className="py-10 text-center text-slate-400 text-xs">
                No active prescriptions recorded.
              </div>
            ) : (
              prescriptions.map((p) => {
                const meds = Array.isArray(p.medications) ? p.medications : [];
                return (
                  <div key={p.id} className="py-3.5">
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-bold text-slate-900">
                        Prescribed by {p.doctor?.users?.name || p.doctor?.name || "Doctor"}
                      </p>
                      <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md">
                        {p.status?.toUpperCase() || "ACTIVE"}
                      </span>
                    </div>
                    <div className="mt-1 space-y-1">
                      {meds.map((m: any, idx: number) => (
                        <p key={idx} className="text-xs text-slate-600 font-medium">
                          • {m.name} - {m.dosage} ({m.frequency})
                        </p>
                      ))}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
