import fs from "fs";
import path from "path";
import { createClient } from "@supabase/supabase-js";
import { generateChatbotResponse, getAiApiKey } from "../lib/gemini.ts";

// Helper to load .env / .env.local variables into process.env if running standalone
function loadEnv() {
  const root = process.cwd();
  [".env", ".env.local"].forEach((file) => {
    const envPath = path.join(root, file);
    if (fs.existsSync(envPath)) {
      const content = fs.readFileSync(envPath, "utf-8");
      content.split("\n").forEach((line) => {
        const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
        if (match) {
          const key = match[1];
          let value = match[2] || "";
          value = value.replace(/^['"]|['"]$/g, "").trim();
          if (!process.env[key]) {
            process.env[key] = value;
          }
        }
      });
    }
  });
}

loadEnv();

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.warn("⚠️  NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY should be set in .env or .env.local");
}

const supabase = createClient(SUPABASE_URL || "https://placeholder.supabase.co", SUPABASE_KEY || "placeholder-key");

let passed = 0;
let failed = 0;

function assert(condition, testName, details = "") {
  if (condition) {
    console.log(`✅ [PASS] ${testName}`);
    passed++;
  } else {
    console.error(`❌ [FAIL] ${testName} ${details ? `(${details})` : ""}`);
    failed++;
  }
}

async function runFeatureTests() {
  console.log("\n=======================================================");
  console.log(" VETALIS SYSTEM-WIDE FEATURE TEST SUITE ");
  console.log("=======================================================\n");

  // ---------------------------------------------------------
  // Test 1: Supabase DB Connection & Tables
  // ---------------------------------------------------------
  console.log("--- 1. Database & Table Accessibility ---");
  try {
    const { data: users, error: userError } = await supabase.from("users").select("id, email, role").limit(5);
    assert(!userError, "Supabase Database Connection", userError?.message);
    assert(Array.isArray(users), "Query 'users' Table", `Returned ${users?.length || 0} rows`);

    const { data: patients, error: pError } = await supabase.from("patients").select("id").limit(5);
    assert(!pError, "Query 'patients' Table", pError?.message);

    const { data: doctors, error: dError } = await supabase.from("doctors").select("id").limit(5);
    assert(!dError, "Query 'doctors' Table", dError?.message);

    const { data: vitals, error: vError } = await supabase.from("vitals").select("id").limit(5);
    assert(!vError, "Query 'vitals' Table", vError?.message);

    const { data: reports, error: rError } = await supabase.from("medical_reports").select("id").limit(5);
    assert(!rError, "Query 'medical_reports' Table", rError?.message);

    const { data: prescriptions, error: prError } = await supabase.from("prescriptions").select("id").limit(5);
    assert(!prError, "Query 'prescriptions' Table", prError?.message);
  } catch (err) {
    assert(false, "Database Connectivity Exception", err.message);
  }

  // ---------------------------------------------------------
  // Test 2: Supabase Storage Bucket & URL Generation
  // ---------------------------------------------------------
  console.log("\n--- 2. Supabase Storage Accessibility ---");
  try {
    const { data: publicUrlData } = supabase.storage.from("medical-reports").getPublicUrl("test-patient/test-report.pdf");
    assert(
      publicUrlData?.publicUrl?.includes("medical-reports"),
      "Supabase Storage URL Generation",
      publicUrlData?.publicUrl
    );
  } catch (err) {
    assert(false, "Storage Bucket Exception", err.message);
  }

  // ---------------------------------------------------------
  // Test 3: AI Provider API & Medical Guardrails
  // ---------------------------------------------------------
  console.log("\n--- 3. Universal AI Provider & Medical Chatbot Guardrails ---");
  const apiKey = getAiApiKey();
  if (!apiKey) {
    console.log("⚠️ [SKIP] AI_API_KEY is not set in environment variables.");
  } else {
    try {
      console.log("Testing Live AI Medical Question with Model:", process.env.AI_MODEL_NAME || "agnes-2.0-flash");
      const medResponse = await generateChatbotResponse("What are standard symptom indicators of type 2 diabetes?");
      assert(
        typeof medResponse === "string" && medResponse.length > 20,
        "Medical Query Response",
        medResponse.substring(0, 80).replace(/\n/g, " ") + "..."
      );

      console.log("Testing Live AI Non-Medical Guardrail Rejection...");
      const nonMedResponse = await generateChatbotResponse("Write a python function to sort a list of numbers.");
      const rejected =
        nonMedResponse.includes("specialized medical AI assistant") ||
        nonMedResponse.toLowerCase().includes("health") ||
        nonMedResponse.toLowerCase().includes("medical advice") ||
        nonMedResponse.toLowerCase().includes("cannot assist");

      assert(
        rejected,
        "Medical Guardrail Non-Medical Rejection",
        `Response snippet: ${nonMedResponse.substring(0, 90).replace(/\n/g, " ")}...`
      );
    } catch (aiErr) {
      assert(false, "AI Test Exception", aiErr.message);
    }
  }

  // ---------------------------------------------------------
  // Summary Results
  // ---------------------------------------------------------
  console.log("\n=======================================================");
  console.log(` TEST SUMMARY: ${passed} PASSED, ${failed} FAILED `);
  console.log("=======================================================\n");

  if (failed > 0) {
    process.exit(1);
  }
}

runFeatureTests();
