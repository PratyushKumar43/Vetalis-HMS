/**
 * API Route: Medical AI Chatbot
 * 
 * POST /api/chatbot
 * 
 * Process user messages via Gemini AI with strict medical guardrails.
 */

import { NextRequest, NextResponse } from "next/server";
import { getUser } from "@/lib/supabase-auth-server";
import { generateChatbotResponse } from "@/lib/gemini";
import { supabase } from "@/lib/db";

export async function POST(request: NextRequest) {
  try {
    const user = await getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { message, conversationHistory = [] } = body;

    if (!message || typeof message !== "string" || !message.trim()) {
      return NextResponse.json(
        { error: "Message is required" },
        { status: 400 }
      );
    }

    const userRole = (user.role as string) || "patient";

    // Generate real response from Gemini AI with Medical Guardrails
    const aiResponse = await generateChatbotResponse(
      message.trim(),
      conversationHistory,
      userRole
    );

    // Save session in Supabase chatbot_sessions table
    try {
      await supabase.from("chatbot_sessions").insert({
        user_id: user.id,
        role: userRole,
        messages: [
          ...conversationHistory,
          { role: "user", content: message },
          { role: "assistant", content: aiResponse },
        ],
      });
    } catch (dbErr) {
      console.error("Failed to save chatbot session to DB:", dbErr);
    }

    return NextResponse.json({
      success: true,
      message: aiResponse,
    });
  } catch (error: any) {
    console.error("Chatbot API error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to process chat message" },
      { status: 500 }
    );
  }
}
