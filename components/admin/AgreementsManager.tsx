"use client";

import { useState, useEffect, useTransition } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { X, Plus, FileText, Send, PenLine, Trash2, RefreshCw, Upload, Loader2, Check, ShieldCheck, Award } from "lucide-react";
import {
  AGREEMENT_STATUS_LABEL,
  AGREEMENT_STATUS_TONE,
  AGREEMENT_EVENT_LABEL,
  SCOPE_OPTIONS,
  AGENT_DOC_KINDS,
  MAX_TIERS,
  normalizeScheme,
  tierLabel,
  type AgentAgreement,
  type AgentDocument,
  type AgreementEvent,
  type AgreementParticulars,
  type AgreementScheme,
  type SchemeTier,
  type SchemePriceRow,
} from "@/lib/admin/agreements-shared";
import {
  createAgreement,
  updateAgreementTerms,
  sendAgreementToAgent,
  pecsbCountersign,
  voidAgreement,
  applySchemeToRules,
  createAgreementUploadUrl,
  recordAgreementSignedUpload,
  setAgentDocReview,
  issueCertificate,
} from "@/app/admin/agreement-actions";

const F = "w-full rounded-md border border-border-warm bg-cream-50 px-2.5 py-1.5 text-sm text-ink outline-none focus:border-brand-red";
const LBL = "mb-1 block text-[11px] font-medium uppercase tracking-[0.14em] text-ink-muted";
const BTN = "rounded-md px-3 py-1.5 text-xs font-medium transition-colors";
const NUM = (s: string): number | null => (s.trim() === "" ? null : Number(s) || 0);

function Modal({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted) return null;
  return createPortal(
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto p-4 sm:p-8">
      <div className="absolute inset-0 bg-inkbtn/40" onClick={onClose} aria-hidden />
      <div className="relative z-10 w-full max-w-3xl rounded-card border border-border-warm bg-paper shadow-xl">
        {children}
      </div>
    </div>,
    document.body,
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="border-t border-border-warm/60 px-5 py-4 first:border-0">
      <p className="mb-3 text-[11px] font-medium uppercase tracking-[0.18em] text-ink-muted">{title}</p>
      {children}
    </section>
  );
}

const DOC_TONE: Record<string, string> = {
  pending: "bg-cream-50 text-ink-muted",
  verified: "bg-status-present/15 text-status-present",
  rejected: "bg-brand-red-bg text-brand-red",
};

