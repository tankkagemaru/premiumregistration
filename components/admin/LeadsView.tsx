"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { Search, Download, UserPlus, GraduationCap } from "lucide-react";
import {
  type Lead,
  type LeadEvent,
  type LeadDocument,
  type Staff,
} from "@/lib/admin/leads-shared";
import { TRACKS } from "@/lib/config/tracks";
import { leadStaleness, type StalenessDays } from "@/lib/config/staleness";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { StageTabs, type StageTab } from "@/components/admin/StageTabs";
import { LeadDrawer } from "@/components/admin/LeadDrawer";
import type { BillableItem } from "@/lib/admin/billables-shared";
import { AddRecordDialog, type AddMode } from "@/components/admin/AddRecordDialog";

const TRACK_TITLE = Object.fromEntries(TRACKS.map((t) => [t.id, t.title]));

function formatDate(iso: string) {
  return new Date(iso).toISOString().slice(0, 10);
}

function toCsv(leads: Lead[]) {
  const cols = [
    "id",
    "created_at",
    "status",
    "tracks",
    "full_name",
    "email",
    "phone",
    "whatsapp",
    "nationality",
    "utm_source",
    "agent_code",
  ];
  const esc = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`;
  const rows = leads.map((l) =>
    cols
      .map((c) =>
        esc(
          c === "tracks"
            ? l.tracks.join("|")
            : (l as unknown as Record<string, unknown>)[c],
        ),
      )
      .join(","),
  );
  return [cols.join(","), ...rows].join("\n");
}

export function LeadsView({
  leads,
  selected,
  filters,
  staff,
  billables = [],
  officerName,
  stalenessDays,
  role = "staff",
}: {
  leads: Lead[];
  selected: { lead: Lead; events: LeadEvent[]; documents: LeadDocument[] } | null;
  filters: { status?: string; track?: string; q?: string };
  staff: Staff[];
  billables?: BillableItem[];
  officerName?: string;
  stalenessDays?: StalenessDays;
  role?: string;
}) {
  const router = useRouter();
  const params = useSearchParams();
  const pathname = usePathname();
  const [q, setQ] = useState(filters.q ?? "");
  const [addMode, setAddMode] = useState<AddMode | null>(null);
  const staffName = Object.fromEntries(staff.map((s) => [s.id, s.full_name]));

  // Staleness is derived client-side from the loaded rows (day-granularity, so
  // stable between server and client render). Thresholds live in config/staleness.
  const stale = new Map(
    leads.map((l) => [l.id, leadStaleness(l, new Date(), stalenessDays)] as const),
  );
  const stage = params.get("stage") ?? "attention";
  const byStatus = (s: string) => leads.filter((l) => l.status === s).length;
  const attnCount = leads.filter((l) => stale.get(l.id)?.level !== "ok").length;
  const tabs: StageTab[] = [
    { id: "attention", label: "Needs attention", attention: true, count: attnCount },
    { id: "new", label: "New", count: byStatus("new") },
    { id: "contacted", label: "Contacted", count: byStatus("contacted") },
    { id: "enrolled", label: "Converted", count: byStatus("enrolled") },
    { id: "dropped", label: "Dropped", count: byStatus("dropped") },
  ];
  const shown =
    stage === "attention"
      ? leads.filter((l) => stale.get(l.id)?.level !== "ok")
      : leads.filter((l) => l.status === stage);

  function setParam(key: string, value?: string) {
    const next = new URLSearchParams(params.toString());
    if (value) next.set(key, value);
    else next.delete(key);
    next.delete("lead");
    router.push(`${pathname}?${next.toString()}`);
  }

  // Debounced search → URL.
  useEffect(() => {
    const id = window.setTimeout(() => {
      if ((filters.q ?? "") !== q) setParam("q", q || undefined);
    }, 350);
    return () => window.clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);

  function openLead(id: string) {
    const next = new URLSearchParams(params.toString());
    next.set("lead", id);
    router.push(`${pathname}?${next.toString()}`);
  }

  function download() {
    const blob = new Blob([toCsv(leads)], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "leads.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-[11px] font-medium uppercase tracking-[0.22em] text-ink-muted">
            Leads
          </p>
          <h1 className="font-serif text-3xl font-medium text-ink">
            {leads.length} {leads.length === 1 ? "lead" : "leads"}
          </h1>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setAddMode("lead")}
            className="inline-flex items-center gap-2 rounded-md bg-inkbtn px-3 py-2 text-sm font-medium text-oncolor transition-colors hover:bg-inkbtn-soft"
          >
            <UserPlus className="h-4 w-4" aria-hidden />
            Add enquiry
          </button>
          <button
            onClick={() => setAddMode("student")}
            className="inline-flex items-center gap-2 rounded-md border border-border-warm bg-paper px-3 py-2 text-sm font-medium text-ink transition-colors hover:bg-cream-50"
          >
            <GraduationCap className="h-4 w-4 text-ink-muted" aria-hidden />
            Add student
          </button>
          <button
            onClick={download}
            className="inline-flex items-center gap-2 rounded-md border border-border-warm bg-paper px-3 py-2 text-sm font-medium text-ink transition-colors hover:bg-cream-50"
          >
            <Download className="h-4 w-4 text-ink-muted" aria-hidden />
            Export CSV
          </button>
        </div>
      </div>

      {/* Stage tabs */}
      <div className="mb-4">
        <StageTabs tabs={tabs} active={stage} />
      </div>

      {/* Filters */}
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="flex flex-1 items-center gap-2 rounded-md border border-border-warm bg-paper px-3 py-2">
          <Search className="h-4 w-4 text-ink-muted" aria-hidden />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search name, email, phone…"
            className="w-full bg-transparent text-sm text-ink outline-none placeholder:text-ink-muted/70"
          />
        </div>
        <select
          value={filters.track ?? ""}
          onChange={(e) => setParam("track", e.target.value || undefined)}
          className="rounded-md border border-border-warm bg-paper px-3 py-2 text-sm text-ink outline-none"
        >
          <option value="">All tracks</option>
          {TRACKS.map((t) => (
            <option key={t.id} value={t.id}>
              {t.title}
            </option>
          ))}
        </select>
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-card border border-border-warm">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border-warm bg-cream-50 text-left text-[11px] uppercase tracking-[0.14em] text-ink-muted">
              <th className="px-4 py-2.5 font-medium">Name</th>
              <th className="px-4 py-2.5 font-medium">Tracks</th>
              <th className="hidden px-4 py-2.5 font-medium sm:table-cell">Source</th>
              <th className="hidden px-4 py-2.5 font-medium md:table-cell">Handler</th>
              <th className="px-4 py-2.5 font-medium">Status</th>
              <th className="hidden px-4 py-2.5 font-medium sm:table-cell">Created</th>
            </tr>
          </thead>
          <tbody>
            {shown.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-10 text-center text-ink-muted">
                  No leads match these filters.
                </td>
              </tr>
            )}
            {shown.map((l) => {
              const s = stale.get(l.id);
              return (
              <tr
                key={l.id}
                onClick={() => openLead(l.id)}
                className="cursor-pointer border-b border-border-warm/60 bg-paper transition-colors last:border-0 hover:bg-cream-50"
              >
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    {s && s.level !== "ok" && (
                      <span
                        title={s.reasons.join(" · ")}
                        className={`h-2 w-2 shrink-0 rounded-full ${
                          s.level === "alert" ? "bg-brand-red" : "bg-brand-gold"
                        }`}
                        aria-label={s.reasons.join(", ")}
                      />
                    )}
                    <span className="font-medium text-ink">{l.full_name}</span>
                  </div>
                  <div className="text-xs text-ink-muted">{l.email}</div>
                </td>
                <td className="px-4 py-3 text-xs text-ink-soft">
                  {l.tracks.map((t) => TRACK_TITLE[t] ?? t).join(", ")}
                </td>
                <td className="hidden px-4 py-3 text-xs text-ink-soft sm:table-cell">
                  {l.utm_source ?? l.agent_code ?? "—"}
                </td>
                <td className="hidden px-4 py-3 text-xs text-ink-soft md:table-cell">
                  {l.assigned_to ? staffName[l.assigned_to] ?? "—" : "—"}
                </td>
                <td className="px-4 py-3">
                  <StatusBadge status={l.status} />
                </td>
                <td className="hidden px-4 py-3 text-xs text-ink-muted sm:table-cell">
                  {formatDate(l.created_at)}
                </td>
              </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {selected && (
        <LeadDrawer
          data={selected}
          staff={staff}
          billables={billables}
          officerName={officerName}
          stalenessDays={stalenessDays}
          role={role}
          onClose={() => setParam("lead", undefined)}
        />
      )}

      {addMode && (
        <AddRecordDialog mode={addMode} onClose={() => setAddMode(null)} />
      )}
    </div>
  );
}
