/**
 * Dashboard Layout
 * 
 * Provides sidebar navigation and header for all dashboard pages
 */

import { redirect } from "next/navigation";
import { getUser } from "@/lib/supabase-auth-server";
import Sidebar from "@/components/dashboard/Sidebar";
import Header from "@/components/dashboard/Header";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getUser();

  if (!user) {
    redirect("/auth/sign-in");
  }

  // Get user role from user metadata or default to patient
  const userRole = (user.role as "admin" | "doctor" | "patient") || "patient";

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="flex">
        {/* Sidebar */}
        <Sidebar
          userRole={userRole}
          userName={user.name || undefined}
          userEmail={user.email || undefined}
        />

        {/* Main Content */}
        <div className="flex-1 lg:ml-64">
          <Header userName={user.name || undefined} />
          <main className="p-6">{children}</main>
        </div>
      </div>
    </div>
  );
}