export function AgreementsManager({
  agreements,
  agents,
  agentDocs = {},
  events = {},
  canEdit,
}: {
  agreements: AgentAgreement[];
  agents: { id: string; full_name: string }[];
  agentDocs?: Record<string, AgentDocument[]>;
  /** Lifecycle events (requests / notices) keyed by agreement id. */
  events?: Record<string, AgreementEvent[]>;
  canEdit: boolean;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [openId, setOpenId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [newAgent, setNewAgent] = useState("");
  const [err, setErr] = useState<string | null>(null);

  const open = agreements.find((a) => a.id === openId) ?? null;
  const withAgreement = new Set(agreements.filter((a) => a.status !== "void").map((a) => a.agent_id));
  const freeAgents = agents.filter((a) => !withAgreement.has(a.id));

  function create() {
    if (!newAgent) return;
    start(async () => {
      const r = await createAgreement(newAgent);
      if (!r.ok) { setErr("Could not create the agreement."); return; }
      setCreating(false);
      setNewAgent("");
      if (r.id) setOpenId(r.id);
      router.refresh();
    });
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-3">
        <p className="max-w-2xl text-sm text-ink-soft">
          Agents request an agreement and upload their due-diligence documents; finance verifies
          them, sets the terms and commission scheme, sends it back to sign, then countersigns to
          activate. You can also start one directly for an agent below.
        </p>
        {canEdit && (
          <button
            onClick={() => { setCreating(true); setErr(null); }}
            className="inline-flex shrink-0 items-center gap-1.5 rounded-md bg-inkbtn px-3 py-2 text-xs font-medium text-oncolor hover:bg-inkbtn-soft"
          >
            <Plus className="h-3.5 w-3.5" aria-hidden /> New agreement
          </button>
        )}
      </div>

      {agreements.length === 0 ? (
        <p className="rounded-card border border-dashed border-border-warm bg-paper px-4 py-6 text-center text-sm text-ink-muted">
          No agreements yet.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-card border border-border-warm">
          <table className="w-full min-w-[560px] text-sm">
            <thead>
              <tr className="border-b border-border-warm bg-cream-50 text-start text-[11px] uppercase tracking-[0.14em] text-ink-muted">
                <th className="px-4 py-2.5 text-start font-medium">Agent</th>
                <th className="px-4 py-2.5 text-start font-medium">Status</th>
                <th className="px-4 py-2.5 text-start font-medium">Docs</th>
                <th className="px-4 py-2.5 text-start font-medium">Signed</th>
                <th className="px-4 py-2.5" />
              </tr>
            </thead>
            <tbody>
              {agreements.map((a) => {
                const ds = agentDocs[a.agent_id] ?? [];
                const verified = ds.filter((d) => d.review_status === "verified").length;
                return (
                  <tr key={a.id} className="border-b border-border-warm/60 bg-paper last:border-0">
                    <td className="px-4 py-2.5">
                      <span className="font-medium text-ink">{a.agent_name ?? "—"}</span>
                      {a.agent_code && <span className="ms-1.5 font-mono text-[11px] text-ink-muted">{a.agent_code}</span>}
                    </td>
                    <td className="px-4 py-2.5">
                      <span className={`inline-flex rounded px-2 py-0.5 text-[11px] font-medium ${AGREEMENT_STATUS_TONE[a.status]}`}>
                        {AGREEMENT_STATUS_LABEL[a.status]}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-xs text-ink-soft">
                      {ds.length ? `${verified}/${ds.length} verified` : "—"}
                    </td>
                    <td className="px-4 py-2.5 text-xs text-ink-soft">
                      {a.agent_signed_at ? `Agent ${String(a.agent_signed_at).slice(0, 10)}` : "—"}
                      {a.pecsb_signed_at ? ` · PECSB ${String(a.pecsb_signed_at).slice(0, 10)}` : ""}
                    </td>
                    <td className="px-4 py-2.5 text-end">
                      <span className="inline-flex items-center gap-2">
                        {a.status !== "requested" && (
                          <a href={`/api/agreement?id=${a.id}`} target="_blank" rel="noopener noreferrer" className="text-xs font-medium text-brand-red hover:underline">
                            PDF
                          </a>
                        )}
                        {canEdit && (
                          <button onClick={() => setOpenId(a.id)} className="text-xs font-medium text-ink hover:text-brand-red">
                            {a.status === "requested" ? "Review" : "Manage"}
                          </button>
                        )}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {err && <p className="text-xs text-brand-red">{err}</p>}

      {creating && (
        <Modal onClose={() => setCreating(false)}>
          <div className="flex items-center justify-between border-b border-border-warm px-5 py-4">
            <p className="font-serif text-lg text-ink">New agreement</p>
            <button onClick={() => setCreating(false)} aria-label="Close" className="text-ink-muted hover:text-ink"><X className="h-5 w-5" aria-hidden /></button>
          </div>
          <div className="flex flex-col gap-3 px-5 py-4">
            <div>
              <label className={LBL}>Agent</label>
              <select value={newAgent} onChange={(e) => setNewAgent(e.target.value)} className={F}>
                <option value="">Choose an agent…</option>
                {freeAgents.map((a) => <option key={a.id} value={a.id}>{a.full_name}</option>)}
              </select>
              {freeAgents.length === 0 && (
                <p className="mt-1 text-xs text-ink-muted">Every agent already has a live agreement — void it first to reissue.</p>
              )}
            </div>
            <div className="flex gap-2">
              <button disabled={pending || !newAgent} onClick={create} className={`${BTN} bg-brand-red text-oncolor hover:bg-brand-red-soft disabled:opacity-50`}>
                {pending ? "Creating…" : "Create draft"}
              </button>
              <button onClick={() => setCreating(false)} className={`${BTN} border border-border-warm text-ink-muted hover:text-ink`}>Cancel</button>
            </div>
          </div>
        </Modal>
      )}

      {open && canEdit && (
        <AgreementEditor
          key={open.id}
          agreement={open}
          docs={agentDocs[open.agent_id] ?? []}
          events={events[open.id] ?? []}
          onClose={() => setOpenId(null)}
        />
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ editor */

function AgreementEditor({
  agreement: a,
  docs,
  events,
  onClose,
}: {
  agreement: AgentAgreement;
  docs: AgentDocument[];
  events: AgreementEvent[];
  onClose: () => void;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [err, setErr] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const editable = ["requested", "draft", "with_agent"].includes(a.status);
  const [p, setP] = useState<AgreementParticulars>({ ...a.particulars });
  const [sc, setSc] = useState<AgreementScheme>(() => normalizeScheme(a.scheme));
  const tiers = sc.tiers ?? [{ up_to: null }];
  const [validFrom, setValidFrom] = useState(a.valid_from ?? "");
  const [validUntil, setValidUntil] = useState(a.valid_until ?? "");
  const [sig, setSig] = useState({ name: "", designation: "" });
  const [voidReason, setVoidReason] = useState("");
  const [uploading, setUploading] = useState(false);

  const requiredKinds = AGENT_DOC_KINDS.filter((k) => k.required).map((k) => k.kind);
  const docByKind = new Map(docs.map((d) => [d.kind, d] as const));
  const allRequiredVerified = requiredKinds.every((k) => docByKind.get(k)?.review_status === "verified");

  const setPart = <K extends keyof AgreementParticulars>(k: K, v: AgreementParticulars[K]) =>
    setP((f) => ({ ...f, [k]: v }));

  // ---- tier management: resize every row's value array to match tier count ----
  function setTiers(next: SchemeTier[]) {
    const n = next.length;
    const resize = (arr: (number | null)[]) => {
      const a2 = [...arr];
      while (a2.length < n) a2.push(null);
      return a2.slice(0, n);
    };
    setSc((s) => ({
      ...s,
      tiers: next,
      university: (s.university ?? []).map((r) => ({ ...r, amounts: resize(r.amounts) })),
      english: (s.english ?? []).map((r) => ({ ...r, pcts: resize(r.pcts) })),
    }));
  }
  const addTier = () => tiers.length < MAX_TIERS && setTiers([...tiers.slice(0, -1), { up_to: 10 * tiers.length }, { up_to: null }]);
  const removeTier = () => tiers.length > 1 && setTiers([...tiers.slice(0, -2), { up_to: null }]);
  const setTierMax = (i: number, v: string) =>
    setTiers(tiers.map((t, ti) => (ti === i ? { up_to: NUM(v) } : t)));

  function save(then?: () => void) {
    setErr(null);
    start(async () => {
      const r = await updateAgreementTerms(a.id, {
        particulars: p,
        scheme: sc,
        valid_from: validFrom || null,
        valid_until: validUntil || null,
      });
      if (!r.ok) { setErr("Could not save — the agreement may be locked."); return; }
      setSaved(true);
      window.setTimeout(() => setSaved(false), 1600);
      router.refresh();
      then?.();
    });
  }

  async function uploadStamped(file: File) {
    setUploading(true);
    setErr(null);
    try {
      const res = await createAgreementUploadUrl(a.id, file.name);
      if ("error" in res) { setErr("Upload not available."); return; }
      const { createClient } = await import("@/lib/supabase/client");
      const supabase = createClient();
      const { error } = await supabase.storage.from("registration-docs").uploadToSignedUrl(res.path, res.token, file);
      if (error) { setErr("Upload failed."); return; }
      await recordAgreementSignedUpload(a.id, res.path);
      router.refresh();
    } finally {
      setUploading(false);
    }
  }

  const scopeSet = new Set(p.scope ?? []);

  return (
    <Modal onClose={onClose}>
      <div className="flex items-center justify-between border-b border-border-warm px-5 py-4">
        <div>
          <p className="font-serif text-lg text-ink">{a.agent_name ?? "Agreement"}</p>
          <span className={`mt-1 inline-flex rounded px-2 py-0.5 text-[11px] font-medium ${AGREEMENT_STATUS_TONE[a.status]}`}>
            {AGREEMENT_STATUS_LABEL[a.status]}
          </span>
        </div>
        <div className="flex items-center gap-3">
          {a.status !== "requested" && (
            <a href={`/api/agreement?id=${a.id}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-xs font-medium text-brand-red hover:underline">
              <FileText className="h-3.5 w-3.5" aria-hidden /> PDF
            </a>
          )}
          {a.signed_doc_path && (
            <a href={`/api/agreement/doc?id=${a.id}`} target="_blank" rel="noopener noreferrer" className="text-xs font-medium text-brand-red hover:underline">
              Signed copy
            </a>
          )}
          <button onClick={onClose} aria-label="Close" className="text-ink-muted hover:text-ink"><X className="h-5 w-5" aria-hidden /></button>
        </div>
      </div>

      <div className="max-h-[70vh] overflow-y-auto">
        {/* ---- Due diligence ---- */}
        <Section title="Due diligence — agent documents">
          {docs.length === 0 ? (
            <p className="text-sm text-ink-muted">No documents uploaded yet.</p>
          ) : (
            <div className="flex flex-col gap-2">
              {docs.map((d) => (
                <div key={d.id} className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-border-warm/70 px-3 py-2">
                  <span className="flex items-center gap-2 text-sm text-ink">
                    <FileText className="h-4 w-4 text-ink-muted" aria-hidden />
                    {AGENT_DOC_KINDS.find((k) => k.kind === d.kind)?.label ?? d.kind}
                    <a href={`/api/agreement/agentdoc?id=${d.id}`} target="_blank" rel="noopener noreferrer" className="text-xs font-medium text-brand-red hover:underline">
                      View
                    </a>
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className={`rounded px-1.5 py-0.5 text-[10px] font-medium uppercase ${DOC_TONE[d.review_status]}`}>{d.review_status}</span>
                    <button disabled={pending} onClick={() => start(async () => { await setAgentDocReview(d.id, "verified"); router.refresh(); })} className={`${BTN} border border-status-present/40 text-status-present hover:bg-status-present-bg disabled:opacity-50`}>Verify</button>
                    <button disabled={pending} onClick={() => start(async () => { await setAgentDocReview(d.id, "rejected"); router.refresh(); })} className={`${BTN} border border-brand-red/40 text-brand-red hover:bg-brand-red-bg disabled:opacity-50`}>Reject</button>
                  </span>
                </div>
              ))}
              <p className={`text-xs ${allRequiredVerified ? "text-status-present" : "text-ink-muted"}`}>
                {allRequiredVerified
                  ? "✓ All required documents verified — you can prepare and send the agreement."
                  : "Verify the required documents (passport + business registration) before sending."}
              </p>
            </div>
          )}
        </Section>

        {/* ---- Terms ---- */}
        <Section title="Terms — Part 1 particulars">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            <div>
              <label className={LBL}>Agreement date</label>
              <input type="date" disabled={!editable} value={p.agreement_date ?? ""} onChange={(e) => setPart("agreement_date", e.target.value)} className={F} />
            </div>
            <div>
              <label className={LBL}>Territory / markets</label>
              <input disabled={!editable} value={p.territory ?? ""} onChange={(e) => setPart("territory", e.target.value)} placeholder="e.g. Libya, MENA" className={F} />
            </div>
            <div>
              <label className={LBL}>Initial term (months)</label>
              <input type="number" disabled={!editable} value={p.term_months ?? ""} onChange={(e) => setPart("term_months", NUM(e.target.value) ?? undefined)} className={F} />
            </div>
            <div>
              <label className={LBL}>Renewal</label>
              <select disabled={!editable} value={p.renewal ?? "written"} onChange={(e) => setPart("renewal", e.target.value as "automatic" | "written")} className={F}>
                <option value="written">By written agreement</option>
                <option value="automatic">Automatic</option>
              </select>
            </div>
            <div>
              <label className={LBL}>Payment period (working days)</label>
              <input type="number" disabled={!editable} value={p.payment_days ?? ""} onChange={(e) => setPart("payment_days", NUM(e.target.value) ?? undefined)} className={F} />
            </div>
            <div>
              <label className={LBL}>Clawback (months)</label>
              <input type="number" disabled={!editable} value={p.clawback_months ?? ""} onChange={(e) => setPart("clawback_months", NUM(e.target.value) ?? undefined)} className={F} />
            </div>
            <div>
              <label className={LBL}>Non-solicitation (months)</label>
              <input type="number" disabled={!editable} value={p.non_solicit_months ?? ""} onChange={(e) => setPart("non_solicit_months", NUM(e.target.value) ?? undefined)} className={F} />
            </div>
            <div className="flex items-end gap-4 pb-1">
              <label className="flex items-center gap-1.5 text-sm text-ink">
                <input type="checkbox" disabled={!editable} checked={!!p.sub_agents} onChange={(e) => setPart("sub_agents", e.target.checked)} /> Sub-agents
              </label>
              <label className="flex items-center gap-1.5 text-sm text-ink">
                <input type="checkbox" disabled={!editable} checked={!!p.minors} onChange={(e) => setPart("minors", e.target.checked)} /> Minors
              </label>
            </div>
            {p.minors && (
              <div>
                <label className={LBL}>Minimum age</label>
                <input type="number" disabled={!editable} value={p.minors_min_age ?? ""} onChange={(e) => setPart("minors_min_age", NUM(e.target.value) ?? undefined)} className={F} />
              </div>
            )}
          </div>
          <div className="mt-3">
            <label className={LBL}>Approved scope</label>
            <div className="flex flex-wrap gap-3">
              {SCOPE_OPTIONS.map((o) => (
                <label key={o.id} className="flex items-center gap-1.5 text-sm text-ink">
                  <input type="checkbox" disabled={!editable} checked={scopeSet.has(o.id)} onChange={(e) => {
                    const next = new Set(scopeSet);
                    if (e.target.checked) next.add(o.id); else next.delete(o.id);
                    setPart("scope", [...next]);
                  }} />
                  {o.label}
                </label>
              ))}
            </div>
          </div>
        </Section>

        {/* ---- Schedule 1: tiers ---- */}
        <Section title="Schedule 1 — commission scheme">
          <div className="mb-4 rounded-md border border-border-warm bg-cream-50/50 p-3">
            <div className="mb-2 flex items-center justify-between">
              <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-ink-muted">
                Volume tiers ({tiers.length}) — per calendar year
              </p>
              {editable && (
                <span className="flex items-center gap-1.5">
                  <button type="button" onClick={removeTier} disabled={tiers.length <= 1} className="rounded border border-border-warm px-2 py-0.5 text-xs text-ink disabled:opacity-40">−</button>
                  <button type="button" onClick={addTier} disabled={tiers.length >= MAX_TIERS} className="rounded border border-border-warm px-2 py-0.5 text-xs text-ink disabled:opacity-40">+ Tier</button>
                </span>
              )}
            </div>
            <div className="flex flex-wrap gap-2">
              {tiers.map((t, i) => {
                const isLast = i === tiers.length - 1;
                return (
                  <div key={i} className="flex items-center gap-1.5 rounded-md border border-border-warm bg-paper px-2 py-1.5">
                    <span className="text-[11px] font-medium text-ink-muted">Tier {i + 1}</span>
                    {isLast ? (
                      <span className="text-xs text-ink-soft">{tiers.length === 1 ? "all students" : "and above"}</span>
                    ) : (
                      <>
                        <span className="text-[11px] text-ink-muted">up to</span>
                        <input type="number" disabled={!editable} value={t.up_to ?? ""} onChange={(e) => setTierMax(i, e.target.value)} className="w-16 rounded border border-border-warm bg-cream-50 px-1.5 py-0.5 text-xs text-ink outline-none focus:border-brand-red" />
                      </>
                    )}
                  </div>
                );
              })}
            </div>
            <p className="mt-1.5 text-[11px] text-ink-muted">
              One tier = a single flat rate. Add tiers for volume bonuses; the top tier is always
              open-ended ({tierLabel(tiers, tiers.length - 1)}).
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:max-w-sm">
            <div>
              <label className={LBL}>Valid from</label>
              <input type="date" disabled={!editable} value={validFrom} onChange={(e) => setValidFrom(e.target.value)} className={F} />
            </div>
            <div>
              <label className={LBL}>Valid until</label>
              <input type="date" disabled={!editable} value={validUntil} onChange={(e) => setValidUntil(e.target.value)} className={F} />
            </div>
          </div>

          <TieredRows
            title="Part A — university placement (RM / student)"
            tiers={tiers}
            editable={editable}
            leadCols={[{ key: "university", label: "University", flex: 2 }, { key: "level", label: "Level", flex: 1 }]}
            valuesKey="amounts"
            rows={(sc.university ?? []) as unknown as Record<string, unknown>[]}
            blank={{ university: "", level: "", amounts: tiers.map(() => null) }}
            onChange={(rows) => setSc((s) => ({ ...s, university: rows as unknown as AgreementScheme["university"] }))}
          />
          <TieredRows
            title="Part B — English programmes (% of tuition)"
            tiers={tiers}
            editable={editable}
            leadCols={[{ key: "length", label: "Programme length", flex: 2 }]}
            valuesKey="pcts"
            suffix="%"
            rows={(sc.english ?? []) as unknown as Record<string, unknown>[]}
            blank={{ length: "", pcts: tiers.map(() => null) }}
            onChange={(rows) => setSc((s) => ({ ...s, english: rows as unknown as AgreementScheme["english"] }))}
          />
          <PlainRows<SchemePriceRow>
            title="Part C — English prices (reference)"
            rows={sc.english_prices ?? []}
            editable={editable}
            cols={[
              { key: "programme", label: "Programme", type: "text", flex: 2 },
              { key: "f2f", label: "F2F RM", type: "number", flex: 1 },
              { key: "online", label: "Online RM", type: "number", flex: 1 },
            ]}
            blank={{ programme: "", f2f: null, online: null }}
            onChange={(rows) => setSc((s) => ({ ...s, english_prices: rows }))}
          />
          <div className="mt-3 grid grid-cols-2 gap-3 sm:max-w-xs">
            <div>
              <label className={LBL}>Special min %</label>
              <input type="number" disabled={!editable} value={sc.special_min_pct ?? ""} onChange={(e) => setSc((s) => ({ ...s, special_min_pct: NUM(e.target.value) ?? undefined }))} className={F} />
            </div>
            <div>
              <label className={LBL}>Special max %</label>
              <input type="number" disabled={!editable} value={sc.special_max_pct ?? ""} onChange={(e) => setSc((s) => ({ ...s, special_max_pct: NUM(e.target.value) ?? undefined }))} className={F} />
            </div>
          </div>
          <PlainRows
            title="Part E — one-time fees (not commissionable)"
            rows={sc.one_time ?? []}
            editable={editable}
            cols={[{ key: "item", label: "Item", type: "text", flex: 2 }, { key: "amount", label: "RM", type: "number", flex: 1 }]}
            blank={{ item: "", amount: null }}
            onChange={(rows) => setSc((s) => ({ ...s, one_time: rows }))}
          />
          <PlainRows
            title="Part F — visa fees (not commissionable)"
            rows={sc.visa ?? []}
            editable={editable}
            cols={[{ key: "item", label: "Duration", type: "text", flex: 2 }, { key: "amount", label: "RM", type: "number", flex: 1 }]}
            blank={{ item: "", amount: null }}
            onChange={(rows) => setSc((s) => ({ ...s, visa: rows }))}
          />
        </Section>

        <Section title="Agent's details (completed in the portal)">
          <p className="text-sm text-ink-soft">
            {p.legal_name ? (
              <>
                {p.legal_name}
                {p.reg_no ? ` · ${p.reg_no}` : ""}
                {p.bank_name ? ` · Bank: ${p.bank_name} ${p.bank_account_no ?? ""}` : " · Bank details pending"}
              </>
            ) : "Waiting for the agent to complete their details after signing is sent."}
          </p>
        </Section>

        {/* ---- Record: requests & notices from the agent ---- */}
        {events.length > 0 && (
          <Section title="Record — requests & notices">
            <div className="flex flex-col gap-2.5">
              {events.map((e) => (
                <div
                  key={e.id}
                  className={`border-s-2 ps-3 ${e.type === "termination_notice" ? "border-brand-red" : "border-border-warm"}`}
                >
                  <p className={`text-sm font-medium ${e.type === "termination_notice" ? "text-brand-red" : "text-ink"}`}>
                    {AGREEMENT_EVENT_LABEL[e.type] ?? e.type}
                  </p>
                  {e.body && <p className="text-xs text-ink-soft">{e.body}</p>}
                  <p className="text-[11px] text-ink-muted">{String(e.created_at).slice(0, 10)}</p>
                </div>
              ))}
            </div>
            <p className="mt-2 text-[11px] text-ink-muted">
              These also arrive in the Requests inbox. Agreed changes are executed as a signed
              variation or addendum; a termination notice ends the Agreement 30 days from the date
              shown (Clause 12b) — void this agreement when it takes effect.
            </p>
          </Section>
        )}

        {/* ---- Actions ---- */}
        <Section title="Actions">
          {err && <p className="mb-2 text-xs text-brand-red">{err}</p>}
          <div className="flex flex-wrap items-center gap-2">
            {editable && (
              <>
                <button disabled={pending} onClick={() => save()} className={`${BTN} bg-inkbtn text-oncolor hover:bg-inkbtn-soft disabled:opacity-50`}>
                  {pending ? "Saving…" : saved ? "Saved ✓" : "Save terms"}
                </button>
                <button
                  disabled={pending || (a.status === "requested" && !allRequiredVerified)}
                  onClick={() => save(() => start(async () => { await sendAgreementToAgent(a.id); router.refresh(); }))}
                  className={`${BTN} inline-flex items-center gap-1.5 bg-brand-red text-oncolor hover:bg-brand-red-soft disabled:opacity-50`}
                >
                  <Send className="h-3.5 w-3.5" aria-hidden />
                  {["draft", "requested"].includes(a.status) ? "Save & send to agent" : "Re-notify agent"}
                </button>
                {a.status === "requested" && !allRequiredVerified && (
                  <span className="text-[11px] text-ink-muted">Verify the required documents first.</span>
                )}
              </>
            )}

            {a.status === "signed_agent" && (
              <div className="flex w-full flex-col gap-2 rounded-md border border-border-warm bg-cream-50/60 p-3">
                <p className="text-xs text-ink-soft">
                  Agent signed {a.agent_signature_kind === "uploaded" ? "(uploaded copy)" : "electronically"}
                  {a.agent_signed_at ? ` on ${String(a.agent_signed_at).slice(0, 10)}` : ""}. Countersign to activate:
                </p>
                <div className="flex flex-wrap gap-2">
                  <input value={sig.name} onChange={(e) => setSig((s) => ({ ...s, name: e.target.value }))} placeholder="Signatory name" className={`${F} max-w-[200px]`} />
                  <input value={sig.designation} onChange={(e) => setSig((s) => ({ ...s, designation: e.target.value }))} placeholder="Designation" className={`${F} max-w-[180px]`} />
                  <button
                    disabled={pending || !sig.name.trim()}
                    onClick={() => start(async () => { const r = await pecsbCountersign(a.id, sig); if (!r.ok) { setErr("Could not countersign."); return; } router.refresh(); })}
                    className={`${BTN} inline-flex items-center gap-1.5 bg-brand-red text-oncolor hover:bg-brand-red-soft disabled:opacity-50`}
                  >
                    <PenLine className="h-3.5 w-3.5" aria-hidden /> Countersign & activate
                  </button>
                </div>
              </div>
            )}

            {a.status === "active" && (
              <button
                disabled={pending}
                onClick={() => start(async () => { const r = await applySchemeToRules(a.id); if (!r.ok) { setErr("Could not apply the scheme."); return; } setSaved(true); window.setTimeout(() => setSaved(false), 1600); router.refresh(); })}
                className={`${BTN} inline-flex items-center gap-1.5 bg-inkbtn text-oncolor hover:bg-inkbtn-soft disabled:opacity-50`}
              >
                {saved ? <Check className="h-3.5 w-3.5" aria-hidden /> : <RefreshCw className="h-3.5 w-3.5" aria-hidden />}
                Apply scheme to commission rules
              </button>
            )}

            {a.status === "active" && (
              <span className="inline-flex items-center gap-2">
                <button
                  disabled={pending}
                  onClick={() => start(async () => { const r = await issueCertificate(a.id); if (!r.ok) { setErr("Could not issue the certificate."); return; } router.refresh(); })}
                  className={`${BTN} inline-flex items-center gap-1.5 border border-brand-gold/50 text-brand-gold hover:bg-status-late-bg disabled:opacity-50`}
                >
                  <Award className="h-3.5 w-3.5" aria-hidden />
                  {a.certificate_issued_at ? "Re-issue certificate" : "Issue certificate"}
                </button>
                <a href={`/api/agreement/certificate?id=${a.id}`} target="_blank" rel="noopener noreferrer" className="text-xs font-medium text-brand-red hover:underline">
                  {a.certificate_issued_at ? "View certificate" : "Preview certificate"}
                </a>
              </span>
            )}

            {["signed_agent", "active"].includes(a.status) && (
              <label className={`${BTN} inline-flex cursor-pointer items-center gap-1.5 border border-border-warm text-ink hover:bg-cream-50`}>
                {uploading ? <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden /> : <Upload className="h-3.5 w-3.5" aria-hidden />}
                Upload stamped copy
                <input type="file" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadStamped(f); e.target.value = ""; }} />
              </label>
            )}

            {a.status !== "void" && (
              <span className="ms-auto inline-flex items-center gap-2">
                <input value={voidReason} onChange={(e) => setVoidReason(e.target.value)} placeholder="Void reason…" className={`${F} max-w-[180px]`} />
                <button
                  disabled={pending || !voidReason.trim()}
                  onClick={() => start(async () => { await voidAgreement(a.id, voidReason); router.refresh(); onClose(); })}
                  className={`${BTN} inline-flex items-center gap-1 border border-brand-red/40 text-brand-red hover:bg-brand-red-bg disabled:opacity-50`}
                >
                  <Trash2 className="h-3.5 w-3.5" aria-hidden /> Void
                </button>
              </span>
            )}
          </div>
          {a.status === "active" && (
            <p className="mt-2 flex items-center gap-1.5 text-xs text-status-present">
              <ShieldCheck className="h-3.5 w-3.5" aria-hidden /> Active and signed by both parties.
            </p>
          )}
        </Section>
      </div>
    </Modal>
  );
}

/* --------------------------------------------- tiered rows (Part A / B) */

function TieredRows({
  title,
  tiers,
  leadCols,
  valuesKey,
  rows,
  blank,
  editable,
  suffix,
  onChange,
}: {
  title: string;
  tiers: SchemeTier[];
  leadCols: { key: string; label: string; flex: number }[];
  valuesKey: "amounts" | "pcts";
  rows: Record<string, unknown>[];
  blank: Record<string, unknown>;
  editable: boolean;
  suffix?: string;
  onChange: (rows: Record<string, unknown>[]) => void;
}) {
  const setLead = (i: number, key: string, v: string) =>
    onChange(rows.map((r, ri) => (ri === i ? { ...r, [key]: v } : r)));
  const setVal = (i: number, ti: number, v: string) =>
    onChange(rows.map((r, ri) => {
      if (ri !== i) return r;
      const arr = [...((r[valuesKey] as (number | null)[]) ?? [])];
      arr[ti] = NUM(v);
      return { ...r, [valuesKey]: arr };
    }));

  return (
    <div className="mt-4">
      <div className="mb-1.5 flex items-center justify-between">
        <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-ink-muted">{title}</p>
        {editable && (
          <button type="button" onClick={() => onChange([...rows, { ...blank }])} className="text-xs font-medium text-brand-red hover:underline">+ Add row</button>
        )}
      </div>
      {rows.length === 0 ? (
        <p className="rounded-md border border-dashed border-border-warm px-3 py-2 text-xs text-ink-muted">Not applicable</p>
      ) : (
        <div className="overflow-x-auto">
          <div className="flex min-w-[420px] flex-col gap-1.5">
            <div className="flex gap-1.5 pe-7">
              {leadCols.map((c) => <span key={c.key} style={{ flex: c.flex }} className="text-[10px] uppercase tracking-wide text-ink-muted">{c.label}</span>)}
              {tiers.map((_, ti) => (
                <span key={ti} style={{ flex: 1 }} className="text-[10px] uppercase tracking-wide text-ink-muted">{tierLabel(tiers, ti)}</span>
              ))}
            </div>
            {rows.map((r, i) => (
              <div key={i} className="flex items-center gap-1.5">
                {leadCols.map((c) => (
                  <input key={c.key} style={{ flex: c.flex }} disabled={!editable} value={(r[c.key] as string) ?? ""} onChange={(e) => setLead(i, c.key, e.target.value)} className={F} />
                ))}
                {tiers.map((_, ti) => {
                  const arr = (r[valuesKey] as (number | null)[]) ?? [];
                  return (
                    <div key={ti} style={{ flex: 1 }} className="flex items-center gap-1">
                      <input type="number" disabled={!editable} value={arr[ti] == null ? "" : String(arr[ti])} onChange={(e) => setVal(i, ti, e.target.value)} className={F} />
                      {suffix && <span className="text-xs text-ink-muted">{suffix}</span>}
                    </div>
                  );
                })}
                {editable && (
                  <button type="button" aria-label="Remove row" onClick={() => onChange(rows.filter((_, ri) => ri !== i))} className="shrink-0 text-ink-muted hover:text-brand-red">
                    <X className="h-4 w-4" aria-hidden />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/* --------------------------------------------- plain rows (Parts C/E/F) */

function PlainRows<T extends Record<string, string | number | null>>({
  title, rows, cols, blank, editable, onChange,
}: {
  title: string;
  rows: T[];
  cols: { key: keyof T & string; label: string; type: "text" | "number"; flex: number }[];
  blank: T;
  editable: boolean;
  onChange: (rows: T[]) => void;
}) {
  const setCell = (i: number, key: keyof T & string, raw: string, type: "text" | "number") =>
    onChange(rows.map((r, ri) => (ri === i ? ({ ...r, [key]: type === "number" ? NUM(raw) : raw } as T) : r)));
  return (
    <div className="mt-4">
      <div className="mb-1.5 flex items-center justify-between">
        <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-ink-muted">{title}</p>
        {editable && <button type="button" onClick={() => onChange([...rows, { ...blank }])} className="text-xs font-medium text-brand-red hover:underline">+ Add row</button>}
      </div>
      {rows.length === 0 ? (
        <p className="rounded-md border border-dashed border-border-warm px-3 py-2 text-xs text-ink-muted">Not applicable</p>
      ) : (
        <div className="flex flex-col gap-1.5">
          <div className="flex gap-1.5 pe-7">
            {cols.map((c) => <span key={c.key} style={{ flex: c.flex }} className="text-[10px] uppercase tracking-wide text-ink-muted">{c.label}</span>)}
          </div>
          {rows.map((r, i) => (
            <div key={i} className="flex items-center gap-1.5">
              {cols.map((c) => (
                <input key={c.key} style={{ flex: c.flex }} type={c.type} disabled={!editable} value={r[c.key] == null ? "" : String(r[c.key])} onChange={(e) => setCell(i, c.key, e.target.value, c.type)} className={F} />
              ))}
              {editable && (
                <button type="button" aria-label="Remove row" onClick={() => onChange(rows.filter((_, ri) => ri !== i))} className="shrink-0 text-ink-muted hover:text-brand-red">
                  <X className="h-4 w-4" aria-hidden />
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
