"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Sparkles, Pill, Plus, X, Loader2 } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import PatientAutocomplete from "./PatientAutocomplete";

const medicationSchema = z.object({
  name: z.string().min(1, "Medication name is required"),
  dosage: z.string().min(1, "Dosage is required"),
  frequency: z.string().min(1, "Frequency is required"),
  duration: z.string().min(1, "Duration is required"),
});

const prescriptionSchema = z.object({
  patientId: z.string().min(1, "Patient is required"),
  medications: z.array(medicationSchema).min(1, "At least one medication is required").optional(),
  notes: z.string().optional(),
});

type PrescriptionForm = z.infer<typeof prescriptionSchema>;

interface NewPrescriptionFormProps {
  userRole: string;
  userId: string;
  isAIMode: boolean;
}

export default function NewPrescriptionForm({ userRole, userId, isAIMode }: NewPrescriptionFormProps) {
  const router = useRouter();
  const [medications, setMedications] = useState([
    { name: "", dosage: "", frequency: "", duration: "" },
  ]);
  const [aiSuggestions, setAiSuggestions] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedPatientId, setSelectedPatientId] = useState<string>("");

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
  } = useForm<PrescriptionForm>({
    resolver: zodResolver(prescriptionSchema),
  });

  // Handle patient selection from autocomplete
  const handlePatientChange = (patientId: string, patient: any) => {
    setSelectedPatientId(patientId);
    setValue("patientId", patientId, { shouldValidate: true });
  };

  const addMedication = () => {
    setMedications([...medications, { name: "", dosage: "", frequency: "", duration: "" }]);
  };

  const removeMedication = (index: number) => {
    setMedications(medications.filter((_, i) => i !== index));
  };

  const updateMedication = (index: number, field: string, value: string) => {
    const updated = [...medications];
    updated[index] = { ...updated[index], [field]: value };
    setMedications(updated);
  };

  const [symptoms, setSymptoms] = useState("");
  const [diagnosis, setDiagnosis] = useState("");

  const handleAISuggest = async () => {
    if (!symptoms.trim() && !diagnosis.trim()) {
      alert("Please enter patient symptoms or diagnosis first to generate AI suggestions.");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/prescriptions/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ symptoms, diagnosis }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to generate AI suggestions");
      }
      setAiSuggestions(data.suggestions || []);
    } catch (err: any) {
      console.error("AI Prescription generation error:", err);
      alert(err.message || "Failed to generate AI prescription suggestions");
    } finally {
      setLoading(false);
    }
  };

  const onSubmit = async (data: PrescriptionForm) => {
    console.log("Form submitted with data:", data);
    console.log("Current medications state:", medications);
    
    setLoading(true);
    
    // Validate medications
    const validMedications = medications.filter((m) => 
      m.name && m.dosage && m.frequency && m.duration
    );
    
    console.log("Valid medications:", validMedications);
    
    if (validMedications.length === 0) {
      alert("Please add at least one medication with all fields filled.");
      setLoading(false);
      return;
    }

    if (!data.patientId) {
      alert("Please select a patient.");
      setLoading(false);
      return;
    }

    try {
      const requestBody = {
        patientId: data.patientId,
        medications: validMedications,
        notes: data.notes || null,
        aiGenerated: isAIMode,
      };

      console.log("Submitting prescription:", requestBody);

      const response = await fetch("/api/prescriptions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody),
      });

      const result = await response.json();
      console.log("Prescription API response:", result);
      
      if (!response.ok) {
        throw new Error(result.error || result.details || `HTTP ${response.status}: Failed to create prescription`);
      }
      
      if (result.success) {
        alert("Prescription created successfully!");
        router.push("/dashboard/prescriptions");
        router.refresh();
      } else {
        throw new Error(result.error || result.details || "Failed to create prescription");
      }
    } catch (err: any) {
      console.error("Error creating prescription:", err);
      alert(err.message || "Failed to create prescription. Please check the console for details.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {isAIMode && (
        <div className="bg-purple-50 border border-purple-200 rounded-lg p-4 flex items-start gap-3">
          <Sparkles className="w-5 h-5 text-purple-600 mt-0.5" />
          <div className="flex-1">
            <p className="font-medium text-purple-900 mb-1">AI-Assisted Mode</p>
            <p className="text-sm text-purple-700">
              Provide patient symptoms and diagnosis. AI will suggest medications with dosages.
            </p>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <div className="bg-white rounded-lg border border-slate-200 p-6">
          <h2 className="text-lg font-semibold text-slate-900 mb-4">Patient Information</h2>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Select Patient <span className="text-red-500">*</span>
            </label>
            <input
              type="hidden"
              {...register("patientId", { required: "Patient is required" })}
              value={selectedPatientId}
            />
            <PatientAutocomplete
              value={selectedPatientId}
              onChange={handlePatientChange}
              placeholder="Type patient name or email to search..."
              required
              error={errors.patientId?.message}
            />
          </div>
        </div>

        {isAIMode && (
          <div className="bg-white rounded-lg border border-slate-200 p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-slate-900">AI Prescription Generator</h2>
              <button
                type="button"
                onClick={handleAISuggest}
                disabled={loading}
                className="inline-flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg font-medium hover:bg-purple-700 disabled:opacity-50"
              >
                <Sparkles className="w-4 h-4" />
                {loading ? "Generating..." : "Generate AI Suggestions"}
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Patient Symptoms</label>
                <input
                  type="text"
                  value={symptoms}
                  onChange={(e) => setSymptoms(e.target.value)}
                  placeholder="e.g. Fever, chest congestion, dry cough"
                  className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Clinical Diagnosis</label>
                <input
                  type="text"
                  value={diagnosis}
                  onChange={(e) => setDiagnosis(e.target.value)}
                  placeholder="e.g. Acute Bronchitis"
                  className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>
            </div>
            {aiSuggestions.length > 0 && (
              <div className="space-y-3">
                {aiSuggestions.map((suggestion, index) => (
                  <div
                    key={index}
                    className="p-4 bg-purple-50 border border-purple-200 rounded-lg"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <p className="font-medium text-purple-900">{suggestion.name}</p>
                      <button
                        type="button"
                        onClick={() => {
                          const newMed = {
                            name: suggestion.name,
                            dosage: suggestion.dosage,
                            frequency: suggestion.frequency,
                            duration: suggestion.duration,
                          };
                          setMedications([...medications, newMed]);
                        }}
                        className="text-sm text-purple-700 hover:text-purple-900 font-medium"
                      >
                        Add to Prescription
                      </button>
                    </div>
                    <p className="text-sm text-purple-700">
                      {suggestion.dosage} • {suggestion.frequency} • {suggestion.duration}
                    </p>
                    <p className="text-xs text-purple-600 mt-1">Reason: {suggestion.reason}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        <div className="bg-white rounded-lg border border-slate-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-slate-900">Medications</h2>
            <button
              type="button"
              onClick={addMedication}
              className="inline-flex items-center gap-2 px-4 py-2 border border-slate-200 rounded-lg font-medium text-slate-700 hover:bg-slate-50"
            >
              <Plus className="w-4 h-4" />
              Add Medication
            </button>
          </div>

          <div className="space-y-4">
            {medications.map((med, index) => (
              <div key={index} className="p-4 border border-slate-200 rounded-lg">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-sm font-medium text-slate-700">Medication {index + 1}</span>
                  {medications.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeMedication(index)}
                      className="p-1 rounded hover:bg-red-50 text-red-600"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Medication Name
                    </label>
                    <input
                      type="text"
                      value={med.name}
                      onChange={(e) => updateMedication(index, "name", e.target.value)}
                      className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                      placeholder="e.g., Aspirin"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Dosage</label>
                    <input
                      type="text"
                      value={med.dosage}
                      onChange={(e) => updateMedication(index, "dosage", e.target.value)}
                      className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                      placeholder="e.g., 81mg"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Frequency</label>
                    <input
                      type="text"
                      value={med.frequency}
                      onChange={(e) => updateMedication(index, "frequency", e.target.value)}
                      className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                      placeholder="e.g., Once daily"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Duration</label>
                    <input
                      type="text"
                      value={med.duration}
                      onChange={(e) => updateMedication(index, "duration", e.target.value)}
                      className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                      placeholder="e.g., 30 days"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-lg border border-slate-200 p-6">
          <h2 className="text-lg font-semibold text-slate-900 mb-4">Additional Notes</h2>
          <textarea
            {...register("notes")}
            rows={4}
            className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
            placeholder="Add any additional instructions or notes..."
          />
        </div>

        <div className="flex items-center justify-end gap-4">
          <button
            type="button"
            onClick={() => router.back()}
            className="px-6 py-3 border border-slate-200 rounded-lg font-medium text-slate-700 hover:bg-slate-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            className="px-6 py-3 bg-teal-600 text-white rounded-lg font-semibold hover:bg-teal-700 disabled:opacity-50 flex items-center gap-2"
          >
            {loading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>Creating...</span>
              </>
            ) : (
              <>
                <Pill className="w-5 h-5" />
                <span>Create Prescription</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}

