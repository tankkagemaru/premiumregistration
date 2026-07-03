"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { Search, Download } from "lucide-react";
import {
  LEAD_STATUSES,
  type Lead,
  type LeadEvent,
  type LeadDocument,
  type Staff,
} from "@/lib/admin/leads-shared";
import { TRACKS } from "@/lib/config/tracks";
import { StatusBadge, statusLabel } from "@/components/admin/StatusBadge";
import { LeadDrawer } from "@/components/admin/LeadDrawer";

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
}: {
  leads: Lead[];
  selected: { lead: Lead; events: LeadEvent[]; documents: LeadDocument[] } | null;
  filters: { status?: string; track?: string; q?: string };
  staff: Staff[];
}) {
  const router = useRouter();
  const params = useSearchParams();
  const pathname = usePathname();
  const [q, setQ] = useState(filters.q ?? "");

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

  const counts = LEAD_STATUSES.map((s) => ({
    s,
    n: leads.filter((l) => l.status === s).length,
  }));

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
        <button
          onClick={download}
          className="inline-flex items-center gap-2 rounded-md border border-border-warm bg-paper px-3 py-2 text-sm font-medium text-ink transition-colors hover:bg-cream-50"
        >
          <Download className="h-4 w-4 text-ink-muted" aria-hidden />
          Export CSV
        </button>
      </div>

      {/* Stat row */}
      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {counts.map(({ s, n }) => (
          <button
            key={s}
            onClick={() => setParam("status", filters.status === s ? undefined : s)}
            className={`rounded-card border px-4 py-3 text-left transition-colors ${
              filters.status === s
                ? "border-brand-red bg-paper"
                : "border-border-warm bg-paper hover:bg-cream-50"
            }`}
          >
            <p className="text-[10px] font-medium uppercase tracking-[0.18em] text-ink-muted">
              {statusLabel(s)}
            </p>
            <p className="mt-1 font-serif text-2xl text-ink tabular">{n}</p>
          </button>
        ))}
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
              <th className="px-4 py-2.5 font-medium">Status</th>
              <th className="hidden px-4 py-2.5 font-medium sm:table-cell">Created</th>
            </tr>
          </thead>
          <tbody>
            {leads.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-10 text-center text-ink-muted">
                  No leads match these filters.
                </td>
              </tr>
            )}
            {leads.map((l) => (
              <tr
                key={l.id}
                onClick={() => openLead(l.id)}
                className="cursor-pointer border-b border-border-warm/60 bg-paper transition-colors last:border-0 hover:bg-cream-50"
              >
                <td className="px-4 py-3">
                  <div className="font-medium text-ink">{l.full_name}</div>
                  <div className="text-xs text-ink-muted">{l.email}</div>
                </td>
                <td className="px-4 py-3 text-xs text-ink-soft">
                  {l.tracks.map((t) => TRACK_TITLE[t] ?? t).join(", ")}
                </td>
                <td className="hidden px-4 py-3 text-xs text-ink-soft sm:table-cell">
                  {l.utm_source ?? l.agent_code ?? "—"}
                </td>
                <td className="px-4 py-3">
                  <StatusBadge status={l.status} />
                </td>
                <td className="hidden px-4 py-3 text-xs text-ink-muted sm:table-cell">
                  {formatDate(l.created_at)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {selected && (
        <LeadDrawer
          data={selected}
          staff={staff}
          onClose={() => setParam("lead", undefined)}
        />
      )}
    </div>
  );
}
