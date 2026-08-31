"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Upload, FileText, X, Loader2, Sparkles, CheckCircle2, ScanText } from "lucide-react";
import PatientAutocomplete from "./PatientAutocomplete";

interface ReportUploadFormProps {
  userRole: string;
  userId: string;
}

export default function ReportUploadForm({ userRole, userId }: ReportUploadFormProps) {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [patientId, setPatientId] = useState("");
  const [reportType, setReportType] = useState<"lab" | "imaging" | "pathology" | "other">("lab");
  const [loading, setLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState("");
  const [error, setError] = useState("");

  const handlePatientChange = (selectedPatientId: string) => {
    setPatientId(selectedPatientId);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) {
      setError("Please select a file");
      return;
    }

    setLoading(true);
    setError("");
    setStatusMessage("Uploading file to Supabase Storage & processing OCR.space extraction...");

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("patientId", userRole === "patient" ? userId : patientId);
      formData.append("reportType", reportType);

      const response = await fetch("/api/reports/upload", {
        method: "POST",
        body: formData,
      });

      const data = await response.json();

      if (data.success) {
        setStatusMessage("Analysis complete! Redirecting to reports...");
        setTimeout(() => {
          router.push("/dashboard/reports");
          router.refresh();
        }, 1000);
      } else {
        setError(data.error || "Failed to upload report");
      }
    } catch (err: any) {
      setError(err.message || "Failed to upload report");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-lg border border-slate-200 p-6 shadow-sm">
      <form onSubmit={handleSubmit} className="space-y-6">
        {userRole !== "patient" && (
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Select Patient <span className="text-red-500">*</span>
            </label>
            <PatientAutocomplete
              value={patientId}
              onChange={handlePatientChange}
              placeholder="Type patient name or email to search..."
              required
            />
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">
            Report Category
          </label>
          <select
            value={reportType}
            onChange={(e) => setReportType(e.target.value as any)}
            required
            className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 bg-white"
          >
            <option value="lab">Lab Report (Blood, Urine, Metabolic)</option>
            <option value="imaging">Imaging (X-Ray, MRI, CT Scan, Ultrasound)</option>
            <option value="pathology">Pathology & Biopsy</option>
            <option value="other">General Medical Record / Prescription</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">
            Upload Document File (PDF, JPG, PNG)
          </label>
          <div className="border-2 border-dashed border-slate-300 rounded-xl p-8 text-center hover:border-teal-500 hover:bg-slate-50/50 transition-all">
            {file ? (
              <div className="space-y-4">
                <div className="flex items-center justify-center gap-4 bg-teal-50 p-4 rounded-lg border border-teal-100 max-w-md mx-auto">
                  <FileText className="w-8 h-8 text-teal-600 flex-shrink-0" />
                  <div className="text-left flex-1 min-w-0">
                    <p className="font-medium text-slate-900 truncate">{file.name}</p>
                    <p className="text-xs text-slate-500">
                      {(file.size / 1024 / 1024).toFixed(2)} MB
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setFile(null)}
                    className="p-1 rounded-full hover:bg-teal-100 transition-colors"
                  >
                    <X className="w-5 h-5 text-slate-500" />
                  </button>
                </div>
              </div>
            ) : (
              <label className="cursor-pointer block">
                <input
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png"
                  onChange={(e) => setFile(e.target.files?.[0] || null)}
                  className="hidden"
                />
                <div className="space-y-3">
                  <div className="w-12 h-12 rounded-full bg-teal-50 text-teal-600 flex items-center justify-center mx-auto">
                    <Upload className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-900">
                      Click to browse or drag & drop medical document
                    </p>
                    <p className="text-xs text-slate-500 mt-1">
                      Supports PDF documents, JPG, and PNG images (max 10MB)
                    </p>
                  </div>
                </div>
              </label>
            )}
          </div>
        </div>

        {loading && (
          <div className="p-4 bg-teal-50 border border-teal-200 rounded-lg flex items-center gap-3">
            <Loader2 className="w-5 h-5 text-teal-600 animate-spin flex-shrink-0" />
            <div className="text-sm text-teal-800">
              <p className="font-semibold">{statusMessage}</p>
              <p className="text-xs text-teal-600 mt-0.5">
                Storing in Supabase Storage, running OCR.space text extraction, and processing AI clinical insights.
              </p>
            </div>
          </div>
        )}

        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
            {error}
          </div>
        )}

        <div className="flex gap-3">
          <button
            type="submit"
            disabled={loading || !file}
            className="flex-1 bg-teal-600 text-white py-3 px-4 rounded-lg font-semibold hover:bg-teal-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-sm"
          >
            {loading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>Processing Report...</span>
              </>
            ) : (
              <>
                <Upload className="w-5 h-5" />
                <span>Upload & Analyze Report</span>
              </>
            )}
          </button>
          <button
            type="button"
            onClick={() => router.back()}
            className="px-6 py-3 border border-slate-300 rounded-lg font-medium text-slate-700 hover:bg-slate-50 transition-colors"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
