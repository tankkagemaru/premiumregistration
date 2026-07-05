"use server";

import { getProfile } from "@/lib/auth";
import { authConfigured } from "@/lib/admin/applications-shared";
import { listLeads } from "@/lib/admin/leads";
import { listRequests } from "@/lib/admin/requests";
import { listVisaCases } from "@/lib/admin/visa";
import { listFees } from "@/lib/admin/finance";
import { getStalenessDays } from "@/lib/admin/settings";
import { leadStaleness } from "@/lib/config/staleness";

export interface UrgentItem {
  label: string;
  count: number;
  href: string;
}

const LEAD_ROLES = ["admin", "marketing", "admissions", "counsellor", "staff"];

/**
 * What deserves a heads-up the moment this person signs in. Everything is
 * queried under the caller's own RLS, so each role only sees its own world.
 * Returns [] when there is nothing urgent — the popup simply doesn't show.
 */
export async function getUrgentSummary(): Promise<UrgentItem[]> {
  if (!authConfigured) return [];
  const profile = await getProfile();
  if (!profile || ["boss", "agent"].includes(profile.role)) return [];

  const items: UrgentItem[] = [];
  const today = new Date().toISOString().slice(0, 10);
  const role = profile.role;

  // Leads going cold + overdue follow-ups (lead-facing roles).
  if (LEAD_ROLES.includes(role)) {
    const [leads, stalenessDays] = await Promise.all([
      listLeads(),
      getStalenessDays(),
    ]);
    const now = new Date();
    const stale = leads.filter(
      (l) => leadStaleness(l, now, stalenessDays).level !== "ok",
    ).length;
    if (stale > 0)
      items.push({
        label: "Leads going cold — uncontacted or missing a follow-up",
        count: stale,
        href: "/admin/leads?stage=attention",
      });
    const overdueMine = leads.filter(
      (l) =>
        l.next_action_due &&
        l.next_action_due < today &&
        l.status !== "enrolled" &&
        l.status !== "dropped" &&
        (role === "admin" || l.assigned_to === profile.id),
    ).length;
    if (overdueMine > 0)
      items.push({
        label: role === "admin" ? "Overdue follow-ups (all staff)" : "Your follow-ups overdue",
        count: overdueMine,
        href: "/admin/follow-ups?stage=overdue",
      });
  }

  // Open requests waiting on this person's team.
  const requests = await listRequests();
  const forMyTeam = requests.filter(
    (r) => r.status === "open" && (role === "admin" || r.to_role === role),
  ).length;
  if (forMyTeam > 0)
    items.push({
      label: "Open requests waiting on your team",
      count: forMyTeam,
      href: "/admin/requests?stage=team",
    });

  // Student passes expiring within 45 days (visa + admin).
  if (["admin", "visa"].includes(role)) {
    const soon = new Date(Date.now() + 45 * 86_400_000).toISOString().slice(0, 10);
    const expiring = (await listVisaCases()).filter(
      (v) => v.student_pass_expiry && v.student_pass_expiry <= soon,
    ).length;
    if (expiring > 0)
      items.push({
        label: "Student passes expiring within 45 days",
        count: expiring,
        href: "/admin/visa?stage=attention",
      });
  }

  // Fees past their due date (finance + admin).
  if (["admin", "finance"].includes(role)) {
    const overdue = (await listFees()).filter(
      (f) =>
        (f.status === "unpaid" || f.status === "partial") &&
        f.due_date &&
        f.due_date < today,
    ).length;
    if (overdue > 0)
      items.push({
        label: "Fees past their due date",
        count: overdue,
        href: "/admin/finance?stage=outstanding",
      });
  }

  return items;
}
