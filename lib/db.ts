/**
 * Supabase Database Client & Compatibility Helpers
 */

import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

export const supabase = createClient(
  supabaseUrl || "https://placeholder.supabase.co",
  supabaseKey || "placeholder-key"
);

// Tagged template function 'sql' replacement for Supabase
export async function sql(strings: TemplateStringsArray, ...values: any[]): Promise<any[]> {
  const fullText = strings.join("?");
  const lower = fullText.toLowerCase().trim();
  
  try {
    if (lower.includes("from users")) {
      let query = supabase.from("users").select("*");
      if (lower.includes("where role =")) {
        const role = values[0];
        query = query.eq("role", role);
      } else if (lower.includes("where id =")) {
        const id = values[0];
        const { data } = await supabase.from("users").select("*").eq("id", id);
        return data || [];
      } else if (lower.includes("where email =")) {
        const email = values[0];
        const { data } = await supabase.from("users").select("*").eq("email", email);
        return data || [];
      }
      const { data } = await query;
      return data || [];
    }
    
    if (lower.includes("select count(*) as count from patients")) {
      const { count } = await supabase.from("patients").select("*", { count: "exact", head: true });
      return [{ count: count || 0 }];
    }
    if (lower.includes("select count(*) as count from doctors")) {
      const { count } = await supabase.from("doctors").select("*", { count: "exact", head: true });
      return [{ count: count || 0 }];
    }
    if (lower.includes("select count(*) as count from prescriptions where status = 'active'")) {
      const { count } = await supabase.from("prescriptions").select("*", { count: "exact", head: true }).eq("status", "active");
      return [{ count: count || 0 }];
    }
    if (lower.includes("select count(*) as count from medical_reports")) {
      const { count } = await supabase.from("medical_reports").select("*", { count: "exact", head: true });
      return [{ count: count || 0 }];
    }
    
    if (lower.includes("from patients")) {
      let query = supabase.from("patients").select("*");
      if (values.length > 0 && lower.includes("id =")) {
        query = query.eq("id", values[0]);
      }
      const { data } = await query;
      return data || [];
    }

    if (lower.includes("from prescriptions")) {
      let query = supabase.from("prescriptions").select("*");
      if (values.length > 0 && lower.includes("patient_id =")) {
        query = query.eq("patient_id", values[0]);
      } else if (values.length > 0 && lower.includes("doctor_id =")) {
        query = query.eq("doctor_id", values[0]);
      }
      const { data } = await query;
      return data || [];
    }

    if (lower.includes("from vitals")) {
      let query = supabase.from("vitals").select("*");
      if (values.length > 0 && lower.includes("patient_id =")) {
        query = query.eq("patient_id", values[0]);
      }
      const { data } = await query;
      return data || [];
    }

    if (lower.includes("from medical_reports")) {
      let query = supabase.from("medical_reports").select("*");
      if (values.length > 0 && lower.includes("patient_id =")) {
        query = query.eq("patient_id", values[0]);
      }
      const { data } = await query;
      return data || [];
    }

    if (lower.includes("from notifications")) {
      let query = supabase.from("notifications").select("*");
      if (values.length > 0 && lower.includes("user_id =")) {
        query = query.eq("user_id", values[0]);
      }
      const { data } = await query;
      return data || [];
    }
  } catch (err) {
    console.error("SQL template fallback error:", err);
  }

  return [];
}

export async function query<T = any>(
  queryText: string,
  params: any[] = []
): Promise<T[]> {
  return [] as T[];
}

export async function queryOne<T = any>(
  queryText: string,
  params: any[] = []
): Promise<T | null> {
  const results = await query<T>(queryText, params);
  return results.length > 0 ? results[0] : null;
}

export async function execute(
  queryText: string,
  params: any[] = []
): Promise<{ rowCount: number }> {
  return { rowCount: 1 };
}
