import "server-only";
import { authConfigured } from "./applications-shared";
import { getFxRates, toMYR } from "./fx";

/**
 * Executive overview — aggregate numbers only, no personal records. Runs on the
 * service-role client because the boss role deliberately has no row access
 * under RLS; the page that calls this is gated to admin + boss.
 */
export interface PerfRow {
  name: string;
  leads: number;
  enrolled: number;
  conversionPct: number;
}

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
  /** Referral-agent performance: leads sourced and how many enrolled. */
  agents: PerfRow[];
  /** Marketing-source performance (utm_source, or "agent referral" / "direct"). */
  marketing: PerfRow[];
  /** Campaign performance (utm_campaign). */
  campaigns: PerfRow[];
  /** Interest by track — leads and enrolments per selected track. */
  byTrack: PerfRow[];
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
      marketing: [],
      campaigns: [],
      byTrack: [],
    };
  }
  const { createAdminClient } = await import("@/lib/supabase/admin");
  const admin = createAdminClient();
  const now = Date.now();

  const [
    { data: leads },
    { data: apps },
    { data: visas },
    { data: fees },
    { data: commissions },
    { data: payments },
    fx,
  ] = await Promise.all([
    admin
      .from("registrations")
      .select("id, status, created_at, agent_code, utm_source, utm_campaign, tracks"),
    admin.from("applications").select("id, stage, created_at, class_start, track"),
    admin.from("visa_cases").select("id, stage, created_at"),
    admin.from("fees").select("id, amount, currency, status, due_date"),
    admin.from("commissions").select("amount, currency, status, direction"),
    admin.from("payments").select("fee_id, amount"),
    getFxRates(),
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
    (a) => ["registration", "admissions"].includes(a.stage) && olderThan(a.created_at, 7),
  ).length;
  const visaStuck = V.filter(
    (v) => !["completed", "active"].includes(v.stage) && olderThan(v.created_at, 21),
  ).length;
  const academicMissing = A.filter(
    (a) => ["visa", "enrolled"].includes(a.stage) && !a.class_start,
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

  // Money position in true MYR: convert each fee/commission from its own
  // currency and net partial payments off outstanding fees — mirrors the
  // finance dashboard so the boss and finance never disagree.
  const P = payments ?? [];
  const paidTowardsFee = (feeId: string) =>
    P.filter((p) => p.fee_id === feeId).reduce((s, p) => s + Number(p.amount ?? 0), 0);
  const outstandingFees = F.filter((f) => f.status === "unpaid" || f.status === "partial")
    .reduce(
      (s, f) =>
        s + toMYR(Math.max(0, Number(f.amount ?? 0) - paidTowardsFee(f.id)), f.currency, fx),
      0,
    );
  const commissionPayable = C.filter((c) => c.direction === "payable" && c.status !== "paid")
    .reduce((s, c) => s + toMYR(Number(c.amount ?? 0), c.currency, fx), 0);
  const collectable = C.filter((c) => c.direction === "receivable" && c.status !== "paid")
    .reduce((s, c) => s + toMYR(Number(c.amount ?? 0), c.currency, fx), 0);

  // Group leads by a key (skipping null keys) into a performance row —
  // leads sourced, how many enrolled, and the conversion rate. Ranked by
  // enrolments first, then volume; capped so the exec view stays scannable.
  const perf = (
    keyOf: (l: (typeof L)[number]) => string | string[] | null | undefined,
    limit = 8,
  ): PerfRow[] => {
    const map = new Map<string, { leads: number; enrolled: number }>();
    for (const l of L) {
      const raw = keyOf(l);
      const keys = Array.isArray(raw) ? raw : raw ? [raw] : [];
      for (const k of keys) {
        const row = map.get(k) ?? { leads: 0, enrolled: 0 };
        row.leads += 1;
        if (l.status === "enrolled") row.enrolled += 1;
        map.set(k, row);
      }
    }
    return Array.from(map.entries())
      .map(([name, r]) => ({
        name,
        leads: r.leads,
        enrolled: r.enrolled,
        conversionPct: r.leads ? Math.round((r.enrolled / r.leads) * 100) : 0,
      }))
      .sort((a, b) => b.enrolled - a.enrolled || b.leads - a.leads)
      .slice(0, limit);
  };

  const agents = perf((l) => l.agent_code);
  const marketing = perf((l) =>
    l.utm_source ?? (l.agent_code ? "agent referral" : "direct"),
  );
  const campaigns = perf((l) => l.utm_campaign);
  const byTrack = perf((l) => (l.tracks as string[] | null) ?? [], 12);

  return {
    leads: {
      total: L.length,
      new7d: L.filter((l) => now - new Date(l.created_at).getTime() < 7 * DAY).length,
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
    marketing,
    campaigns,
    byTrack,
  };
}
