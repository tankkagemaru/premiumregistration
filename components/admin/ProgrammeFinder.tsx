"use client";

import { useMemo, useState, useTransition } from "react";
import { Search, Download, ExternalLink, Send } from "lucide-react";
import type { University } from "@/lib/admin/universities-shared";
import {
  SPECIALTIES,
  ACCREDITATION_RULES,
  LEVELS,
  MODES,
  DURATIONS,
  LOCATIONS,
  INTAKE_MONTHS,
  SORTS,
  uniType,
  getProgramSpecs,
  formatPrice,
  filterUniversities,
  buildCSV,
  type FinderFilters,
} from "@/lib/admin/programme-finder-shared";

const SEL =
  "w-full rounded-md border border-border-warm bg-cream-50 px-2.5 py-2 text-sm text-ink outline-none focus:border-brand-red";
const LABEL = "mb-1 block text-[11px] font-medium uppercase tracking-[0.14em] text-ink-muted";

const EMPTY: FinderFilters = {
  search: "", specialty: "", level: "", type: "", location: "",
  intake: "", duration: "", mode: "", accreditation: "", sort: "default",
};

/** Per-card "Request more information" — agents ask Marketing + Admissions about
 *  a university without leaving the finder. */
function RequestInfo({
  university,
  onRequestInfo,
}: {
  university: string;
  onRequestInfo: (university: string, note: string) => Promise<{ ok: boolean; error?: string }>;
}) {
  const [open, setOpen] = useState(false);
  const [note, setNote] = useState("");
  const [done, setDone] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [pending, start] = useTransition();

  if (done) {
    return <p className="text-xs font-medium text-status-present">Requested — the office will get back to you. ✓</p>;
  }
  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1.5 text-xs font-medium text-brand-red hover:underline"
      >
        <Send className="h-3.5 w-3.5" aria-hidden />
        Request more information
      </button>
    );
  }
  return (
    <div className="flex flex-col gap-2">
      <textarea
        value={note}
        onChange={(e) => setNote(e.target.value)}
        rows={2}
        placeholder={`What would you like to know about ${university}? (optional)`}
        className="w-full rounded-md border border-border-warm bg-cream-50 px-2.5 py-1.5 text-xs text-ink outline-none focus:border-brand-red"
      />
      {err && <p className="text-xs text-brand-red">{err}</p>}
      <div className="flex gap-2">
        <button
          disabled={pending}
          onClick={() =>
            start(async () => {
              const r = await onRequestInfo(university, note);
              if (!r.ok) { setErr("Couldn't send — try again."); return; }
              setDone(true);
            })
          }
          className="rounded-md bg-brand-red px-3 py-1.5 text-xs font-medium text-oncolor hover:bg-brand-red-soft disabled:opacity-50"
        >
          {pending ? "Sending…" : "Send to office"}
        </button>
        <button onClick={() => { setOpen(false); setErr(null); }} className="rounded-md border border-border-warm px-3 py-1.5 text-xs text-ink-muted hover:text-ink">
          Cancel
        </button>
      </div>
    </div>
  );
}

/**
 * The Malaysia University Programme Finder — search the catalogue by specialty,
 * level, type, location, intake, duration, mode or keyword and see every
 * university offering a match side-by-side, with live fee conversion and CSV
 * export. All facets are derived from the programme name + university row.
 */
