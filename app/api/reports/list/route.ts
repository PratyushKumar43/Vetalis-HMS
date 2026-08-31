/**
 * API Route: Get Reports
 * 
 * GET /api/reports/list
 * 
 * Returns list of medical reports
 */

import { NextRequest, NextResponse } from "next/server";
import { getUser } from "@/lib/supabase-auth-server";
import { getReportsByPatient } from "@/lib/db-helpers";
import { sql } from "@/lib/db";

export async function GET(request: NextRequest) {
  try {
    const user = await getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userRole = (user.role as string) || "patient";
    const searchParams = request.nextUrl.searchParams;
    const patientId = searchParams.get("patientId");
    const reportType = searchParams.get("type") || "all";

    let reports;

    if (userRole === "patient") {
      // Patients see their own reports
      reports = await getReportsByPatient(user.id);
    } else if (userRole === "doctor") {
      // Doctors see reports for their patients
      if (patientId) {
        reports = await getReportsByPatient(patientId);
      } else {
        reports = await sql`
          SELECT mr.*, u.name as patient_name
          FROM medical_reports mr
          JOIN users u ON mr.patient_id = u.id
          WHERE mr.doctor_id = ${user.id}::uuid
          ORDER BY mr.uploaded_at DESC
        `;
      }
    } else {
      // Admins see all reports
      if (patientId) {
        reports = await getReportsByPatient(patientId);
      } else {
        reports = await sql`
          SELECT mr.*, u.name as patient_name
          FROM medical_reports mr
          JOIN users u ON mr.patient_id = u.id
          ORDER BY mr.uploaded_at DESC
          LIMIT 100
        `;
      }
    }

    // Format reports
    const formattedReports = reports.map((report: any) => {
      const anomalies = report.anomalies
        ? Array.isArray(report.anomalies)
          ? report.anomalies
          : [report.anomalies]
        : [];

      return {
        id: report.id,
        patientName: report.patient_name || "Unknown",
        reportType: report.report_type,
        uploadedDate: report.uploaded_at,
        aiAnalyzed: !!report.ai_analysis,
        anomalies: anomalies.length,
        confidence: report.confidence_score
          ? parseFloat(report.confidence_score)
          : null,
        status: report.ai_analysis
          ? anomalies.length > 0
            ? "Analyzed"
            : "Normal"
          : "Pending",
      };
    });

    // Filter by type if specified
    let filtered = formattedReports;
    if (reportType !== "all") {
      filtered = formattedReports.filter((r) => r.reportType === reportType);
    }

    return NextResponse.json({
      success: true,
      reports: filtered,
      total: filtered.length,
    });
  } catch (error) {
    console.error("Error fetching reports:", error);
    return NextResponse.json(
      { error: "Failed to fetch reports" },
      { status: 500 }
    );
  }
}

