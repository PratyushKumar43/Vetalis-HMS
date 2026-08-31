/**
 * API Route: AI Prescription Suggestions
 * 
 * POST /api/prescriptions/generate
 * 
 * Invokes Universal AI model (agnes-2.0-flash / Gemini) to generate prescription suggestions.
 */

import { NextRequest, NextResponse } from "next/server";
import { getUser } from "@/lib/supabase-auth-server";
import { generatePrescriptionSuggestions } from "@/lib/gemini";

export async function POST(request: NextRequest) {
  try {
    const user = await getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userRole = (user.role as string) || "patient";
    if (userRole === "patient") {
      return NextResponse.json({ error: "Forbidden: Only doctors can generate prescriptions" }, { status: 403 });
    }

    const body = await request.json();
    const { symptoms = "", diagnosis = "", patientHistory = "" } = body;

    if (!symptoms && !diagnosis) {
      return NextResponse.json(
        { error: "Symptoms or diagnosis are required for AI prescription suggestions" },
        { status: 400 }
      );
    }

    const suggestions = await generatePrescriptionSuggestions(
      symptoms,
      diagnosis,
      patientHistory
    );

    return NextResponse.json({
      success: true,
      suggestions: Array.isArray(suggestions) ? suggestions : [suggestions],
    });
  } catch (err: any) {
    console.error("AI Prescription generation error:", err);
    return NextResponse.json(
      { error: err.message || "Failed to generate AI prescription suggestions" },
      { status: 500 }
    );
  }
}
