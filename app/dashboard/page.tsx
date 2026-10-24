import { getUser } from "@/lib/supabase-auth-server";
import { redirect } from "next/navigation";

export default async function DashboardRootPage() {
  const user = await getUser();

  if (!user) {
    redirect("/auth/sign-in");
  }

  // Redirect to role dashboard
  const userRole = user.role || "patient";
  redirect(`/${userRole}`);
}
