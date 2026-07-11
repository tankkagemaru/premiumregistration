"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { UserPlus, X } from "lucide-react";

/**
 * "Refer a student" from the agent portal — opens the full self-registration
 * form (same one the public uses, all track-specific fields + document uploads)
 * in a dialog, tagged to this agent so the lead is attributed to them.
 */
export function AgentRegisterModal({ agentCode }: { agentCode: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);

  const close = () => { setOpen(false); router.refresh(); };

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-2 rounded-md bg-brand-red px-4 py-2 text-sm font-medium text-oncolor transition-colors hover:bg-brand-red-soft"
      >
        <UserPlus className="h-4 w-4" aria-hidden />
        Refer a student
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-hidden bg-inkbtn/40 p-3 sm:p-6">
          <div className="absolute inset-0" onClick={close} aria-hidden />
          <div className="relative z-10 flex h-full max-h-[92vh] w-full max-w-2xl flex-col overflow-hidden rounded-card border border-border-warm bg-cream shadow-xl">
            <div className="flex items-center justify-between border-b border-border-warm bg-paper px-4 py-2.5">
              <p className="text-sm font-medium text-ink">Refer a student</p>
              <button onClick={close} aria-label="Close" className="rounded-md p-1 text-ink-muted hover:bg-cream-50 hover:text-ink">
                <X className="h-5 w-5" aria-hidden />
              </button>
            </div>
            <iframe
              src={`/register?agent=${encodeURIComponent(agentCode)}&embedded=1`}
              title="Refer a student"
              className="h-full w-full flex-1 bg-cream"
            />
          </div>
        </div>
      )}
    </>
  );
}
