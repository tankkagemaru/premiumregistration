/**
 * Message templates for officer → applicant communication. Pure + client-safe.
 *
 * Robust + adaptable by design: templates are plain data with {placeholders}
 * filled from the record, and the officer can edit the rendered text before
 * sending. Add/adjust templates here now; a Settings UI can manage them later.
 * Built generically so any team (admissions, visa, …) can reuse it — filter by
 * `context` and/or `team`.
 */
import { toWhatsAppNumber } from "@/lib/phone";

export type MessageChannel = "whatsapp" | "email" | "copy";
export type MessageContext = "lead" | "application" | "visa";

export interface MessageTemplate {
  id: string;
  label: string; // button text
  category: string; // grouping in the picker
  subject: string; // used for email
  body: string; // supports {placeholders}
  contexts: MessageContext[]; // where the template is offered
  team?: string[]; // optional role restriction
}

/**
 * Placeholders resolved per record. Unknown/blank ones collapse to "".
 *   {first_name} {full_name} {program} {institution} {stage} {ref}
 *   {missing_docs} {officer} {company}
 */
export const MESSAGE_TEMPLATES: MessageTemplate[] = [
  // — Documents ————————————————————————————————————————————————
  {
    id: "doc_request",
    label: "Request missing docs",
    category: "Documents",
    subject: "Documents needed for your application — Premium",
    body:
      "Hi {first_name},\n\nTo move your application forward we still need the following:\n{missing_docs}\n\nPlease send them at your earliest convenience. Let me know if you have any questions.\n\nBest regards,\n{officer}\n{company}",
    contexts: ["application"],
  },
  {
    id: "doc_received",
    label: "Docs received",
    category: "Documents",
    subject: "We've received your documents — Premium",
    body:
      "Hi {first_name},\n\nThank you — we've received your documents and will review them shortly. We'll update you if anything else is needed.\n\nBest regards,\n{officer}\n{company}",
    contexts: ["application"],
  },
  {
    id: "doc_redo",
    label: "Re-submit a document",
    category: "Documents",
    subject: "A document needs re-submitting — Premium",
    body:
      "Hi {first_name},\n\nOne or more of your documents needs to be re-submitted: {missing_docs}. Could you please send a clearer/updated copy?\n\nThank you,\n{officer}\n{company}",
    contexts: ["application"],
  },
  // — Follow-up ————————————————————————————————————————————————
  {
    id: "welcome",
    label: "Welcome / intro",
    category: "Follow-up",
    subject: "Welcome to Premium",
    body:
      "Hi {first_name},\n\nThank you for registering with {company}. I'm {officer}, your consultant — I'll be guiding you through the process. Feel free to reach out any time.\n\nBest regards,\n{officer}",
    contexts: ["lead", "application"],
  },
  {
    id: "follow_up",
    label: "General follow-up",
    category: "Follow-up",
    subject: "Following up on your enquiry — Premium",
    body:
      "Hi {first_name},\n\nJust following up to see how you're getting on and whether there's anything you need from us.\n\nBest regards,\n{officer}\n{company}",
    contexts: ["lead", "application"],
  },
  {
    id: "status_code",
    label: "Share status code",
    category: "Follow-up",
    subject: "Track your application — Premium",
    body:
      "Hi {first_name},\n\nYou can track your application any time at our status page using your reference code: {ref}\n\nBest regards,\n{officer}\n{company}",
    contexts: ["application"],
  },
  // — Offer / finance ——————————————————————————————————————————
  {
    id: "offer_ready",
    label: "Offer ready",
    category: "Offer & finance",
    subject: "Good news about your application — Premium",
    body:
      "Hi {first_name},\n\nGood news — your offer for {program} {institution} is ready. We'll share the details with you shortly.\n\nBest regards,\n{officer}\n{company}",
    contexts: ["application"],
  },
  {
    id: "payment_reminder",
    label: "Payment reminder",
    category: "Offer & finance",
    subject: "A reminder about your fees — Premium",
    body:
      "Hi {first_name},\n\nThis is a friendly reminder about the outstanding fee for your application. Please let us know if you'd like help with the payment options.\n\nBest regards,\n{officer}\n{company}",
    contexts: ["application"],
  },
  // — Blank ————————————————————————————————————————————————————
  {
    id: "blank",
    label: "Blank message",
    category: "Other",
    subject: "A message from Premium",
    body: "Hi {first_name},\n\n",
    contexts: ["lead", "application", "visa"],
  },
];

/** Replace {placeholders}; unknown keys collapse to an empty string. */
export function renderTemplate(
  text: string,
  vars: Record<string, string | undefined>,
): string {
  return text.replace(/\{(\w+)\}/g, (_, k: string) => vars[k] ?? "");
}

/** wa.me deep link (null if no usable number). */
export function waUrl(phone: string | undefined | null, text: string): string | null {
  const n = toWhatsAppNumber(phone);
  return n ? `https://wa.me/${n}?text=${encodeURIComponent(text)}` : null;
}

/** mailto: deep link with subject + body. */
export function mailtoUrl(email: string, subject: string, body: string): string {
  return `mailto:${email}?subject=${encodeURIComponent(
    subject,
  )}&body=${encodeURIComponent(body)}`;
}
