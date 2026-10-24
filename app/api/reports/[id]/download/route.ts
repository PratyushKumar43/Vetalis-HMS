/**
 * API Route: Get Signed Download URL for Medical Report
 * 
 * GET /api/reports/[id]/download
 * 
 * Generates a signed URL for secure file access from private Supabase Storage.
 * Strictly verifies patient ownership, doctor assignment, or administrative authorization.
 */

import { NextRequest, NextResponse } from "next/server";
import { getUser } from "@/lib/supabase-auth-server";
import { generateSignedUrl } from "@/lib/supabase-storage";
import { supabase } from "@/lib/db";

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // 1. Verify authenticated user
    const user = await getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (user.status !== "active") {
      return NextResponse.json({ error: "Account deactivated" }, { status: 403 });
    }

    const reportId = params.id;

    // 2. Fetch report metadata
    const { data: report, error } = await supabase
      .from("medical_reports")
      .select("id, patient_id, doctor_id, public_id")
      .eq("id", reportId)
      .single();

    if (error || !report) {
      return NextResponse.json({ error: "Report not found" }, { status: 404 });
    }

    const userRole = user.role;

    // 3. Enforce Role-Based Access Control
    if (userRole === "patient") {
      // Patients may only download their own reports
      if (report.patient_id !== user.id) {
        return NextResponse.json(
          { error: "Forbidden: You cannot access another patient's medical reports." },
          { status: 403 }
        );
      }
    } else if (userRole === "doctor") {
      // Doctors may only download reports for patients explicitly assigned to them
      const { data: assignment } = await supabase
        .from("doctor_patient_assignments")
        .select("id")
        .eq("doctor_id", user.id)
        .eq("patient_id", report.patient_id)
        .maybeSingle();

      if (!assignment && report.doctor_id !== user.id) {
        return NextResponse.json(
          { error: "Forbidden: You are not assigned to this patient." },
          { status: 403 }
        );
      }
    } else if (userRole !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // 4. Generate time-limited signed download URL
    const signedUrl = await generateSignedUrl(report.public_id, 3600);

    // If client requested direct redirect (e.g. from an <a> tag), redirect directly
    const shouldRedirect = request.nextUrl.searchParams.get("redirect") === "true";
    if (shouldRedirect) {
      return NextResponse.redirect(signedUrl, 302);
    }

    return NextResponse.json({
      success: true,
      download_url: signedUrl,
      expires_in: 3600,
    });
  } catch (error: any) {
    console.error("Download URL generation error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to generate download URL" },
      { status: 500 }
    );
  }
}
