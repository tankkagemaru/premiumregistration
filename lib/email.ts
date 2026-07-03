import "server-only";
import { Resend } from "resend";
import { serverEnv, emailConfigured } from "./env";

const CREAM = "#f4ece3";
const PAPER = "#fdf9f1";
const INK = "#1b1612";
const MUTED = "#8a7e70";
const RED = "#a8242e";
const LINE = "#e8dfd2";

interface NewLead {
  id: string;
  fullName: string;
  email: string;
  phone?: string;
  whatsapp?: string;
  tracks: string[];
  nationality?: string;
  source?: string;
}

function shell(inner: string) {
  return `<div style="background:${CREAM};padding:32px 0;font-family:Inter,Arial,sans-serif;color:${INK}">
    <div style="max-width:520px;margin:0 auto;background:${PAPER};border:1px solid ${LINE};border-radius:12px;padding:28px 32px">
      ${inner}
      <p style="margin-top:28px;padding-top:16px;border-top:1px solid ${LINE};font-size:12px;color:${MUTED}">
        Premium Entrepreneur Consultant Sdn Bhd · Malaysia
      </p>
    </div>
  </div>`;
}

function adminAlertHtml(lead: NewLead) {
  const url = `${serverEnv.appUrl}/admin/leads/${lead.id}`;
  const row = (k: string, v?: string) =>
    v
      ? `<tr><td style="padding:4px 0;color:${MUTED};font-size:13px">${k}</td><td style="padding:4px 0;text-align:right;font-size:13px">${v}</td></tr>`
      : "";
  return shell(`
    <p style="font-size:11px;letter-spacing:0.18em;text-transform:uppercase;color:${RED};margin:0 0 8px">New lead</p>
    <h1 style="font-family:Georgia,serif;font-size:22px;margin:0 0 16px">${lead.fullName}</h1>
    <table style="width:100%;border-collapse:collapse">
      ${row("Interested in", lead.tracks.join(", "))}
      ${row("Email", lead.email)}
      ${row("Phone", lead.phone)}
      ${row("WhatsApp", lead.whatsapp)}
      ${row("Nationality", lead.nationality)}
      ${row("Source", lead.source)}
    </table>
    <a href="${url}" style="display:inline-block;margin-top:20px;background:${RED};color:${CREAM};text-decoration:none;padding:10px 20px;border-radius:6px;font-size:14px">View lead →</a>
  `);
}

function applicantReplyHtml(lead: NewLead) {
  return shell(`
    <p style="font-size:11px;letter-spacing:0.18em;text-transform:uppercase;color:${RED};margin:0 0 8px">Premium Language Centre</p>
    <h1 style="font-family:Georgia,serif;font-size:22px;margin:0 0 16px">Thank you, ${lead.fullName.split(" ")[0]}.</h1>
    <p style="font-size:15px;line-height:1.6;color:${INK};margin:0">
      We've received your registration and a member of our team will reach out to you shortly.
      If you need us sooner, simply reply to this email.
    </p>
  `);
}

/**
 * Fire-and-forget transactional email on a new lead: instant admin alert +
 * branded applicant auto-reply. No-ops when Resend isn't configured.
 */
export async function sendNewLeadEmails(lead: NewLead) {
  if (!emailConfigured) return;
  const resend = new Resend(serverEnv.resendApiKey);
  try {
    await Promise.allSettled([
      resend.emails.send({
        from: serverEnv.emailFrom,
        to: serverEnv.adminAlertEmail!,
        subject: `New lead — ${lead.fullName} (${lead.tracks.join(", ")})`,
        html: adminAlertHtml(lead),
        replyTo: lead.email,
      }),
      resend.emails.send({
        from: serverEnv.emailFrom,
        to: lead.email,
        subject: "We've received your registration — Premium Language Centre",
        html: applicantReplyHtml(lead),
      }),
    ]);
  } catch (err) {
    console.error("[email] send failed:", err);
  }
}
