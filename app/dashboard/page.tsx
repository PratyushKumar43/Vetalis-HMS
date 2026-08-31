/**
 * Dashboard Home Page
 * 
 * Overview dashboard with stats and quick actions
 */

import { getUser } from "@/lib/supabase-auth-server";
import { redirect } from "next/navigation";
import { Users, FileText, Pill, Activity, TrendingUp, Clock } from "lucide-react";
import Link from "next/link";
import DashboardStats from "@/components/dashboard/DashboardStats";

export default async function DashboardPage() {
  const user = await getUser();

  if (!user) {
    redirect("/auth/sign-in");
  }

  const userRole = (user.role as string) || "patient";

  // Role-based quick actions
  const quickActions = {
    admin: [
      { label: "Add New Patient", href: "/dashboard/patients/new", icon: Users },
      { label: "View Analytics", href: "/dashboard/admin", icon: TrendingUp },
      { label: "Manage Users", href: "/dashboard/admin", icon: Users },
    ],
    doctor: [
      { label: "New Prescription", href: "/dashboard/prescriptions/new", icon: Pill },
      { label: "Upload Report", href: "/dashboard/reports/upload", icon: FileText },
    ],
    patient: [
      { label: "View Reports", href: "/dashboard/reports", icon: FileText },
      { label: "My Prescriptions", href: "/dashboard/prescriptions", icon: Pill },
      { label: "Chat with AI", href: "/dashboard/chatbot", icon: Activity },
    ],
  };

  const currentActions = quickActions[userRole as keyof typeof quickActions] || quickActions.patient;

  return (
    <div className="space-y-6">
      {/* Welcome Section */}
      <div>
        <h1 className="text-3xl font-semibold text-slate-900 mb-2">
          Welcome back, {user.name || "User"}!
        </h1>
        <p className="text-slate-600">
          Here's what's happening with your {userRole === "patient" ? "health" : "practice"} today.
        </p>
      </div>

      {/* Stats Grid */}
      <DashboardStats userRole={userRole} />

      {/* Quick Actions */}
      <div className="bg-white rounded-lg border border-slate-200 p-6">
        <h2 className="text-xl font-semibold text-slate-900 mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {currentActions.map((action, index) => {
            const Icon = action.icon;
            return (
              <Link
                key={index}
                href={action.href}
                className="flex items-center gap-4 p-4 rounded-lg border border-slate-200 hover:border-teal-300 hover:bg-teal-50 transition-colors group"
              >
                <div className="p-3 rounded-lg bg-slate-50 group-hover:bg-teal-100 transition-colors">
                  <Icon className="w-5 h-5 text-slate-600 group-hover:text-teal-700" />
                </div>
                <span className="font-medium text-slate-900">{action.label}</span>
              </Link>
            );
          })}
        </div>
      </div>

      {/* Recent Activity */}
      <div className="bg-white rounded-lg border border-slate-200 p-6">
        <h2 className="text-xl font-semibold text-slate-900 mb-4">Recent Activity</h2>
        <div className="space-y-4">
          <div className="flex items-center gap-4 p-4 rounded-lg bg-slate-50">
            <div className="w-2 h-2 rounded-full bg-teal-500"></div>
            <div className="flex-1">
              <p className="text-sm font-medium text-slate-900">System is operational</p>
              <p className="text-xs text-slate-500">All services running normally</p>
            </div>
            <span className="text-xs text-slate-500">Just now</span>
          </div>
          <div className="flex items-center gap-4 p-4 rounded-lg bg-slate-50">
            <div className="w-2 h-2 rounded-full bg-blue-500"></div>
            <div className="flex-1">
              <p className="text-sm font-medium text-slate-900">Welcome to MedCore</p>
              <p className="text-xs text-slate-500">Get started by exploring the features</p>
            </div>
            <span className="text-xs text-slate-500">Today</span>
          </div>
        </div>
      </div>
    </div>
  );
}
