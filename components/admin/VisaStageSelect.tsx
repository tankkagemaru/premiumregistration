"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { stagesForKind } from "@/lib/admin/visa-shared";
import { updateVisaCase } from "@/app/admin/visa-actions";

export function VisaStageSelect({
  id,
  stage,
  kind,
}: {
  id: string;
  stage: string;
  kind?: string | null;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <select
      value={stage}
      disabled={pending}
      onChange={(e) =>
        start(async () => {
          await updateVisaCase(id, { stage: e.target.value });
          router.refresh();
        })
      }
      className="rounded-md border border-border-warm bg-paper px-2 py-1 text-xs text-ink outline-none"
    >
      {stagesForKind(kind).map((s) => (
        <option key={s.id} value={s.id}>
          {s.label}
        </option>
      ))}
    </select>
  );
}
