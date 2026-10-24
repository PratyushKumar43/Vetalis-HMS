import { getUser } from "@/lib/supabase-auth-server";
import { Shield } from "lucide-react";
import AdminPanel from "@/components/dashboard/AdminPanel";

export const metadata = {
  title: "Admin Dashboard | Vetalis HMS",
  description: "System administration and clinical access controls",
};

export default async function AdminDashboardPage() {
  const user = await getUser();

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5 mb-1.5">
            <div className="p-2 rounded-xl bg-indigo-50 border border-indigo-200/60 text-indigo-700">
              <Shield className="w-5 h-5 stroke-[2.2]" />
            </div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Admin Console</h1>
          </div>
          <p className="text-sm text-slate-500">
            Manage provider accounts, patient relationships, and platform security policies.
          </p>
        </div>
      </div>

      <AdminPanel />
    </div>
  );
}
