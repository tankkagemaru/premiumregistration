import { createClient } from "@/lib/supabase/server";
import { authConfigured, type Application, type ApplicationDoc, type ApplicationEvent } from "./applications-shared";
import type { Fee, Payment, Commission } from "./finance-shared";
import type { VisaCase } from "./visa-shared";

export interface StudentMaster {
  id: string;
  created_at: string;
  full_name: string;
  email: string;
  phone?: string | null;
  whatsapp?: string | null;
  nationality?: string | null;
  home_country?: string | null;
  passport_no?: string | null;
  date_of_birth?: string | null;
  is_international: boolean;
  agent_code?: string | null;
  guardian?: { full_name?: string; relationship?: string } | null;
}

export interface StudentRecord {
  student: StudentMaster;
  applications: Application[];
  documents: (ApplicationDoc & { application_id: string })[];
  events: (ApplicationEvent & { application_id: string })[];
  fees: Fee[];
  payments: Payment[];
  commissions: Commission[];
  visas: VisaCase[];
}

/** Everything we hold about one student — the basis of the record page + report. */
export async function getStudentRecord(id: string): Promise<StudentRecord | null> {
  if (!authConfigured) return null;
  const supabase = await createClient();
  const { data: student } = await supabase
    .from("students")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (!student) return null;

  const { data: apps } = await supabase
    .from("applications")
    .select("*")
    .eq("student_id", id)
    .order("created_at", { ascending: true });
  const appIds = (apps ?? []).map((a) => a.id as string);

  const empty = Promise.resolve({ data: [] as never[] });
  const [{ data: docs }, { data: events }, { data: fees }, { data: payments }, { data: commissions }, { data: visas }] =
    appIds.length
      ? await Promise.all([
          supabase.from("application_documents").select("*").in("application_id", appIds),
          supabase
            .from("application_events")
            .select("*")
            .in("application_id", appIds)
            .order("created_at", { ascending: false })
            .limit(60),
          supabase.from("fees").select("*").in("application_id", appIds),
          supabase.from("payments").select("*").in("application_id", appIds),
          supabase.from("commissions").select("*").in("application_id", appIds),
          supabase.from("visa_cases").select("*").in("application_id", appIds),
        ])
      : await Promise.all([empty, empty, empty, empty, empty, empty]);

  return {
    student: student as StudentMaster,
    applications: (apps as Application[] | null) ?? [],
    documents: (docs as (ApplicationDoc & { application_id: string })[] | null) ?? [],
    events: (events as (ApplicationEvent & { application_id: string })[] | null) ?? [],
    fees: (fees as Fee[] | null) ?? [],
    payments: (payments as Payment[] | null) ?? [],
    commissions: (commissions as Commission[] | null) ?? [],
    visas: (visas as VisaCase[] | null) ?? [],
  };
}