export function ProgrammeFinder({
  universities,
  usdPerMyr,
  onRequestInfo,
}: {
  universities: University[];
  usdPerMyr: number;
  /** When supplied (agent portal), each card shows a "Request more information"
   *  action that raises a request to Marketing + Admissions. */
  onRequestInfo?: (university: string, note: string) => Promise<{ ok: boolean; error?: string }>;
}) {
  const [f, setF] = useState<FinderFilters>(EMPTY);
  const [currency, setCurrency] = useState("MYR");
  const [visible, setVisible] = useState(20);
  const set = (k: keyof FinderFilters, v: string) => {
    setF((cur) => ({ ...cur, [k]: v }));
    setVisible(20);
  };

  const matched = useMemo(() => filterUniversities(universities, f), [universities, f]);
  const shown = matched.slice(0, visible);
  const totalProgrammes = matched.reduce((s, u) => s + u.matchedProgrammes.length, 0);
  const dirty = JSON.stringify(f) !== JSON.stringify(EMPTY);

  function download() {
    if (matched.length === 0) return;
    const csv = buildCSV(matched, currency, usdPerMyr);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "programme-finder.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  const accNotice = f.accreditation ? ACCREDITATION_RULES[f.accreditation]?.notice : null;

  return (
    <div className="flex flex-col gap-5">
      {/* Filters */}
      <div className="rounded-card border border-border-warm bg-paper p-5">
        <div className="mb-3 flex items-center justify-between gap-2">
          <div className="inline-flex overflow-hidden rounded-md border border-border-warm">
            {["MYR", "USD"].map((c) => (
              <button
                key={c}
                onClick={() => setCurrency(c)}
                className={`px-3 py-1.5 text-xs font-medium ${currency === c ? "bg-inkbtn text-oncolor" : "bg-paper text-ink-soft hover:bg-cream-50"}`}
              >
                {c === "MYR" ? "MYR (RM)" : "USD ($)"}
              </button>
            ))}
          </div>
          {dirty && (
            <button onClick={() => { setF(EMPTY); setVisible(20); }} className="text-xs font-medium text-ink-muted hover:text-brand-red">
              Clear filters
            </button>
          )}
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <label className={LABEL}>Accreditation</label>
            <select value={f.accreditation} onChange={(e) => set("accreditation", e.target.value)} className={SEL}>
              <option value="">Any country (no filter)</option>
              {Object.keys(ACCREDITATION_RULES).map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label className={LABEL}>Field of study / specialty</label>
            <select value={f.specialty} onChange={(e) => set("specialty", e.target.value)} className={SEL}>
              <option value="">All specialties (80+)</option>
              {Object.keys(SPECIALTIES).sort().map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div>
            <label className={LABEL}>Study level</label>
            <select value={f.level} onChange={(e) => set("level", e.target.value)} className={SEL}>
              <option value="">All levels</option>
              {LEVELS.map((l) => <option key={l.value} value={l.value}>{l.label}</option>)}
            </select>
          </div>
          <div>
            <label className={LABEL}>Institution type</label>
            <select value={f.type} onChange={(e) => set("type", e.target.value)} className={SEL}>
              <option value="">All types</option>
              <option value="Public">Public</option>
              <option value="Private">Private</option>
            </select>
          </div>
          <div>
            <label className={LABEL}>Location</label>
            <select value={f.location} onChange={(e) => set("location", e.target.value)} className={SEL}>
              <option value="">All locations</option>
              {LOCATIONS.map((l) => <option key={l} value={l}>{l}</option>)}
            </select>
          </div>
          <div>
            <label className={LABEL}>Intake month</label>
            <select value={f.intake} onChange={(e) => set("intake", e.target.value)} className={SEL}>
              <option value="">Any intake</option>
              {INTAKE_MONTHS.map((m) => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>
          <div>
            <label className={LABEL}>Duration (years)</label>
            <select value={f.duration} onChange={(e) => set("duration", e.target.value)} className={SEL}>
              <option value="">Any duration</option>
              {DURATIONS.map((d) => <option key={d} value={d}>{d} Year{d === "1" ? "" : "s"}</option>)}
            </select>
          </div>
          <div>
            <label className={LABEL}>Study mode</label>
            <select value={f.mode} onChange={(e) => set("mode", e.target.value)} className={SEL}>
              <option value="">All modes</option>
              {MODES.map((m) => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>
          <div className="sm:col-span-2 lg:col-span-4">
            <label className={LABEL}>Keyword search</label>
            <div className="flex items-center gap-2 rounded-md border border-border-warm bg-cream-50 px-2.5 py-2">
              <Search className="h-4 w-4 shrink-0 text-ink-muted" aria-hidden />
              <input
                value={f.search}
                onChange={(e) => set("search", e.target.value)}
                placeholder="e.g. Medicine, Dentistry, AI…"
                className="w-full bg-transparent text-sm text-ink outline-none placeholder:text-ink-muted/70"
              />
            </div>
          </div>
        </div>

        {accNotice && (
          <p className="mt-3 rounded-md border border-brand-gold/30 bg-brand-gold/5 px-3 py-2 text-xs text-ink-soft">
            {accNotice}
          </p>
        )}
      </div>

      {/* Results bar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-serif text-2xl text-ink">
          Matching universities: <span className="text-brand-red">{matched.length}</span>
          <span className="ml-2 align-middle text-xs font-normal text-ink-muted">{totalProgrammes} programmes</span>
        </h2>
        {matched.length > 0 && (
          <div className="flex items-center gap-3">
            <button
              onClick={download}
              className="inline-flex items-center gap-1.5 rounded-md bg-status-present px-3 py-1.5 text-xs font-medium text-oncolor hover:opacity-90"
            >
              <Download className="h-3.5 w-3.5" aria-hidden /> Download CSV
            </button>
            <label className="flex items-center gap-1.5 text-xs text-ink-muted">
              Sort by
              <select value={f.sort} onChange={(e) => set("sort", e.target.value)} className="rounded-md border border-border-warm bg-cream-50 px-2 py-1 text-xs text-ink outline-none">
                {SORTS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
              </select>
            </label>
          </div>
        )}
      </div>

      {/* Cards */}
      {matched.length === 0 ? (
        <p className="rounded-card border border-dashed border-border-warm bg-paper px-4 py-12 text-center text-sm text-ink-muted">
          No universities match this search.
        </p>
      ) : (
        <>
          <div className="grid gap-4 lg:grid-cols-2">
            {shown.map((u) => (
              <div key={u.id} className="flex flex-col rounded-card border border-border-warm bg-paper">
                <div className="border-b border-border-warm px-4 py-3">
                  <div className="flex items-start justify-between gap-2">
                    <p className="font-serif text-lg text-ink">{u.name}</p>
                    {u.website && (
                      <a href={u.website} target="_blank" rel="noopener noreferrer" className="shrink-0 text-ink-muted hover:text-brand-red" title="Website">
                        <ExternalLink className="h-4 w-4" aria-hidden />
                      </a>
                    )}
                  </div>
                  <p className="mt-0.5 text-xs text-ink-muted">
                    {uniType(u)}
                    {u.location ? ` · ${u.location}` : ""}
                    {u.intakes ? ` · Intakes: ${u.intakes}` : ""}
                    <span className="ml-1">· {u.matchedProgrammes.length} match{u.matchedProgrammes.length === 1 ? "" : "es"}</span>
                  </p>
                </div>
                <div className="flex max-h-80 flex-col divide-y divide-border-warm/50 overflow-y-auto px-4">
                  {u.matchedProgrammes.map(([name, fee]) => {
                    const specs = getProgramSpecs(name);
                    return (
                      <div key={name} className="py-2.5">
                        <div className="flex items-start justify-between gap-3">
                          <p className="min-w-0 text-sm text-ink">{name}</p>
                          <p className="shrink-0 font-mono text-xs font-medium text-brand-red tabular">
                            {formatPrice(fee, u.currency, currency, usdPerMyr)}
                          </p>
                        </div>
                        <div className="mt-1 flex flex-wrap gap-1.5">
                          <span className="rounded bg-cream-50 px-1.5 py-0.5 text-[10px] text-ink-muted">⏳ {specs.duration}</span>
                          <span className="rounded bg-cream-50 px-1.5 py-0.5 text-[10px] text-ink-muted">📝 IELTS {specs.ielts}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
                {onRequestInfo && (
                  <div className="border-t border-border-warm px-4 py-2.5">
                    <RequestInfo university={u.name} onRequestInfo={onRequestInfo} />
                  </div>
                )}
              </div>
            ))}
          </div>
          {visible < matched.length && (
            <div className="text-center">
              <button
                onClick={() => setVisible((v) => v + 20)}
                className="rounded-md border border-border-warm bg-paper px-6 py-2.5 text-sm font-medium text-ink hover:bg-cream-50"
              >
                Load more universities ({matched.length - visible} more)
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
