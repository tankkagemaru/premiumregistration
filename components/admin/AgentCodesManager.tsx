"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2, Copy, Check } from "lucide-react";
import type { AgentCode } from "@/lib/admin/agent-codes-shared";
import {
  createAgentCode,
  toggleAgentCode,
  deleteAgentCode,
} from "@/app/admin/agent-codes-actions";

const F =
  "rounded-md border border-border-warm bg-cream-50 px-2.5 py-1.5 text-sm text-ink outline-none focus:border-brand-red";

export function AgentCodesManager({
  codes,
  agents = [],
}: {
  codes: AgentCode[];
  agents?: { id: string; full_name: string }[];
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({ agent_name: "", contact: "", code: "", notes: "", profile_id: "" });
  const set = (k: keyof typeof form, v: string) => setForm((f) => ({ ...f, [k]: v }));

  function submit() {
    setError(null);
    start(async () => {
      const res = await createAgentCode({
        agent_name: form.agent_name,
        contact: form.contact || undefined,
        code: form.code || undefined,
        notes: form.notes || undefined,
        profile_id: form.profile_id || undefined,
      });
      if (!res.ok) {
        setError(
          res.error === "duplicate"
            ? "That code is already in use — pick another."
            : res.error === "name"
              ? "Enter the agent's name."
              : res.error === "forbidden"
                ? "You don't have permission to issue codes."
                : "Could not issue the code.",
        );
        return;
      }
      setForm({ agent_name: "", contact: "", code: "", notes: "", profile_id: "" });
      setOpen(false);
      router.refresh();
    });
  }

  async function copy(code: string) {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(code);
      setTimeout(() => setCopied(null), 1500);
    } catch {
      /* clipboard blocked — ignore */
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <p className="text-[11px] font-medium uppercase tracking-[0.22em] text-ink-muted">
          Agent codes
        </p>
        <button
          onClick={() => setOpen((o) => !o)}
          className="inline-flex items-center gap-1.5 rounded-md bg-inkbtn px-3 py-1.5 text-xs font-medium text-oncolor hover:bg-inkbtn-soft"
        >
          <Plus className="h-3.5 w-3.5" aria-hidden />
          Issue code
        </button>
      </div>

      {open && (
        <div className="rounded-card border border-border-warm bg-paper p-4">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <label className="col-span-2 text-xs font-medium text-ink-soft sm:col-span-1">
              Agent name
              <input value={form.agent_name} onChange={(e) => set("agent_name", e.target.value)} placeholder="e.g. Celia" className={`mt-1 w-full ${F}`} />
            </label>
            <label className="col-span-2 text-xs font-medium text-ink-soft sm:col-span-1">
              Contact
              <input value={form.contact} onChange={(e) => set("contact", e.target.value)} placeholder="email or phone" className={`mt-1 w-full ${F}`} />
            </label>
            <label className="col-span-2 text-xs font-medium text-ink-soft sm:col-span-1">
              Custom code
              <input value={form.code} onChange={(e) => set("code", e.target.value)} placeholder="auto if blank" className={`mt-1 w-full font-mono uppercase ${F}`} />
            </label>
            <label className="col-span-2 text-xs font-medium text-ink-soft sm:col-span-1">
              Notes
              <input value={form.notes} onChange={(e) => set("notes", e.target.value)} placeholder="optional" className={`mt-1 w-full ${F}`} />
            </label>
            <label className="col-span-2 text-xs font-medium text-ink-soft sm:col-span-2">
              Link to agent login
              <select value={form.profile_id} onChange={(e) => set("profile_id", e.target.value)} className={`mt-1 w-full ${F}`}>
                <option value="">No login — track by code only</option>
                {agents.map((a) => <option key={a.id} value={a.id}>{a.full_name}</option>)}
              </select>
              <span className="mt-1 block text-[11px] font-normal text-ink-muted">
                Linking sets this code on the agent&apos;s account, so their portal
                shows every lead that used it.
              </span>
            </label>
          </div>
          {error && <p className="mt-2 text-xs text-brand-red">{error}</p>}
          <button
            onClick={submit}
            disabled={pending}
            className="mt-3 rounded-md bg-brand-red px-4 py-2 text-sm font-medium text-oncolor hover:bg-brand-red-soft disabled:opacity-50"
          >
            {pending ? "Issuing…" : "Issue code"}
          </button>
        </div>
      )}

      {codes.length === 0 ? (
        <p className="rounded-card border border-dashed border-border-warm bg-paper px-4 py-8 text-center text-sm text-ink-muted">
          No agent codes yet. Issue one to start tracking referrals.
        </p>
      ) : (
        <div className="overflow-hidden rounded-card border border-border-warm">
          {codes.map((c) => (
            <div
              key={c.id}
              className="flex items-center justify-between gap-3 border-b border-border-warm/60 bg-paper px-4 py-2.5 last:border-0"
            >
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-sm font-medium text-ink">{c.code}</span>
                  <button
                    onClick={() => copy(c.code)}
                    aria-label="Copy code"
                    className="text-ink-muted hover:text-brand-red"
                  >
                    {copied === c.code ? (
                      <Check className="h-3.5 w-3.5 text-status-present" aria-hidden />
                    ) : (
                      <Copy className="h-3.5 w-3.5" aria-hidden />
                    )}
                  </button>
                </div>
                <p className="truncate text-xs text-ink-muted">
                  {c.agent_name}
                  {c.profile_name ? ` · login: ${c.profile_name}` : " · no login"}
                  {c.contact ? ` · ${c.contact}` : ""}
                  {c.issued_by_name ? ` · by ${c.issued_by_name}` : ""}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-3">
                <button
                  onClick={() => start(async () => { await toggleAgentCode(c.id, !c.active); router.refresh(); })}
                  className={`rounded px-1.5 py-0.5 text-[10px] font-medium uppercase ${c.active ? "bg-status-present/15 text-status-present" : "bg-cream-50 text-ink-muted"}`}
                >
                  {c.active ? "Active" : "Off"}
                </button>
                <button
                  onClick={() => start(async () => { await deleteAgentCode(c.id); router.refresh(); })}
                  aria-label="Delete code"
                  className="text-ink-muted hover:text-brand-red"
                >
                  <Trash2 className="h-3.5 w-3.5" aria-hidden />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
