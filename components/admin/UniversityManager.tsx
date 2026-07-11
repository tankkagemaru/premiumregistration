"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Search, ChevronDown, Plus, Pencil, Trash2, X, ExternalLink, Check,
} from "lucide-react";
import type { University } from "@/lib/admin/universities-shared";
import {
  createUniversity, updateUniversity, deleteUniversity, upsertProgramme, removeProgramme,
} from "@/app/admin/university-actions";

const F =
  "rounded-md border border-border-warm bg-cream-50 px-2.5 py-1.5 text-sm text-ink outline-none focus:border-brand-red";

export function UniversityManager({
  universities,
  canEdit,
}: {
  universities: University[];
  canEdit: boolean;
}) {
  const [query, setQuery] = useState("");
  const [ccy, setCcy] = useState("all");
  const [typ, setTyp] = useState("all");
  const [addOpen, setAddOpen] = useState(false);

  const currencies = useMemo(
    () => Array.from(new Set(universities.map((u) => u.currency))).sort(),
    [universities],
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return universities.filter((u) => {
      if (ccy !== "all" && u.currency !== ccy) return false;
      if (typ !== "all" && (u.type ?? "") !== typ) return false;
      if (!q) return true;
      if (`${u.name} ${u.short_name ?? ""} ${u.location ?? ""}`.toLowerCase().includes(q)) return true;
      return Object.keys(u.programmes).some((p) => p.toLowerCase().includes(q));
    });
  }, [universities, query, ccy, typ]);

  const totalProgrammes = filtered.reduce((s, u) => s + Object.keys(u.programmes).length, 0);

  return (
    <div className="flex flex-col gap-4">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex min-w-[220px] flex-1 items-center gap-2 rounded-card border border-border-warm bg-paper px-3 py-2">
          <Search className="h-4 w-4 shrink-0 text-ink-muted" aria-hidden />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search university, location or programme…"
            className="w-full bg-transparent text-sm text-ink outline-none placeholder:text-ink-muted/70"
          />
        </div>
        <select value={ccy} onChange={(e) => setCcy(e.target.value)} className={F} aria-label="Currency">
          <option value="all">All currencies</option>
          {currencies.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
        <select value={typ} onChange={(e) => setTyp(e.target.value)} className={F} aria-label="Type">
          <option value="all">All types</option>
          <option value="Public">Public</option>
          <option value="Private">Private</option>
        </select>
        {canEdit && (
          <button
            onClick={() => setAddOpen((o) => !o)}
            className="inline-flex items-center gap-1 rounded-md bg-inkbtn px-3 py-2 text-sm font-medium text-oncolor hover:bg-inkbtn-soft"
          >
            <Plus className="h-4 w-4" aria-hidden /> University
          </button>
        )}
      </div>

      <p className="text-xs text-ink-muted">
        {filtered.length} universit{filtered.length === 1 ? "y" : "ies"} · {totalProgrammes} programmes
      </p>

      {canEdit && addOpen && <AddUniversity onClose={() => setAddOpen(false)} />}

      <div className="flex flex-col gap-2">
        {filtered.map((u) => (
          <UniCard key={u.id} u={u} canEdit={canEdit} query={query} />
        ))}
        {filtered.length === 0 && (
          <p className="rounded-card border border-dashed border-border-warm bg-paper px-4 py-8 text-center text-sm text-ink-muted">
            No matches.
          </p>
        )}
      </div>
    </div>
  );
}

