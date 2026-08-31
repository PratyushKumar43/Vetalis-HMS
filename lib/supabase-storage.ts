/**
 * Supabase Storage Integration
 * 
 * Secure file upload and signed download URL management using Supabase Storage
 */

import { supabase } from "./db";

const BUCKET_NAME = "medical-reports";

/**
 * Upload medical report to Supabase Storage
 */
export async function uploadMedicalReport(
  buffer: Buffer,
  patientId: string,
  reportId: string,
  reportType: "lab" | "imaging" | "pathology" | "other",
  contentType: string = "application/pdf"
): Promise<{
  public_id: string;
  secure_url: string;
  format: string;
  bytes: number;
}> {
  const filePath = `${patientId}/${reportId}`;

  // Upload file buffer to Supabase Storage bucket
  const { data, error } = await supabase.storage
    .from(BUCKET_NAME)
    .upload(filePath, buffer, {
      contentType,
      upsert: true,
    });

  if (error) {
    console.error("Supabase Storage upload error:", error);
    throw new Error(`Failed to upload file: ${error.message}`);
  }

  // Get public / signed access URL fallback
  const { data: publicUrlData } = supabase.storage
    .from(BUCKET_NAME)
    .getPublicUrl(filePath);

  const fileFormat = contentType.split("/")[1] || "pdf";

  return {
    public_id: filePath,
    secure_url: publicUrlData.publicUrl,
    format: fileFormat,
    bytes: buffer.byteLength,
  };
}

/**
 * Generate signed URL for secure file download (default 1 hour expiry)
 */
export async function generateSignedUrl(
  filePath: string,
  expiresInSeconds: number = 3600
): Promise<string> {
  try {
    const { data, error } = await supabase.storage
      .from(BUCKET_NAME)
      .createSignedUrl(filePath, expiresInSeconds);

    if (error || !data?.signedUrl) {
      console.error("Supabase signed URL error:", error);
      // Fallback to public URL if bucket is public
      const { data: publicData } = supabase.storage
        .from(BUCKET_NAME)
        .getPublicUrl(filePath);
      return publicData.publicUrl;
    }

    return data.signedUrl;
  } catch (error) {
    console.error("Error generating signed URL:", error);
    throw new Error("Failed to generate signed URL");
  }
}

/**
 * Delete file from Supabase Storage
 */
export async function deleteFile(filePath: string): Promise<boolean> {
  try {
    const { error } = await supabase.storage
      .from(BUCKET_NAME)
      .remove([filePath]);
    return !error;
  } catch (error) {
    console.error("Error deleting file from Supabase Storage:", error);
    return false;
  }
}
