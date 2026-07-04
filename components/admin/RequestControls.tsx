"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check } from "lucide-react";
import { TEAMS, REQUEST_TYPES } from "@/lib/admin/requests-shared";
import {
  createActionRequest,
  resolveActionRequest,
} from "@/app/admin/request-actions";

const INPUT_CLS =
  "w-full rounded-md border border-border-warm bg-paper px-3 py-2 text-sm text-ink outline-none focus:border-brand-red";

/** Raise a handoff / action / blocker to another team (application drawer). */
export function RaiseRequest({
  applicationId,
  subject,
  fromRole,
}: {
  applicationId?: string;
  subject?: string;
  fromRole: string;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [open, setOpen] = useState(false);
  const [toRole, setToRole] = useState("admissions");
  const [type, setType] = useState("request");
  const [title, setTitle] = useState("");
  const [due, setDue] = useState("");

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="self-start rounded-md border border-border-warm bg-paper px-4 py-2 text-sm font-medium text-ink transition-colors hover:bg-cream-50"
      >
        Flag to another team →
      </button>
    );
  }

  return (
    <div className="flex flex-col gap-2 rounded-md border border-border-warm bg-paper p-3">
      <div className="flex gap-2">
        <select
          value={toRole}
          onChange={(e) => setToRole(e.target.value)}
          className={INPUT_CLS}
          aria-label="Team"
        >
          {TEAMS.filter((t) => t.id !== fromRole).map((t) => (
            <option key={t.id} value={t.id}>
              To {t.label}
            </option>
          ))}
        </select>
        <select
          value={type}
          onChange={(e) => setType(e.target.value)}
          className={INPUT_CLS}
          aria-label="Type"
        >
          {REQUEST_TYPES.map((t) => (
            <option key={t.id} value={t.id}>
              {t.label}
            </option>
          ))}
        </select>
      </div>
      <input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="What do you need from them?"
        className={INPUT_CLS}
      />
      <div className="flex gap-2">
        <input
          type="date"
          value={due}
          onChange={(e) => setDue(e.target.value)}
          className={INPUT_CLS}
          aria-label="Due date"
        />
        <button
          type="button"
          disabled={pending || !title.trim()}
          onClick={() =>
            start(async () => {
              await createActionRequest({
                applicationId,
                subject,
                toRole,
                type,
                title,
                dueDate: due || undefined,
              });
              setOpen(false);
              setTitle("");
              router.refresh();
            })
          }
          className="shrink-0 rounded-md bg-brand-red px-4 py-2 text-sm font-medium text-oncolor transition-colors hover:bg-brand-red-soft disabled:opacity-50"
        >
          {pending ? "Sending…" : "Send"}
        </button>
      </div>
    </div>
  );
}

export function ResolveButton({ id }: { id: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <button
      type="button"
      disabled={pending}
      onClick={() =>
        start(async () => {
          await resolveActionRequest(id);
          router.refresh();
        })
      }
      className="inline-flex items-center gap-1.5 rounded-md border border-border-warm bg-paper px-3 py-1.5 text-xs font-medium text-ink transition-colors hover:bg-cream-50 disabled:opacity-50"
    >
      <Check className="h-3.5 w-3.5 text-status-present" aria-hidden />
      Mark done
    </button>
  );
}
