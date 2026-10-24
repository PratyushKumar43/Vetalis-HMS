/**
 * OCR.space API Text Extraction Helper
 * 
 * Extracts text from uploaded medical report images (JPG, PNG) and PDF documents.
 */

export async function extractTextWithOcr(
  buffer: Buffer,
  fileName: string,
  mimeType: string
): Promise<string> {
  const apiKey = process.env.OCR_SPACE_API_KEY;
  const endpoint = process.env.OCR_SPACE_API_URL || "https://api.ocr.space/parse/image";

  if (!apiKey) {
    console.warn("OCR_SPACE_API_KEY is not configured in environment variables. Skipping OCR text extraction.");
    return "";
  }

  try {
    const formData = new FormData();
    const blob = new Blob([new Uint8Array(buffer)], { type: mimeType });
    formData.append("file", blob, fileName);
    formData.append("apikey", apiKey);
    formData.append("language", "eng");
    formData.append("isTable", "true");
    formData.append("scale", "true");

    const fileType = fileName.split(".").pop()?.toUpperCase() || "PDF";
    formData.append("filetype", fileType);

    const response = await fetch(endpoint, {
      method: "POST",
      body: formData,
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error(`OCR.space API Error (${response.status}):`, errText);
      return "";
    }

    const data = await response.json();
    if (data.IsErroredOnProcessing) {
      console.warn("OCR processing notice:", data.ErrorMessage);
      return "";
    }

    const parsedResults = data.ParsedResults || [];
    const extractedText = parsedResults
      .map((res: any) => res.ParsedText || "")
      .join("\n\n")
      .trim();

    return extractedText;
  } catch (error: any) {
    console.error("Failed to extract text with OCR.space:", error);
    return "";
  }
}
