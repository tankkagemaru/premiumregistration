import "server-only";
import { Resend } from "resend";
import { serverEnv, emailConfigured } from "./env";

const CREAM = "#f4ece3";
const PAPER = "#fdf9f1";
const INK = "#1b1612";
const MUTED = "#8a7e70";
const RED = "#a8242e";
const LINE = "#e8dfd2";
const SERIF = "Georgia, 'Times New Roman', serif";
const SANS = "-apple-system, BlinkMacSystemFont, 'Segoe UI', Inter, Arial, sans-serif";

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

/**
 * Branded email chrome — table-based for client compatibility. A logo + wordmark
 * header, the content card, and a footer with contact details. `kicker` is the
 * small crimson label at the top of the card.
 */
function shell(opts: { kicker: string; title: string; body: string }) {
  const logo = `${serverEnv.appUrl}/pecsb-logo.png`;
  return `<!doctype html><html><body style="margin:0;padding:0;background:${CREAM}">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${CREAM};margin:0;padding:0">
    <tr><td align="center" style="padding:34px 16px">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%">

        <!-- brand header -->
        <tr><td style="padding:0 6px 20px">
          <table role="presentation" cellpadding="0" cellspacing="0"><tr>
            <td style="vertical-align:middle;padding-right:12px">
              <img src="${logo}" width="42" height="42" alt="PECSB" style="display:block;border:0;border-radius:8px" />
            </td>
            <td style="vertical-align:middle">
              <div style="font-family:${SERIF};font-size:19px;color:${INK};line-height:1.1">Premium Language Centre</div>
              <div style="font-family:${SANS};font-size:10px;letter-spacing:0.16em;text-transform:uppercase;color:${MUTED};margin-top:3px">Premium Entrepreneur Consultant Sdn Bhd</div>
            </td>
          </tr></table>
        </td></tr>

        <!-- content card -->
        <tr><td style="background:${PAPER};border:1px solid ${LINE};border-radius:16px;padding:32px 34px;font-family:${SANS};color:${INK}">
          <p style="font-family:${SANS};font-size:11px;letter-spacing:0.2em;text-transform:uppercase;color:${RED};margin:0 0 10px;font-weight:600">${opts.kicker}</p>
          <h1 style="font-family:${SERIF};font-size:24px;font-weight:500;margin:0 0 18px;color:${INK};line-height:1.25">${opts.title}</h1>
          ${opts.body}
        </td></tr>

        <!-- footer -->
        <tr><td style="padding:20px 10px 0;font-family:${SANS};font-size:12px;color:${MUTED};line-height:1.7">
          Premium Entrepreneur Consultant Sdn Bhd · Premium Language Centre, Malaysia<br/>
          <a href="https://premium.edu.my" style="color:${MUTED};text-decoration:underline">premium.edu.my</a>
        </td></tr>

      </table>
    </td></tr>
  </table>
  </body></html>`;
}

function adminAlertHtml(lead: NewLead) {
  const url = `${serverEnv.appUrl}/admin/leads?lead=${lead.id}`;
  const row = (k: string, v?: string) =>
    v
      ? `<tr>
          <td style="padding:9px 0;border-top:1px solid ${LINE};color:${MUTED};font-size:13px">${k}</td>
          <td style="padding:9px 0;border-top:1px solid ${LINE};text-align:right;font-size:13px;color:${INK};font-weight:500">${v}</td>
        </tr>`
      : "";
  const body = `
    <p style="font-size:15px;line-height:1.6;color:${INK};margin:0 0 18px">
      A new enquiry just came in. Details below — reply to this email to reach the applicant directly.
    </p>
    <table role="presentation" style="width:100%;border-collapse:collapse">
      ${row("Interested in", lead.tracks.join(", "))}
      ${row("Email", lead.email)}
      ${row("Phone", lead.phone)}
      ${row("WhatsApp", lead.whatsapp)}
      ${row("Nationality", lead.nationality)}
      ${row("Source", lead.source)}
    </table>
    <table role="presentation" cellpadding="0" cellspacing="0" style="margin-top:24px"><tr><td style="border-radius:8px;background:${RED}">
      <a href="${url}" style="display:inline-block;color:#ffffff;text-decoration:none;padding:12px 24px;border-radius:8px;font-size:14px;font-weight:600;font-family:${SANS}">View lead in console →</a>
    </td></tr></table>`;
  return shell({ kicker: "New lead", title: lead.fullName, body });
}

function applicantReplyHtml(lead: NewLead) {
  const statusUrl = `${serverEnv.appUrl}/status`;
  const codeBlock = lead.accessCode
    ? `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:24px">
        <tr><td style="padding:18px 20px;background:${CREAM};border:1px solid ${LINE};border-radius:12px">
          <p style="font-family:${SANS};font-size:11px;letter-spacing:0.16em;text-transform:uppercase;color:${MUTED};margin:0 0 8px">Your tracking code</p>
          <p style="font-family:'Courier New',monospace;font-size:26px;letter-spacing:0.1em;color:${INK};margin:0;font-weight:700">${lead.accessCode}</p>
          <p style="font-family:${SANS};font-size:13px;color:${MUTED};margin:10px 0 0;line-height:1.6">
            Follow your progress any time at
            <a href="${statusUrl}" style="color:${RED};text-decoration:underline">${statusUrl}</a>
            using this code and your email.
          </p>
        </td></tr>
      </table>`
    : "";
  const body = `
    <p style="font-size:15px;line-height:1.65;color:${INK};margin:0 0 14px">
      Thank you for registering with Premium Language Centre. We've received your details and a
      member of our team will be in touch with you shortly.
    </p>
    <p style="font-size:15px;line-height:1.65;color:${MUTED};margin:0">
      Need us sooner? Just reply to this email and we'll get back to you.
    </p>
    ${codeBlock}`;
  return shell({
    kicker: "Registration received",
    title: `Thank you, ${lead.fullName.split(" ")[0]}.`,
    body,
  });
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
