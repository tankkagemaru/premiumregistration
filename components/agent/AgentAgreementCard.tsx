"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { FileText, PenLine, Upload, Loader2, Check, ShieldCheck, Award } from "lucide-react";
import {
  AGREEMENT_STATUS_LABEL,
  AGREEMENT_STATUS_TONE,
  AGENT_FIELD_LABEL,
  AGENT_PARTICULAR_KEYS,
  missingAgentFields,
  type AgentAgreement,
  type AgreementParticulars,
} from "@/lib/admin/agreements-shared";
import {
  agentUpdateOwnFields,
  agentSignAgreement,
  createAgreementUploadUrl,
  recordAgreementSignedUpload,
} from "@/app/admin/agreement-actions";

const F = "w-full rounded-md border border-border-warm bg-cream-50 px-2.5 py-2 text-sm text-ink outline-none focus:border-brand-red";
const LBL = "mb-1 block text-[11px] font-medium uppercase tracking-[0.14em] text-ink-muted";

/** The agent's recruitment agreement in their portal: complete your details,
 *  then sign electronically — or download the PDF, sign it, and upload a scan.
 *  The executed agreement is an English-language document (Clause 23h). */
export function AgentAgreementCard({ agreement: a }: { agreement: AgentAgreement }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [err, setErr] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [uploading, setUploading] = useState(false);

  const p = a.particulars ?? {};
  const [form, setForm] = useState<Partial<AgreementParticulars>>(() => {
    const init: Partial<AgreementParticulars> = {};
    for (const k of AGENT_PARTICULAR_KEYS) init[k] = (p[k] as string | undefined) ?? "";
    return init;
  });
  const [sig, setSig] = useState({
    name: p.signatory_name ?? "",
    designation: p.signatory_designation ?? "",
    agree: false,
  });

  const editable = a.status === "with_agent";
  const missing = missingAgentFields({ ...p, ...form });

  function saveDetails(then?: () => void) {
    setErr(null);
    start(async () => {
      const r = await agentUpdateOwnFields(a.id, form);
      if (!r.ok) { setErr("Could not save your details."); return; }
      setSaved(true);
      window.setTimeout(() => setSaved(false), 1600);
      router.refresh();
      then?.();
    });
  }

  function sign() {
    setErr(null);
    if (!sig.agree || !sig.name.trim()) return;
    start(async () => {
      // Persist the latest field values first, then sign in the same flow.
      const s1 = await agentUpdateOwnFields(a.id, form);
      if (!s1.ok) { setErr("Could not save your details."); return; }
      const r = await agentSignAgreement(a.id, { name: sig.name, designation: sig.designation });
      if (!r.ok) {
        setErr(r.error === "incomplete" ? "Complete the required details first." : "Could not sign — try again.");
        return;
      }
      router.refresh();
    });
  }

  async function uploadSigned(file: File) {
    setUploading(true);
    setErr(null);
    try {
      const res = await createAgreementUploadUrl(a.id, file.name);
      if ("error" in res) { setErr("Upload not available."); return; }
      const { createClient } = await import("@/lib/supabase/client");
      const supabase = createClient();
      const { error } = await supabase.storage.from("registration-docs").uploadToSignedUrl(res.path, res.token, file);
      if (error) { setErr("Upload failed. Try again."); return; }
      await recordAgreementSignedUpload(a.id, res.path);
      router.refresh();
    } finally {
      setUploading(false);
    }
  }

  const set = (k: keyof AgreementParticulars, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const field = (k: (typeof AGENT_PARTICULAR_KEYS)[number], span2 = false) => (
    <div key={k} className={span2 ? "sm:col-span-2" : undefined}>
      <label className={LBL}>{AGENT_FIELD_LABEL[k]}</label>
      <input
        disabled={!editable || pending}
        value={(form[k] as string) ?? ""}
        onChange={(e) => set(k, e.target.value)}
        className={F}
      />
    </div>
  );

  return (
    <div className="rounded-card border border-border-warm bg-paper p-5">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <p className="text-[11px] font-medium uppercase tracking-[0.22em] text-ink-muted">
          Recruitment agreement
        </p>
        <span className="flex items-center gap-2">
          <span className={`inline-flex rounded px-2 py-0.5 text-[11px] font-medium ${AGREEMENT_STATUS_TONE[a.status]}`}>
            {AGREEMENT_STATUS_LABEL[a.status]}
          </span>
          <a
            href={`/api/agreement?id=${a.id}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-xs font-medium text-brand-red hover:underline"
          >
            <FileText className="h-3.5 w-3.5" aria-hidden /> PDF
          </a>
          {a.signed_doc_path && (
            <a
              href={`/api/agreement/doc?id=${a.id}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs font-medium text-brand-red hover:underline"
            >
              Signed copy
            </a>
          )}
        </span>
      </div>

      {a.status === "active" && (
        <div className="flex flex-col gap-3">
          <p className="flex items-center gap-2 text-sm text-status-present">
            <ShieldCheck className="h-4 w-4" aria-hidden />
            Active{a.valid_until ? ` until ${a.valid_until}` : ""} — signed by both parties.
          </p>
          {a.certificate_issued_at ? (
            <a
              href={`/api/agreement/certificate?id=${a.id}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex w-fit items-center gap-2 rounded-md border border-brand-gold/50 bg-status-late-bg px-4 py-2.5 text-sm font-medium text-brand-gold transition-colors hover:bg-status-late-bg/70"
            >
              <Award className="h-4 w-4" aria-hidden />
              Download your authorised-agent certificate
            </a>
          ) : (
            <p className="text-xs text-ink-muted">
              Your authorised-agent certificate will appear here once PECSB issues it.
            </p>
          )}
        </div>
      )}
      {a.status === "signed_agent" && (
        <p className="text-sm text-ink-soft">
          Thank you — you signed on {String(a.agent_signed_at ?? "").slice(0, 10)}. PECSB will
          countersign to bring the agreement into force; you&apos;ll see it turn Active here.
        </p>
      )}

      {editable && (
        <div className="flex flex-col gap-4">
          <p className="text-sm text-ink-soft">
            Complete your details below, then sign electronically — or download the PDF, sign it,
            and upload the scan. The commission scheme itself is set by PECSB finance; open the PDF
            to review the full terms before signing.
          </p>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {field("legal_name")}
            {field("reg_no")}
            {field("address", true)}
            {field("signatory_name")}
            {field("signatory_id")}
            {field("signatory_designation")}
            {field("notice_attn")}
            {field("notice_email")}
            {field("notice_tel")}
            {field("bank_name")}
            {field("bank_account_name")}
            {field("bank_account_no")}
          </div>

          <div className="flex items-center gap-2">
            <button
              disabled={pending}
              onClick={() => saveDetails()}
              className="rounded-md border border-border-warm bg-paper px-3 py-1.5 text-xs font-medium text-ink hover:bg-cream-50 disabled:opacity-50"
            >
              {pending ? "Saving…" : saved ? "Saved ✓" : "Save details"}
            </button>
            {missing.length > 0 && (
              <span className="text-[11px] text-ink-muted">
                Still needed: {missing.map((k) => AGENT_FIELD_LABEL[k]).join(", ")}
              </span>
            )}
          </div>

          {/* Sign electronically */}
          <div className="rounded-md border border-border-warm bg-cream-50/60 p-4">
            <p className="mb-2 text-[11px] font-medium uppercase tracking-[0.14em] text-ink-muted">
              Sign electronically
            </p>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label className={LBL}>Type your full legal name as signature</label>
                <input value={sig.name} onChange={(e) => setSig((s) => ({ ...s, name: e.target.value }))} className={`${F} font-serif text-lg`} placeholder="Your full name" />
              </div>
              <div>
                <label className={LBL}>Designation</label>
                <input value={sig.designation} onChange={(e) => setSig((s) => ({ ...s, designation: e.target.value }))} className={F} placeholder="e.g. Director" />
              </div>
            </div>
            <label className="mt-3 flex items-start gap-2 text-xs text-ink-soft">
              <input type="checkbox" checked={sig.agree} onChange={(e) => setSig((s) => ({ ...s, agree: e.target.checked }))} className="mt-0.5" />
              I confirm I am the authorised signatory, I have read the full Agreement (PDF above)
              including Schedule 1, and I agree that this electronic signature is as valid as an
              original (Clause 23f).
            </label>
            <button
              disabled={pending || !sig.agree || !sig.name.trim() || missing.length > 0}
              onClick={sign}
              className="mt-3 inline-flex items-center gap-1.5 rounded-md bg-brand-red px-4 py-2 text-sm font-medium text-oncolor hover:bg-brand-red-soft disabled:opacity-50"
            >
              <PenLine className="h-4 w-4" aria-hidden />
              {pending ? "Signing…" : "Sign agreement"}
            </button>
          </div>

          {/* Or upload a wet-signed copy */}
          <div className="flex flex-wrap items-center gap-2 text-xs text-ink-soft">
            <span>Prefer paper? Download the PDF, sign & stamp it, then</span>
            <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-md border border-border-warm bg-paper px-2.5 py-1.5 font-medium text-ink hover:bg-cream-50">
              {uploading ? <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden /> : <Upload className="h-3.5 w-3.5" aria-hidden />}
              Upload signed copy
              <input type="file" accept=".pdf,image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadSigned(f); e.target.value = ""; }} />
            </label>
          </div>
        </div>
      )}

      {a.status === "active" && a.agent_signed_at && (
        <p className="mt-2 flex items-center gap-1.5 text-xs text-ink-muted">
          <Check className="h-3.5 w-3.5 text-status-present" aria-hidden />
          Signed {a.agent_signature_kind === "uploaded" ? "(uploaded copy)" : "electronically"} on{" "}
          {String(a.agent_signed_at).slice(0, 10)}
          {a.pecsb_signed_at ? ` · countersigned ${String(a.pecsb_signed_at).slice(0, 10)}` : ""}
        </p>
      )}

      {err && <p className="mt-2 text-xs text-brand-red">{err}</p>}
    </div>
  );
}
