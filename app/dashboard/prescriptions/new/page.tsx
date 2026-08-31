/**
 * New Prescription Page
 * 
 * Create new prescription with AI assistance or manual entry
 */

import { getUser } from "@/lib/supabase-auth-server";
import { redirect } from "next/navigation";
import NewPrescriptionForm from "@/components/dashboard/NewPrescriptionForm";

export default async function NewPrescriptionPage({
  searchParams,
}: {
  searchParams: { mode?: string };
}) {
  const user = await getUser();

  if (!user) {
    redirect("/auth/sign-in");
  }

  // Only doctors and admins can create prescriptions
  const userRole = (user.role as string) || "patient";
  if (userRole === "patient") {
    redirect("/dashboard/prescriptions");
  }

  const isAIMode = searchParams.mode === "ai";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold text-slate-900 mb-2">
          {isAIMode ? "AI-Assisted Prescription" : "New Prescription"}
        </h1>
        <p className="text-slate-600">
          {isAIMode
            ? "Create a prescription with AI assistance"
            : "Create a new prescription manually"}
        </p>
      </div>
      <NewPrescriptionForm userRole={userRole} userId={user.id} isAIMode={isAIMode} />
    </div>
  );
}
