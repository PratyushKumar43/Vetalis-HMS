/**
 * Report Analyzer Dashboard
 * 
 * Upload and analyze medical reports with AI assistance
 */

import { getUser } from "@/lib/supabase-auth-server";
import { redirect } from "next/navigation";
import { FileText, Upload, Sparkles, AlertTriangle } from "lucide-react";
import Link from "next/link";
import ReportList from "@/components/dashboard/ReportList";
import { supabase } from "@/lib/db";

export default async function ReportsPage() {
  const user = await getUser();

  if (!user) {
    redirect("/auth/sign-in");
  }

  const userRole = (user.role as string) || "patient";

  // Real Database Queries for Statistics
  let totalQuery = supabase.from("medical_reports").select("*", { count: "exact", head: true });
  let aiQuery = supabase.from("medical_reports").select("*", { count: "exact", head: true }).not("ai_analysis", "is", null);
  let weekQuery = supabase.from("medical_reports").select("*", { count: "exact", head: true }).gte("uploaded_at", new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString());

  if (userRole === "patient") {
    totalQuery = totalQuery.eq("patient_id", user.id);
    aiQuery = aiQuery.eq("patient_id", user.id);
    weekQuery = weekQuery.eq("patient_id", user.id);
  }

  const [{ count: totalReports }, { count: aiAnalyzed }, { count: thisWeek }] = await Promise.all([
    totalQuery,
    aiQuery,
    weekQuery,
  ]);

  // Fetch reports to calculate real anomaly count
  let reportsDataQuery = supabase.from("medical_reports").select("ai_analysis");
  if (userRole === "patient") {
    reportsDataQuery = reportsDataQuery.eq("patient_id", user.id);
  }
  const { data: reportRows } = await reportsDataQuery;

  const anomaliesCount = (reportRows || []).reduce((acc, row) => {
    const analysis = row.ai_analysis as any;
    if (analysis && Array.isArray(analysis.abnormalities) && analysis.abnormalities.length > 0) {
      return acc + 1;
    }
    return acc;
  }, 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold text-slate-900 mb-2">Medical Reports</h1>
          <p className="text-slate-600">Upload and analyze medical reports with AI assistance</p>
        </div>
        <Link
          href="/dashboard/reports/upload"
          className="inline-flex items-center gap-2 bg-teal-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-teal-700 transition-colors"
        >
          <Upload className="w-5 h-5" />
          Upload Report
        </Link>
      </div>

      {/* Real Database Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white rounded-lg border border-slate-200 p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 rounded-lg bg-blue-100 text-blue-700">
              <FileText className="w-6 h-6" />
            </div>
          </div>
          <p className="text-2xl font-semibold text-slate-900 mb-1">{totalReports ?? 0}</p>
          <p className="text-sm text-slate-500">Total Reports</p>
        </div>
        <div className="bg-white rounded-lg border border-slate-200 p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 rounded-lg bg-purple-100 text-purple-700">
              <Sparkles className="w-6 h-6" />
            </div>
          </div>
          <p className="text-2xl font-semibold text-slate-900 mb-1">{aiAnalyzed ?? 0}</p>
          <p className="text-sm text-slate-500">AI Analyzed</p>
        </div>
        <div className="bg-white rounded-lg border border-slate-200 p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 rounded-lg bg-amber-100 text-amber-700">
              <AlertTriangle className="w-6 h-6" />
            </div>
          </div>
          <p className="text-2xl font-semibold text-slate-900 mb-1">{anomaliesCount}</p>
          <p className="text-sm text-slate-500">Anomalies Detected</p>
        </div>
        <div className="bg-white rounded-lg border border-slate-200 p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 rounded-lg bg-emerald-100 text-emerald-700">
              <FileText className="w-6 h-6" />
            </div>
          </div>
          <p className="text-2xl font-semibold text-slate-900 mb-1">{thisWeek ?? 0}</p>
          <p className="text-sm text-slate-500">This Week</p>
        </div>
      </div>

      {/* Report List */}
      <ReportList userRole={userRole} />
    </div>
  );
}
