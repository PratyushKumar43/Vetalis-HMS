/**
 * API Route: Upload Medical Report to Supabase Storage with OCR & AI Analysis
 * 
 * POST /api/reports/upload
 * 
 * Handles file uploads for medical reports (PDFs, images)
 * Uploads to Supabase Storage, extracts text via OCR.space, runs AI analysis, and stores in database.
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

    const userRole = (user.role as string) || "patient";
    const formData = await request.formData();
    const file = formData.get("file") as File;
    let patientId = formData.get("patientId") as string;
    const reportType = (formData.get("reportType") as "lab" | "imaging" | "pathology" | "other") || "lab";

    if (userRole === "patient" || !patientId) {
      patientId = user.id;
    }

    if (!file) {
      return NextResponse.json(
        { error: "Missing required file" },
        { status: 400 }
      );
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

    // 1. Upload file to Supabase Storage
    const uploadResult = await uploadMedicalReport(
      buffer,
      patientId,
      reportId,
      reportType,
      file.type
    );

    // 2. Perform OCR Text Extraction via OCR.space API
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
