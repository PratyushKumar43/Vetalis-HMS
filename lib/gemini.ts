/**
 * Universal AI Integration Module
 * 
 * Supports Google Gemini API & Any OpenAI-Compatible Endpoint (e.g. OpenCode Zen, OpenRouter, Custom Proxies)
 * with strict medical guardrails.
 */

import { GoogleGenerativeAI } from "@google/generative-ai";

export function getAiApiKey(): string {
  return (
    process.env.AI_API_KEY ||
    process.env.OPENAI_API_KEY ||
    process.env.GEMINI_API_KEY ||
    process.env.GOOGLE_AI_API_KEY ||
    ""
  );
}

export function getAiModelName(): string {
  return (
    process.env.AI_MODEL_NAME ||
    process.env.OPENAI_MODEL_NAME ||
    process.env.GEMINI_MODEL_NAME ||
    "mimo-v2.5-free"
  );
}

export function getAiBaseUrl(): string {
  return (
    process.env.AI_BASE_URL ||
    process.env.OPENAI_BASE_URL ||
    process.env.GEMINI_BASE_URL ||
    ""
  );
}

/**
 * Universal Text Generation function
 */
export async function generateText(
  prompt: string,
  options?: {
    temperature?: number;
    maxTokens?: number;
    systemInstruction?: string;
  }
): Promise<string> {
  const apiKey = getAiApiKey();
  const modelName = getAiModelName();
  const baseUrl = getAiBaseUrl();

  if (!apiKey) {
    throw new Error("AI_API_KEY is not configured in environment variables.");
  }

  // Custom OpenAI-compatible Endpoint (e.g. OpenCode Zen https://opencode.ai/zen/v1)
  if (baseUrl && (baseUrl.includes("http://") || baseUrl.includes("https://"))) {
    let endpoint = baseUrl.trim();
    if (!endpoint.endsWith("/chat/completions")) {
      endpoint = endpoint.replace(/\/+$/, "") + "/chat/completions";
    }

    const messages: Array<{ role: string; content: string }> = [];

    if (options?.systemInstruction) {
      messages.push({ role: "system", content: options.systemInstruction });
    }
    messages.push({ role: "user", content: prompt });

    const requestBody = {
      model: modelName,
      messages,
      temperature: options?.temperature ?? 0.3,
      max_tokens: options?.maxTokens ?? 2048,
    };

    const res = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(requestBody),
    });

    if (!res.ok) {
      const errText = await res.text();
      console.error(`AI Endpoint Error (${res.status}):`, errText);
      throw new Error(`AI Provider API Error (${res.status}): ${errText}`);
    }

    const data = await res.json();
    const content = data.choices?.[0]?.message?.content;
    if (!content) {
      throw new Error("No content returned from AI provider endpoint.");
    }
    return content;
  }

  // Native Google Gemini SDK fallback
  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: modelName });

    const generationConfig = {
      temperature: options?.temperature ?? 0.3,
      maxOutputTokens: options?.maxTokens ?? 2048,
    };

    const systemInstruction = options?.systemInstruction
      ? { systemInstruction: options.systemInstruction }
      : {};

    const result = await model.generateContent({
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig,
      ...systemInstruction,
    });

    const response = await result.response;
    return response.text();
  } catch (error: any) {
    console.error("Native Gemini SDK Error:", error);
    throw new Error(`AI Generation Error: ${error.message || "Unknown error"}`);
  }
}

/**
 * Generate prescription suggestions using AI
 */
export async function generatePrescriptionSuggestions(
  symptoms: string,
  diagnosis: string,
  patientHistory?: string
) {
  const systemInstruction = `You are an expert clinical pharmacy AI assistant helping doctors create prescriptions.
Provide medication suggestions based strictly on symptoms, diagnosis, and patient history.
Always include: medication name, dosage, frequency, duration, and rationale.
Consider drug interactions, contraindications, and patient allergies.
Format your response as a valid JSON array of medication objects.`;

  const prompt = `Based on the following patient clinical information, suggest appropriate medications:

Symptoms: ${symptoms}
Diagnosis: ${diagnosis}
${patientHistory ? `Patient History: ${patientHistory}` : ""}

Return valid JSON format array:
[
  {
    "name": "Medication Name",
    "dosage": "Dosage",
    "frequency": "Frequency",
    "duration": "Duration",
    "reason": "Clinical rationale"
  }
]`;

  const response = await generateText(prompt, {
    temperature: 0.2,
    systemInstruction,
  });

  const jsonMatch = response.match(/\[[\s\S]*\]/);
  if (jsonMatch) {
    return JSON.parse(jsonMatch[0]);
  }

  throw new Error(`Failed to parse AI prescription suggestions: ${response}`);
}

/**
 * Analyze medical report using AI
 */
export async function analyzeMedicalReport(
  reportText: string,
  reportType: string
) {
  const systemInstruction = `You are a medical diagnostics AI assistant analyzing lab and imaging reports.
Analyze the report for:
1. Key clinical findings and abnormalities
2. Reference ranges and lab values
3. Potential health concerns or alerts
4. Recommended medical follow-ups

Return a valid JSON object format.`;

  const prompt = `Analyze the following ${reportType} report text:

${reportText}

Return valid JSON format:
{
  "summary": "Clinical summary",
  "findings": ["Finding 1", "Finding 2"],
  "abnormalities": ["Abnormality 1", "Abnormality 2"],
  "recommendations": ["Recommendation 1", "Recommendation 2"],
  "confidence": 0.95
}`;

  const response = await generateText(prompt, {
    temperature: 0.1,
    systemInstruction,
  });

  const jsonMatch = response.match(/\{[\s\S]*\}/);
  if (jsonMatch) {
    return JSON.parse(jsonMatch[0]);
  }

  throw new Error(`Failed to parse AI report analysis: ${response}`);
}

/**
 * Generate Chatbot Response with Strict Medical Guardrails
 */
export async function generateChatbotResponse(
  message: string,
  conversationHistory: Array<{ role: string; content: string }> = [],
  userRole: string = "patient"
) {
  const MEDICAL_GUARDRAIL = `
STRICT GUARDRAIL RULES:
You are a specialized Healthcare and Medical AI Assistant ONLY.
You MUST ONLY answer questions strictly related to healthcare, medicine, medical symptoms, clinical conditions, treatment guidelines, pharmacology, wellness, or medical diagnostic reports.

IF THE USER ASKS ANY NON-MEDICAL QUESTION (such as programming, coding, mathematics, general trivia, history, sports, entertainment, politics, gaming, finance, etc.), YOU MUST DECLINE TO ANSWER AND RESPOND ONLY WITH THIS EXACT DISCLAIMER:
"I am a specialized medical AI assistant. I can only assist with healthcare, medical conditions, wellness, and health-related topics. Please consult a qualified healthcare professional for medical advice."
`;

  const systemInstruction = `${MEDICAL_GUARDRAIL}

${
  userRole === "patient"
    ? "Provide helpful, clear medical information and health guidance. Emphasize that users should consult their doctor for official diagnoses."
    : "Provide detailed medical information and clinical assistance for healthcare professionals."
}
`;

  const conversationContext = conversationHistory
    .map((msg) => `${msg.role}: ${msg.content}`)
    .join("\n");

  const prompt = conversationContext
    ? `${conversationContext}\nuser: ${message}\nassistant:`
    : `user: ${message}\nassistant:`;

  return await generateText(prompt, {
    temperature: 0.3,
    systemInstruction,
  });
}

// Backwards compatibility helper
export function getGeminiModel() {
  return null;
}