function AddUniversity({ onClose }: { onClose: () => void }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [f, setF] = useState({ name: "", short_name: "", type: "Public", currency: "MYR", location: "", intakes: "", website: "" });
  const [err, setErr] = useState<string | null>(null);
  const set = (k: keyof typeof f, v: string) => setF((s) => ({ ...s, [k]: v }));
  return (
    <div className="flex flex-col gap-2 rounded-card border border-border-warm bg-paper p-4">
      <div className="grid gap-2 sm:grid-cols-2">
        <input value={f.name} onChange={(e) => set("name", e.target.value)} placeholder="University name *" className={`sm:col-span-2 ${F}`} />
        <input value={f.short_name} onChange={(e) => set("short_name", e.target.value)} placeholder="Short name" className={F} />
        <select value={f.type} onChange={(e) => set("type", e.target.value)} className={F}>
          <option>Public</option><option>Private</option>
        </select>
        <select value={f.currency} onChange={(e) => set("currency", e.target.value)} className={F}>
          {["MYR", "USD", "SGD", "GBP", "EUR", "AUD"].map((c) => <option key={c}>{c}</option>)}
        </select>
        <input value={f.location} onChange={(e) => set("location", e.target.value)} placeholder="Location" className={F} />
        <input value={f.intakes} onChange={(e) => set("intakes", e.target.value)} placeholder="Intakes (e.g. Feb, Sep)" className={F} />
        <input value={f.website} onChange={(e) => set("website", e.target.value)} placeholder="Website" className={`sm:col-span-2 ${F}`} />
      </div>
      {err && <p className="text-xs text-brand-red">{err}</p>}
      <div className="flex gap-2">
        <button
          disabled={pending}
          onClick={() => start(async () => { const r = await createUniversity(f); if (!r.ok) { setErr(r.error ?? "Failed."); return; } onClose(); router.refresh(); })}
          className="rounded-md bg-brand-red px-3 py-1.5 text-xs font-medium text-oncolor hover:bg-brand-red-soft disabled:opacity-50"
        >
          {pending ? "Adding…" : "Add university"}
        </button>
        <button onClick={onClose} className="rounded-md border border-border-warm px-3 py-1.5 text-xs text-ink-muted hover:text-ink">Cancel</button>
      </div>
    </div>
  );
}

