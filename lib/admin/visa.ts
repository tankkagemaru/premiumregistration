import { createClient } from "@/lib/supabase/server";
import { authConfigured } from "./applications-shared";
import type { VisaCase } from "./visa-shared";

export * from "./visa-shared";

const MOCK_CASES: VisaCase[] = [
  {
    id: "v1",
    application_id: "a-0002",
    student_name: "Budi Santoso",
    target: "Universiti Putra Malaysia (UPM)",
    submitted_by: "pecsb", // public university → PECSB files
    emgs_ref: "EMGS-2026-88123",
    stage: "medical",
    medical_status: "pending",
  },
  {
    id: "v2",
    application_id: "a-0003",
    student_name: "Nguyen Van An",
    target: "General English (PLC)",
    submitted_by: "pecsb", // PLC's own course → PECSB files
    stage: "docs_prep",
  },
  {
    id: "v3",
    application_id: "a-0004",
    student_name: "Fatima Al-Zahra",
    target: "IELTS Preparation (PLC)",
    submitted_by: "pecsb",
    emgs_ref: "EMGS-2025-41077",
    stage: "pass_active",
    medical_status: "passed",
    student_pass_expiry: "2026-08-15",
  },
];

export async function listVisaCases(): Promise<VisaCase[]> {
  if (!authConfigured) return MOCK_CASES;
  const supabase = await createClient();
  const { data } = await supabase
    .from("visa_cases")
    .select(
      "*, applications!inner(target_institution, students!inner(full_name))",
    )
    .order("created_at", { ascending: false });
  return (data as unknown as VisaCase[] | null) ?? [];
}

export async function getVisaCaseForApp(
  applicationId: string,
): Promise<VisaCase | null> {
  const cases = await listVisaCases();
  return cases.find((c) => c.application_id === applicationId) ?? null;
}
