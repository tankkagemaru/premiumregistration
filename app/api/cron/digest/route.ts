import { NextResponse } from "next/server";
import { serverEnv, emailConfigured } from "@/lib/env";
import { listLeads } from "@/lib/admin/leads";

export const runtime = "nodejs";

/**
 * Daily digest — intended to run from a Vercel cron (see vercel.json). Sends a
 * per-day summary (new leads, follow-ups due) to the admin alert address. This
 * is what keeps the instant per-lead alerts from becoming noise.
 *
 * Extend later to send a personalised digest per staff member from `profiles`.
 */
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (secret && request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  if (!emailConfigured) {
    return NextResponse.json({ ok: true, skipped: "email_not_configured" });
  }

  const today = new Date().toISOString().slice(0, 10);
  const leads = await listLeads();
  const newLeads = leads.filter((l) => l.created_at.slice(0, 10) === today);
  const dueToday = leads.filter((l) => l.next_action_due === today);
  const overdue = leads.filter(
    (l) => l.next_action_due && l.next_action_due < today && l.status !== "enrolled",
  );

  const { Resend } = await import("resend");
  const resend = new Resend(serverEnv.resendApiKey);
  await resend.emails.send({
    from: serverEnv.emailFrom,
    to: serverEnv.adminAlertEmail!,
    subject: `Daily digest — ${newLeads.length} new, ${dueToday.length} due, ${overdue.length} overdue`,
    html: `<div style="font-family:Inter,Arial,sans-serif;color:#1b1612">
      <h2 style="font-family:Georgia,serif">Today at a glance</h2>
      <ul>
        <li>${newLeads.length} new lead(s)</li>
        <li>${dueToday.length} follow-up(s) due today</li>
        <li>${overdue.length} overdue follow-up(s)</li>
      </ul>
      <a href="${serverEnv.appUrl}/admin">Open console →</a>
    </div>`,
  });

  return NextResponse.json({
    ok: true,
    counts: { new: newLeads.length, dueToday: dueToday.length, overdue: overdue.length },
  });
}
