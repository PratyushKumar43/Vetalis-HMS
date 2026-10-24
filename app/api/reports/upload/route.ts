/**
 * API Route: Upload Medical Report to Private Supabase Storage
 * 
 * POST /api/reports/upload
 * 
 * Handles file uploads for medical reports (PDFs, images)
 * Restricts uploads to authorized clinical staff (Doctor assigned to patient, or Admin).
 */

import { NextRequest, NextResponse } from "next/server";
import { getUser } from "@/lib/supabase-auth-server";
import { uploadMedicalReport } from "@/lib/supabase-storage";
import { extractTextWithOcr } from "@/lib/ocr";
import { analyzeMedicalReport } from "@/lib/gemini";
import { supabase } from "@/lib/db";

export async function POST(request: NextRequest) {
  try {
    const user = await getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (user.status !== "active") {
      return NextResponse.json({ error: "Account deactivated" }, { status: 403 });
    }

    const userRole = user.role;

    // Patients cannot upload or publish clinical reports
    if (userRole === "patient") {
      return NextResponse.json(
        { error: "Forbidden: Patients are not permitted to upload medical reports." },
        { status: 403 }
      );
    }

    const formData = await request.formData();
    const file = formData.get("file") as File;
    const patientId = formData.get("patientId") as string;
    const reportType = (formData.get("reportType") as "lab" | "imaging" | "pathology" | "other") || "lab";

    if (!file) {
      return NextResponse.json(
        { error: "Missing required file" },
        { status: 400 }
      );
    }

    if (!patientId) {
      return NextResponse.json(
        { error: "Patient ID is required" },
        { status: 400 }
      );
    }

    // Verify patient exists
    const { data: patientExists } = await supabase
      .from("patients")
      .select("id")
      .eq("id", patientId)
      .maybeSingle();

    if (!patientExists) {
      return NextResponse.json(
        { error: "Patient not found" },
        { status: 404 }
      );
    }

    // For doctors: verify assignment to the patient
    if (userRole === "doctor") {
      const { data: assignment } = await supabase
        .from("doctor_patient_assignments")
        .select("id")
        .eq("doctor_id", user.id)
        .eq("patient_id", patientId)
        .maybeSingle();

      if (!assignment) {
        return NextResponse.json(
          { error: "Forbidden: You are not assigned to this patient." },
          { status: 403 }
        );
      }
    }

    // Validate file type
    const allowedTypes = ["application/pdf", "image/jpeg", "image/png", "image/jpg"];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: "Invalid file type. Allowed: PDF, JPG, PNG" },
        { status: 400 }
      );
    }

    // Validate file size (10MB limit)
    const maxSize = 10 * 1024 * 1024;
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: "File size exceeds 10MB limit" },
        { status: 400 }
      );
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const reportId = `report_${Date.now()}_${Math.random().toString(36).substring(7)}`;

    // 1. Upload file to private Supabase Storage
    const uploadResult = await uploadMedicalReport(
      buffer,
      patientId,
      reportId,
      reportType,
      file.type
    );

    // 2. Perform OCR Text Extraction if supported
    let extractedText = "";
    try {
      extractedText = await extractTextWithOcr(buffer, file.name, file.type);
    } catch (ocrErr) {
      console.error("OCR extraction warning:", ocrErr);
    }

    // 3. Perform AI Medical Report Analysis on extracted text
    let aiAnalysis: any = null;
    if (extractedText && extractedText.trim().length > 10) {
      try {
        aiAnalysis = await analyzeMedicalReport(extractedText, reportType);
      } catch (aiErr) {
        console.error("AI analysis warning:", aiErr);
      }
    }

    // 4. Insert report metadata into Supabase Database
    const { data: insertedReport, error: dbError } = await supabase
      .from("medical_reports")
      .insert({
        patient_id: patientId,
        doctor_id: userRole === "doctor" ? user.id : null,
        report_type: reportType,
        file_url: uploadResult.secure_url,
        public_id: uploadResult.public_id,
        file_format: uploadResult.format,
        file_size: uploadResult.bytes,
        extracted_text: extractedText || null,
        ai_analysis: aiAnalysis || null,
      })
      .select("id, uploaded_at")
      .single();

    if (dbError || !insertedReport) {
      console.error("Supabase DB error uploading report:", dbError);
      throw new Error(dbError?.message || "Failed to save report metadata");
    }

    return NextResponse.json({
      success: true,
      report: {
        id: insertedReport.id,
        public_id: uploadResult.public_id,
        file_url: uploadResult.secure_url,
        report_type: reportType,
        uploaded_at: insertedReport.uploaded_at,
        extracted_text: extractedText,
        ai_analysis: aiAnalysis,
      },
    });
  } catch (error: any) {
    console.error("Upload error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to upload report" },
      { status: 500 }
    );
  }
}
