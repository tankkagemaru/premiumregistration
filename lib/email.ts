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
  accessCode?: string;
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
  const url = `${serverEnv.appUrl}/admin/leads?lead=${lead.id}`;
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
  const statusUrl = `${serverEnv.appUrl}/status`;
  const codeBlock = lead.accessCode
    ? `<div style="margin-top:20px;padding:14px 16px;background:${CREAM};border:1px solid ${LINE};border-radius:8px">
        <p style="font-size:11px;letter-spacing:0.14em;text-transform:uppercase;color:${MUTED};margin:0 0 6px">Your tracking code</p>
        <p style="font-family:monospace;font-size:20px;letter-spacing:0.08em;color:${INK};margin:0">${lead.accessCode}</p>
        <p style="font-size:13px;color:${MUTED};margin:8px 0 0">Track your progress any time at <a href="${statusUrl}" style="color:${RED}">${statusUrl}</a> using this code and your email.</p>
      </div>`
    : "";
  return shell(`
    <p style="font-size:11px;letter-spacing:0.18em;text-transform:uppercase;color:${RED};margin:0 0 8px">Premium Language Centre</p>
    <h1 style="font-family:Georgia,serif;font-size:22px;margin:0 0 16px">Thank you, ${lead.fullName.split(" ")[0]}.</h1>
    <p style="font-size:15px;line-height:1.6;color:${INK};margin:0">
      We've received your registration and a member of our team will reach out to you shortly.
      If you need us sooner, simply reply to this email.
    </p>
    ${codeBlock}
  `);
}

interface Message {
  to: string;
  subject: string;
  html: string;
  replyTo?: string;
}

/** Split `EMAIL_FROM` ("PECSB <inquiry@premium.edu.my>") into name + address. */
function parseFrom(value: string): { name?: string; email: string } {
  const m = value.match(/^\s*(.*?)\s*<([^>]+)>\s*$/);
  return m ? { name: m[1] || undefined, email: m[2] } : { email: value.trim() };
}

/** Brevo transactional API — sends from a verified sender, no domain DNS needed. */
async function sendViaBrevo(msg: Message): Promise<boolean> {
  const from = parseFrom(serverEnv.emailFrom);
  const res = await fetch("https://api.brevo.com/v3/smtp/email", {
    method: "POST",
    headers: {
      "api-key": serverEnv.brevoApiKey!,
      "content-type": "application/json",
      accept: "application/json",
    },
    body: JSON.stringify({
      sender: { email: from.email, ...(from.name ? { name: from.name } : {}) },
      to: [{ email: msg.to }],
      subject: msg.subject,
      htmlContent: msg.html,
      ...(msg.replyTo ? { replyTo: { email: msg.replyTo } } : {}),
    }),
  });
  if (!res.ok) {
    console.error("[email:brevo] failed", res.status, await res.text());
    return false;
  }
  return true;
}

async function sendViaResend(msg: Message): Promise<boolean> {
  const resend = new Resend(serverEnv.resendApiKey);
  const { error } = await resend.emails.send({
    from: serverEnv.emailFrom,
    to: msg.to,
    subject: msg.subject,
    html: msg.html,
    ...(msg.replyTo ? { replyTo: msg.replyTo } : {}),
  });
  if (error) {
    console.error("[email:resend] failed", error);
    return false;
  }
  return true;
}

/**
 * Fire-and-forget transactional email on a new lead: instant admin alert +
 * branded applicant auto-reply. No-ops when no provider is configured. Prefers
 * Brevo when its key is set, else Resend. Failures are logged (not swallowed).
 */
export async function sendNewLeadEmails(lead: NewLead) {
  if (!emailConfigured) return;
  const send = serverEnv.brevoApiKey ? sendViaBrevo : sendViaResend;
  const messages: Message[] = [
    {
      to: serverEnv.adminAlertEmail!,
      subject: `New lead — ${lead.fullName} (${lead.tracks.join(", ")})`,
      html: adminAlertHtml(lead),
      replyTo: lead.email,
    },
    {
      to: lead.email,
      subject: "We've received your registration — Premium Language Centre",
      html: applicantReplyHtml(lead),
    },
  ];
  await Promise.all(
    messages.map((m) =>
      send(m).catch((err) => {
        console.error("[email] send threw", err);
        return false;
      }),
    ),
  );
}
