/**
 * Supabase Storage Integration
 * 
 * Secure file upload and signed download URL management using private Supabase Storage
 */

import { supabase } from "./db";
import { SupabaseClient } from "@supabase/supabase-js";

const BUCKET_NAME = "medical-reports";

/**
 * Upload medical report to private Supabase Storage
 */
export async function uploadMedicalReport(
  buffer: Buffer,
  patientId: string,
  reportId: string,
  reportType: "lab" | "imaging" | "pathology" | "other",
  contentType: string = "application/pdf",
  customClient?: SupabaseClient
): Promise<{
  public_id: string;
  secure_url: string;
  format: string;
  bytes: number;
}> {
  const filePath = `${patientId}/${reportId}`;
  const client = customClient || supabase;

  // Upload file buffer to private Supabase Storage bucket
  const { data, error } = await client.storage
    .from(BUCKET_NAME)
    .upload(filePath, buffer, {
      contentType,
      upsert: true,
    });

  if (error) {
    console.error("Supabase Storage upload error:", error);
    throw new Error(`Failed to upload file: ${error.message}`);
  }

  const fileFormat = contentType.split("/")[1] || "pdf";

  // Note: Medical bucket is private. We do not generate public URLs.
  // Downloads must go through /api/reports/[id]/download which returns a signed URL.
  return {
    public_id: filePath,
    secure_url: `/api/reports/${reportId}/download`,
    format: fileFormat,
    bytes: buffer.byteLength,
  };
}

/**
 * Generate time-limited signed URL for authorized file download
 */
export async function generateSignedUrl(
  filePath: string,
  expiresInSeconds: number = 3600,
  customClient?: SupabaseClient
): Promise<string> {
  const client = customClient || supabase;

  try {
    const { data, error } = await client.storage
      .from(BUCKET_NAME)
      .createSignedUrl(filePath, expiresInSeconds);

    if (error || !data?.signedUrl) {
      console.error("Supabase signed URL error:", error);
      throw new Error(error?.message || "Failed to generate signed download URL");
    }

    return data.signedUrl;
  } catch (error: any) {
    console.error("Error generating signed URL:", error);
    throw new Error(error.message || "Failed to generate signed URL");
  }
}

/**
 * Delete file from Supabase Storage
 */
export async function deleteFile(
  filePath: string,
  customClient?: SupabaseClient
): Promise<boolean> {
  const client = customClient || supabase;

  try {
    const { error } = await client.storage
      .from(BUCKET_NAME)
      .remove([filePath]);
    return !error;
  } catch (error) {
    console.error("Error deleting file from Supabase Storage:", error);
    return false;
  }
}
