/**
 * AI Prescription Dashboard
 * 
 * List and manage prescriptions with AI assistance
 */

import { getUser } from "@/lib/supabase-auth-server";
import { redirect } from "next/navigation";
import { Pill, Plus, Search, Filter, Sparkles } from "lucide-react";
import Link from "next/link";
import PrescriptionList from "@/components/dashboard/PrescriptionList";

export default async function PrescriptionsPage() {
  const user = await getUser();

  if (!user) {
    redirect("/auth/sign-in");
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold text-slate-900 mb-2">Prescriptions</h1>
          <p className="text-slate-600">Manage prescriptions with AI-assisted generation</p>
        </div>
        <div className="flex gap-3">
          <Link
            href="/dashboard/prescriptions/new?mode=ai"
            className="inline-flex items-center gap-2 bg-teal-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-teal-700 transition-colors"
          >
            <Sparkles className="w-5 h-5" />
            AI-Assisted
          </Link>
          <Link
            href="/dashboard/prescriptions/new"
            className="inline-flex items-center gap-2 bg-slate-900 text-white px-6 py-3 rounded-lg font-semibold hover:bg-slate-800 transition-colors"
          >
            <Plus className="w-5 h-5" />
            Manual Entry
          </Link>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white rounded-lg border border-slate-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 rounded-lg bg-purple-100 text-purple-700">
              <Pill className="w-6 h-6" />
            </div>
          </div>
          <p className="text-2xl font-semibold text-slate-900 mb-1">456</p>
          <p className="text-sm text-slate-500">Total Prescriptions</p>
        </div>
        <div className="bg-white rounded-lg border border-slate-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 rounded-lg bg-teal-100 text-teal-700">
              <Sparkles className="w-6 h-6" />
            </div>
          </div>
          <p className="text-2xl font-semibold text-slate-900 mb-1">234</p>
          <p className="text-sm text-slate-500">AI-Generated</p>
        </div>
        <div className="bg-white rounded-lg border border-slate-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 rounded-lg bg-emerald-100 text-emerald-700">
              <Pill className="w-6 h-6" />
            </div>
          </div>
          <p className="text-2xl font-semibold text-slate-900 mb-1">189</p>
          <p className="text-sm text-slate-500">Active</p>
        </div>
        <div className="bg-white rounded-lg border border-slate-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 rounded-lg bg-amber-100 text-amber-700">
              <Pill className="w-6 h-6" />
            </div>
          </div>
          <p className="text-2xl font-semibold text-slate-900 mb-1">23</p>
          <p className="text-sm text-slate-500">Pending Review</p>
        </div>
      </div>

      {/* Prescription List */}
      <PrescriptionList userRole={(user.role as string) || "patient"} />
    </div>
  );
}

