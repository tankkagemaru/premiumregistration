import { createClient } from "@/lib/supabase/server";
import { authConfigured } from "./applications-shared";
import type { Fee, Payment, Commission } from "./finance-shared";

export * from "./finance-shared";

/* Mock data references the mock applications (a-0001…a-0004) and agents. */

const MOCK_FEES: Fee[] = [
  {
    id: "f1",
    application_id: "a-0001",
    student_name: "Aisyah binti Rahman",
    type: "registration",
    amount: 500,
    currency: "MYR",
    due_date: "2026-07-10",
    status: "unpaid",
  },
  {
    id: "f2",
    application_id: "a-0002",
    student_name: "Budi Santoso",
    type: "visa_emgs",
    amount: 2500,
    currency: "MYR",
    status: "paid",
  },
  {
    id: "f3",
    application_id: "a-0002",
    student_name: "Budi Santoso",
    type: "tuition",
    label: "Semester 1",
    amount: 28000,
    currency: "MYR",
    due_date: "2026-08-01",
    status: "partial",
  },
  {
    id: "f4",
    application_id: "a-0003",
    student_name: "Nguyen Van An",
    type: "application",
    amount: 100,
    currency: "MYR",
    status: "paid",
  },
  {
    id: "f5",
    application_id: "a-0003",
    student_name: "Nguyen Van An",
    type: "registration",
    amount: 350,
    currency: "MYR",
    due_date: "2026-07-08",
    status: "unpaid",
  },
];

const MOCK_PAYMENTS: Payment[] = [
  { id: "p1", application_id: "a-0002", fee_id: "f2", amount: 2500, method: "bank_transfer", reference: "MBB-88231", paid_at: "2026-06-20" },
  { id: "p2", application_id: "a-0002", fee_id: "f3", amount: 14000, method: "bank_transfer", reference: "MBB-90417", paid_at: "2026-06-30" },
  { id: "p3", application_id: "a-0003", fee_id: "f4", amount: 100, method: "fpx", reference: "FPX-55102", paid_at: "2026-06-26" },
];

const MOCK_COMMISSIONS: Commission[] = [
  {
    id: "c1",
    application_id: "a-0001",
    student_name: "Aisyah binti Rahman",
    agent_id: "s-celia",
    agent_name: "Celia",
    direction: "payable",
    amount: 1200,
    currency: "MYR",
    milestone: "on_enrolment",
    status: "accrued",
  },
  {
    id: "c2",
    application_id: "a-0002",
    student_name: "Budi Santoso",
    agent_id: "s-felix",
    agent_name: "Felix",
    direction: "payable",
    amount: 3500,
    currency: "MYR",
    milestone: "on_enrolment",
    status: "invoiced",
  },
  {
    id: "c3",
    application_id: "a-0002",
    student_name: "Budi Santoso",
    agent_name: "Universiti Putra Malaysia",
    direction: "receivable",
    amount: 8000,
    currency: "MYR",
    milestone: "on_enrolment",
    status: "accrued",
  },
];

export async function listFees(): Promise<Fee[]> {
  if (!authConfigured) return MOCK_FEES;
  const supabase = await createClient();
  const { data } = await supabase
    .from("fees")
    .select("*, applications!inner(students!inner(full_name))")
    .order("due_date", { ascending: true });
  return (data as unknown as Fee[] | null) ?? [];
}

export async function listPayments(): Promise<Payment[]> {
  if (!authConfigured) return MOCK_PAYMENTS;
  const supabase = await createClient();
  const { data } = await supabase
    .from("payments")
    .select("*")
    .order("paid_at", { ascending: false });
  return (data as Payment[] | null) ?? [];
}

export async function listCommissions(agentId?: string): Promise<Commission[]> {
  if (!authConfigured) {
    return agentId
      ? MOCK_COMMISSIONS.filter((c) => c.agent_id === agentId)
      : MOCK_COMMISSIONS;
  }
  const supabase = await createClient();
  let query = supabase
    .from("commissions")
    .select("*, applications!inner(students!inner(full_name))")
    .order("created_at", { ascending: false });
  if (agentId) query = query.eq("agent_id", agentId);
  const { data } = await query;
  return (data as unknown as Commission[] | null) ?? [];
}

export async function listFeesForApp(applicationId: string): Promise<Fee[]> {
  const fees = await listFees();
  return fees.filter((f) => f.application_id === applicationId);
}
