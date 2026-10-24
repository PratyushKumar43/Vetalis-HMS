/**
 * API Route: Get Medical Reports
 * 
 * GET /api/reports/list
 * 
 * Returns authorized list of medical reports based on role and assignment
 */

import { NextRequest, NextResponse } from "next/server";
import { getUser } from "@/lib/supabase-auth-server";
import { cookies } from "next/headers";
import { createClient } from "@/utils/supabase/server";

export async function GET(request: NextRequest) {
  try {
    const user = await getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (user.status !== "active") {
      return NextResponse.json({ error: "Account deactivated" }, { status: 403 });
    }

    const cookieStore = await cookies();
    const supabase = createClient(cookieStore);

    const userRole = user.role;
    const searchParams = request.nextUrl.searchParams;
    const requestedPatientId = searchParams.get("patientId");
    const reportType = searchParams.get("type") || "all";

    let reportsQuery = supabase
      .from("medical_reports")
      .select("*, patient:patient_id(users(name, email))");

    if (userRole === "patient") {
      // Patients strictly see only their own reports
      reportsQuery = reportsQuery.eq("patient_id", user.id);
    } else if (userRole === "doctor") {
      // Fetch list of assigned patients
      const { data: assignments } = await supabase
        .from("doctor_patient_assignments")
        .select("patient_id")
        .eq("doctor_id", user.id);

      const assignedPatientIds = (assignments || []).map((a: any) => a.patient_id);

      if (requestedPatientId) {
        if (!assignedPatientIds.includes(requestedPatientId)) {
          return NextResponse.json(
            { error: "Forbidden: You are not assigned to this patient." },
            { status: 403 }
          );
        }
        reportsQuery = reportsQuery.eq("patient_id", requestedPatientId);
      } else {
        if (assignedPatientIds.length === 0) {
          return NextResponse.json({ success: true, reports: [], total: 0 });
        }
        reportsQuery = reportsQuery.in("patient_id", assignedPatientIds);
      }
    } else if (userRole === "admin") {
      if (requestedPatientId) {
        reportsQuery = reportsQuery.eq("patient_id", requestedPatientId);
      }
    } else {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    if (reportType !== "all") {
      reportsQuery = reportsQuery.eq("report_type", reportType);
    }

    reportsQuery = reportsQuery.order("uploaded_at", { ascending: false }).limit(100);

    const { data: rawReports, error: dbError } = await reportsQuery;

    if (dbError) {
      console.error("Error fetching reports:", dbError);
      return NextResponse.json({ error: dbError.message }, { status: 500 });
    }

    const formattedReports = (rawReports || []).map((report: any) => {
      const anomalies = report.anomalies
        ? Array.isArray(report.anomalies)
          ? report.anomalies
          : [report.anomalies]
        : [];

      return {
        id: report.id,
        patientName: report.patient?.users?.name || report.users?.name || "Unknown",
        patientId: report.patient_id,
        reportType: report.report_type,
        uploadedDate: report.uploaded_at,
        aiAnalyzed: !!report.ai_analysis,
        anomalies: anomalies.length,
        confidence: report.confidence_score ? parseFloat(report.confidence_score) : null,
        status: report.ai_analysis
          ? anomalies.length > 0
            ? "Analyzed"
            : "Normal"
          : "Pending",
      };
    });

    return NextResponse.json({
      success: true,
      reports: formattedReports,
      total: formattedReports.length,
    });
  } catch (error: any) {
    console.error("Error fetching reports:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch reports" },
      { status: 500 }
    );
  }
}
