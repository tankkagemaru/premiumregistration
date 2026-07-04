import "server-only";
import { authConfigured } from "./applications-shared";

/**
 * Executive overview — aggregate numbers only, no personal records. Runs on the
 * service-role client because the boss role deliberately has no row access
 * under RLS; the page that calls this is gated to admin + boss.
 */
export interface ExecOverview {
  leads: { total: number; new7d: number; uncontacted3d: number };
  funnel: { newCount: number; contacted: number; enrolled: number; conversionPct: number };
  appsByStage: { stage: string; count: number }[];
  lateness: {
    dept: string;
    metric: string;
    count: number;
    level: "ok" | "warn" | "alert";
  }[];
  money: { outstandingFees: number; commissionPayable: number; collectable: number };
  agents: { name: string; leads: number }[];
}

const DAY = 86_400_000;

export async function getExecOverview(): Promise<ExecOverview> {
  if (!authConfigured) {
    return {
      leads: { total: 0, new7d: 0, uncontacted3d: 0 },
      funnel: { newCount: 0, contacted: 0, enrolled: 0, conversionPct: 0 },
      appsByStage: [],
      lateness: [],
      money: { outstandingFees: 0, commissionPayable: 0, collectable: 0 },
      agents: [],
    };
  }
  const { createAdminClient } = await import("@/lib/supabase/admin");
  const admin = createAdminClient();
  const now = Date.now();
  const since = (days: number) => new Date(now - days * DAY).toISOString();

  const [
    { data: leads },
    { data: apps },
    { data: visas },
    { data: fees },
    { data: commissions },
  ] = await Promise.all([
    admin.from("registrations").select("id, status, created_at, agent_code"),
    admin.from("applications").select("id, stage, created_at, class_start, track"),
    admin.from("visa_cases").select("id, stage, created_at"),
    admin.from("fees").select("amount, status, due_date"),
    admin.from("commissions").select("amount, status, direction"),
  ]);

  const L = leads ?? [];
  const A = apps ?? [];
  const V = visas ?? [];
  const F = fees ?? [];
  const C = commissions ?? [];

  const olderThan = (iso: string, days: number) =>
    now - new Date(iso).getTime() > days * DAY;

  const uncontacted3d = L.filter(
    (l) => l.status === "new" && olderThan(l.created_at, 3),
  ).length;
  const newCount = L.filter((l) => l.status === "new").length;
  const contacted = L.filter((l) => l.status === "contacted").length;
  const enrolled = L.filter((l) => l.status === "enrolled").length;

  const stageCounts = A.reduce<Record<string, number>>((acc, a) => {
    acc[a.stage] = (acc[a.stage] ?? 0) + 1;
    return acc;
  }, {});

  // Department lateness — day-granularity heuristics, tune as the team learns.
  const admissionsStuck = A.filter(
    (a) => ["application", "review"].includes(a.stage) && olderThan(a.created_at, 7),
  ).length;
  const visaStuck = V.filter(
    (v) => !["completed", "active"].includes(v.stage) && olderThan(v.created_at, 21),
  ).length;
  const academicMissing = A.filter(
    (a) => ["accepted", "enrolled"].includes(a.stage) && !a.class_start,
  ).length;
  const financeOverdue = F.filter(
    (f) =>
      (f.status === "unpaid" || f.status === "partial") &&
      f.due_date &&
      new Date(f.due_date).getTime() < now,
  ).length;

  const level = (n: number, warnAt = 1, alertAt = 5): "ok" | "warn" | "alert" =>
    n >= alertAt ? "alert" : n >= warnAt ? "warn" : "ok";

  const lateness = [
    { dept: "Marketing / front line", metric: "Leads uncontacted > 3 days", count: uncontacted3d, level: level(uncontacted3d) },
    { dept: "Admissions", metric: "Applications in review > 7 days", count: admissionsStuck, level: level(admissionsStuck) },
    { dept: "Visa", metric: "Visa cases open > 21 days", count: visaStuck, level: level(visaStuck) },
    { dept: "Academic", metric: "Accepted / enrolled without class dates", count: academicMissing, level: level(academicMissing) },
    { dept: "Finance", metric: "Fees past their due date", count: financeOverdue, level: level(financeOverdue) },
  ];

  const outstandingFees = F.filter((f) => f.status === "unpaid" || f.status === "partial")
    .reduce((s, f) => s + Number(f.amount ?? 0), 0);
  const commissionPayable = C.filter((c) => c.direction === "payable" && c.status !== "paid")
    .reduce((s, c) => s + Number(c.amount ?? 0), 0);
  const collectable = C.filter((c) => c.direction === "receivable" && c.status !== "paid")
    .reduce((s, c) => s + Number(c.amount ?? 0), 0);

  const agentCounts = L.reduce<Record<string, number>>((acc, l) => {
    if (l.agent_code) acc[l.agent_code] = (acc[l.agent_code] ?? 0) + 1;
    return acc;
  }, {});
  const agents = Object.entries(agentCounts)
    .map(([name, count]) => ({ name, leads: count }))
    .sort((a, b) => b.leads - a.leads)
    .slice(0, 8);

  return {
    leads: {
      total: L.length,
      new7d: L.filter((l) => l.created_at >= since(7)).length,
      uncontacted3d,
    },
    funnel: {
      newCount,
      contacted,
      enrolled,
      conversionPct: L.length ? Math.round((enrolled / L.length) * 100) : 0,
    },
    appsByStage: Object.entries(stageCounts).map(([stage, count]) => ({ stage, count })),
    lateness,
    money: { outstandingFees, commissionPayable, collectable },
    agents,
  };
}
