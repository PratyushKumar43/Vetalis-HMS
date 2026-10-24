import { redirect } from "next/navigation";
import { getUser } from "@/lib/supabase-auth-server";
import Sidebar from "@/components/dashboard/Sidebar";
import Header from "@/components/dashboard/Header";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getUser();

  if (!user) {
    redirect("/auth/sign-in");
  }

  if (user.role !== "admin") {
    redirect(`/${user.role}`);
  }

  if (user.status !== "active") {
    redirect("/auth/sign-in?error=account_deactivated");
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="flex">
        <Sidebar
          userRole="admin"
          userName={user.name || undefined}
          userEmail={user.email || undefined}
        />
        <div className="flex-1 lg:ml-64">
          <Header userName={user.name || undefined} />
          <main className="p-6 max-w-7xl mx-auto">{children}</main>
        </div>
      </div>
    </div>
  );
}