function UniCard({ u, canEdit, query }: { u: University; canEdit: boolean; query: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const progs = Object.entries(u.programmes).sort((a, b) => a[0].localeCompare(b[0]));
  const q = query.trim().toLowerCase();
  const shown = q ? progs.filter(([n]) => n.toLowerCase().includes(q)) : progs;

  return (
    <div className="rounded-card border border-border-warm bg-paper">
      <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-3">
        <button onClick={() => setOpen((o) => !o)} className="flex min-w-0 items-center gap-2 text-start">
          <ChevronDown className={`h-4 w-4 shrink-0 text-ink-muted transition-transform ${open ? "rotate-180" : ""}`} aria-hidden />
          <span className="min-w-0">
            <span className="font-medium text-ink">{u.name}</span>
            <span className="ml-2 text-xs text-ink-muted">
              {u.type ?? "—"} · {u.currency} · {Object.keys(u.programmes).length} programmes
              {u.location ? ` · ${u.location}` : ""}
            </span>
          </span>
        </button>
        <div className="flex shrink-0 items-center gap-2">
          {u.website && (
            <a href={u.website} target="_blank" rel="noopener noreferrer" className="text-ink-muted hover:text-ink" title="Website">
              <ExternalLink className="h-3.5 w-3.5" aria-hidden />
            </a>
          )}
          {canEdit && (
            <>
              <button onClick={() => setEditing((e) => !e)} className="text-ink-muted hover:text-ink" title="Edit"><Pencil className="h-3.5 w-3.5" aria-hidden /></button>
              <button
                onClick={() => { if (window.confirm(`Delete ${u.name} and its programmes?`)) start(async () => { await deleteUniversity(u.id); router.refresh(); }); }}
                className="text-ink-muted hover:text-brand-red" title="Delete"
              ><Trash2 className="h-3.5 w-3.5" aria-hidden /></button>
            </>
          )}
        </div>
      </div>

      {editing && canEdit && <EditUniversity u={u} onClose={() => setEditing(false)} />}

      {(open || q) && (
        <div className="border-t border-border-warm px-4 py-3">
          <div className="mb-1 text-[11px] uppercase tracking-wide text-ink-muted">{u.intakes ? `Intakes: ${u.intakes}` : "Programmes"}</div>
          <ul className="flex flex-col divide-y divide-border-warm/50">
            {shown.map(([name, fee]) => (
              <ProgrammeRow key={name} universityId={u.id} name={name} fee={fee} currency={u.currency} canEdit={canEdit} />
            ))}
          </ul>
          {canEdit && <AddProgramme universityId={u.id} />}
        </div>
      )}
    </div>
  );
}

function EditUniversity({ u, onClose }: { u: University; onClose: () => void }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [f, setF] = useState({
    name: u.name, short_name: u.short_name ?? "", type: u.type ?? "Public",
    currency: u.currency, location: u.location ?? "", intakes: u.intakes ?? "", website: u.website ?? "",
  });
  const set = (k: keyof typeof f, v: string) => setF((s) => ({ ...s, [k]: v }));
  return (
    <div className="grid gap-2 border-t border-border-warm bg-cream-50/60 px-4 py-3 sm:grid-cols-2">
      <input value={f.name} onChange={(e) => set("name", e.target.value)} className={`sm:col-span-2 ${F}`} />
      <input value={f.short_name} onChange={(e) => set("short_name", e.target.value)} placeholder="Short name" className={F} />
      <select value={f.type} onChange={(e) => set("type", e.target.value)} className={F}><option>Public</option><option>Private</option></select>
      <select value={f.currency} onChange={(e) => set("currency", e.target.value)} className={F}>{["MYR", "USD", "SGD", "GBP", "EUR", "AUD"].map((c) => <option key={c}>{c}</option>)}</select>
      <input value={f.location} onChange={(e) => set("location", e.target.value)} placeholder="Location" className={F} />
      <input value={f.intakes} onChange={(e) => set("intakes", e.target.value)} placeholder="Intakes" className={F} />
      <input value={f.website} onChange={(e) => set("website", e.target.value)} placeholder="Website" className={`sm:col-span-2 ${F}`} />
      <div className="flex gap-2 sm:col-span-2">
        <button disabled={pending} onClick={() => start(async () => { await updateUniversity(u.id, f); onClose(); router.refresh(); })} className="rounded-md bg-brand-red px-3 py-1.5 text-xs font-medium text-oncolor hover:bg-brand-red-soft disabled:opacity-50">{pending ? "Saving…" : "Save"}</button>
        <button onClick={onClose} className="rounded-md border border-border-warm px-3 py-1.5 text-xs text-ink-muted hover:text-ink">Cancel</button>
      </div>
    </div>
  );
}

function ProgrammeRow({ universityId, name, fee, currency, canEdit }: { universityId: string; name: string; fee: string; currency: string; canEdit: boolean }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [edit, setEdit] = useState(false);
  const [n, setN] = useState(name);
  const [fv, setFv] = useState(fee);
  if (edit && canEdit) {
    return (
      <li className="flex flex-wrap items-center gap-1.5 py-1.5">
        <input value={n} onChange={(e) => setN(e.target.value)} className={`flex-1 ${F}`} />
        <input value={fv} onChange={(e) => setFv(e.target.value)} className={`w-40 ${F}`} placeholder="fee" />
        <button disabled={pending} onClick={() => start(async () => { await upsertProgramme(universityId, n, fv, name); setEdit(false); router.refresh(); })} className="rounded-md bg-brand-red px-2 py-1 text-[11px] font-medium text-oncolor disabled:opacity-50"><Check className="h-3 w-3" aria-hidden /></button>
        <button onClick={() => { setN(name); setFv(fee); setEdit(false); }} className="rounded-md border border-border-warm px-2 py-1 text-[11px] text-ink-muted"><X className="h-3 w-3" aria-hidden /></button>
      </li>
    );
  }
  return (
    <li className="flex items-center justify-between gap-3 py-1.5 text-sm">
      <span className="min-w-0 text-ink">{name}</span>
      <span className="flex shrink-0 items-center gap-2">
        <span className="font-mono text-xs text-ink-soft tabular">{currency} {fee}</span>
        {canEdit && (
          <>
            <button onClick={() => setEdit(true)} className="text-ink-muted hover:text-ink"><Pencil className="h-3 w-3" aria-hidden /></button>
            <button onClick={() => start(async () => { await removeProgramme(universityId, name); router.refresh(); })} className="text-ink-muted hover:text-brand-red"><Trash2 className="h-3 w-3" aria-hidden /></button>
          </>
        )}
      </span>
    </li>
  );
}

function AddProgramme({ universityId }: { universityId: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [open, setOpen] = useState(false);
  const [n, setN] = useState("");
  const [fv, setFv] = useState("");
  if (!open) return <button onClick={() => setOpen(true)} className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-brand-red hover:underline"><Plus className="h-3.5 w-3.5" aria-hidden /> Add programme</button>;
  return (
    <div className="mt-2 flex flex-wrap items-center gap-1.5">
      <input value={n} onChange={(e) => setN(e.target.value)} placeholder="Programme name" className={`flex-1 ${F}`} />
      <input value={fv} onChange={(e) => setFv(e.target.value)} placeholder="Fee" className={`w-40 ${F}`} />
      <button disabled={pending || !n.trim()} onClick={() => start(async () => { await upsertProgramme(universityId, n, fv); setN(""); setFv(""); setOpen(false); router.refresh(); })} className="rounded-md bg-brand-red px-3 py-1.5 text-xs font-medium text-oncolor disabled:opacity-50">{pending ? "…" : "Add"}</button>
      <button onClick={() => setOpen(false)} className="rounded-md border border-border-warm px-3 py-1.5 text-xs text-ink-muted">Cancel</button>
    </div>
  );
}
