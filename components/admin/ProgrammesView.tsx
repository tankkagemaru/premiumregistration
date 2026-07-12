"use client";

import { useState } from "react";
import type { University } from "@/lib/admin/universities-shared";
import { ProgrammeFinder } from "@/components/admin/ProgrammeFinder";
import { UniversityManager } from "@/components/admin/UniversityManager";

/**
 * Programmes workspace — the rich finder for everyone to browse and advise
 * students, plus a "Manage catalogue" view for admissions/admin to edit the
 * underlying university + programme data.
 */
export function ProgrammesView({
  universities,
  usdPerMyr,
  canEdit,
}: {
  universities: University[];
  usdPerMyr: number;
  canEdit: boolean;
}) {
  const [tab, setTab] = useState<"find" | "manage">("find");
  if (!canEdit) return <ProgrammeFinder universities={universities} usdPerMyr={usdPerMyr} />;

  return (
    <div className="flex flex-col gap-4">
      <div className="inline-flex w-fit overflow-hidden rounded-md border border-border-warm">
        {(["find", "manage"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-1.5 text-sm font-medium ${tab === t ? "bg-inkbtn text-oncolor" : "bg-paper text-ink-soft hover:bg-cream-50"}`}
          >
            {t === "find" ? "Find programmes" : "Manage catalogue"}
          </button>
        ))}
      </div>
      {tab === "find" ? (
        <ProgrammeFinder universities={universities} usdPerMyr={usdPerMyr} />
      ) : (
        <UniversityManager universities={universities} canEdit={canEdit} />
      )}
    </div>
  );
}
