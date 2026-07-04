"use client";

import { useMemo, useState } from "react";
import { MessageCircle, Mail, Copy, Check } from "lucide-react";
import {
  MESSAGE_TEMPLATES,
  renderTemplate,
  waUrl,
  mailtoUrl,
  type MessageChannel,
  type MessageContext,
  type MessageTemplate,
} from "@/lib/admin/messages-shared";

/**
 * Pick a template → auto-filled from the record → edit if needed → send via
 * WhatsApp or email (or copy). Generic: pass the recipient, the interpolation
 * vars, and the context to filter templates. onSent logs it to the timeline.
 */
export function MessageComposer({
  recipient,
  vars,
  context,
  team,
  onSent,
}: {
  recipient: { name: string; email?: string | null; phone?: string | null };
  vars: Record<string, string | undefined>;
  context: MessageContext;
  team?: string;
  onSent?: (channel: MessageChannel, label: string) => void;
}) {
  const [tpl, setTpl] = useState<MessageTemplate | null>(null);
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [copied, setCopied] = useState(false);

  const allVars = useMemo(
    () => ({ first_name: recipient.name.split(" ")[0], ...vars }),
    [recipient.name, vars],
  );

  const templates = MESSAGE_TEMPLATES.filter(
    (t) => t.contexts.includes(context) && (!t.team || !team || t.team.includes(team)),
  );
  const categories = [...new Set(templates.map((t) => t.category))];

  function pick(t: MessageTemplate) {
    setTpl(t);
    setSubject(renderTemplate(t.subject, allVars));
    setBody(renderTemplate(t.body, allVars));
    setCopied(false);
  }

  const wa = waUrl(recipient.phone, body);

  return (
    <div className="flex flex-col gap-3">
      {/* Template picker */}
      <div className="flex flex-col gap-2">
        {categories.map((cat) => (
          <div key={cat} className="flex flex-wrap items-center gap-1.5">
            <span className="mr-1 text-[10px] font-medium uppercase tracking-wide text-ink-muted">
              {cat}
            </span>
            {templates
              .filter((t) => t.category === cat)
              .map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => pick(t)}
                  className={`rounded-full border px-2.5 py-1 text-xs transition-colors ${
                    tpl?.id === t.id
                      ? "border-brand-red bg-brand-red/10 text-brand-red"
                      : "border-border-warm bg-paper text-ink-soft hover:border-ink-muted"
                  }`}
                >
                  {t.label}
                </button>
              ))}
          </div>
        ))}
      </div>

      {/* Editable draft + send */}
      {tpl && (
        <div className="flex flex-col gap-2 rounded-md border border-border-warm bg-paper p-3">
          <input
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder="Subject (email)"
            className="w-full rounded-md border border-border-warm bg-cream-50 px-2.5 py-1.5 text-xs text-ink outline-none focus:border-brand-red"
          />
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={6}
            className="w-full resize-y rounded-md border border-border-warm bg-cream-50 px-2.5 py-2 text-sm text-ink outline-none focus:border-brand-red"
          />
          <div className="flex flex-wrap items-center gap-2">
            {wa && (
              <a
                href={wa}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => onSent?.("whatsapp", tpl.label)}
                className="inline-flex items-center gap-1.5 rounded-md bg-status-present/90 px-3 py-1.5 text-xs font-medium text-oncolor transition-colors hover:bg-status-present"
              >
                <MessageCircle className="h-3.5 w-3.5" aria-hidden />
                WhatsApp
              </a>
            )}
            {recipient.email && (
              <a
                href={mailtoUrl(recipient.email, subject, body)}
                onClick={() => onSent?.("email", tpl.label)}
                className="inline-flex items-center gap-1.5 rounded-md bg-inkbtn px-3 py-1.5 text-xs font-medium text-oncolor transition-colors hover:bg-inkbtn-soft"
              >
                <Mail className="h-3.5 w-3.5" aria-hidden />
                Email
              </a>
            )}
            <button
              type="button"
              onClick={() => {
                void navigator.clipboard?.writeText(body);
                setCopied(true);
                onSent?.("copy", tpl.label);
              }}
              className="inline-flex items-center gap-1.5 rounded-md border border-border-warm bg-paper px-3 py-1.5 text-xs font-medium text-ink transition-colors hover:bg-cream-50"
            >
              {copied ? (
                <Check className="h-3.5 w-3.5 text-status-present" aria-hidden />
              ) : (
                <Copy className="h-3.5 w-3.5" aria-hidden />
              )}
              {copied ? "Copied" : "Copy"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
