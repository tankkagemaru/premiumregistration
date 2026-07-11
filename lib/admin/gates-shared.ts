/**
 * Stage gate engine (pure — client + server). Each team-owned stage has an EXIT
 * gate: the conditions that must hold before an application hands off to the next
 * team. In "hard" mode advancing is blocked until the hard items are met; in
 * "soft" mode advancing is allowed but the unmet items are surfaced as a warning.
 *
 * `hard: true` items block the handoff. Advisory items (hard omitted) are shown in
 * the checklist so the owning team knows what's outstanding, but don't block.
 */

export type GateMode = "hard" | "soft";
export const DEFAULT_GATE_MODE: GateMode = "hard";

/** Everything the gate for any stage might need, resolved from the app + its
 *  fees / plan / visa. Booleans so the engine stays pure and testable. */
export interface GateSignals {
  isInternational: boolean;
  registrationPaid: boolean; // a registration fee exists and is paid/waived
  planFinalized: boolean; // study-plan handover finalised
  requiredDocsPresent: boolean; // no missing non-optional documents (advisory)
  allFeesCleared: boolean; // every recorded fee paid/waived
  readyForVisa: boolean; // admissions flagged the student ready for visa
  passIssued: boolean; // visa case reached pass_active
}

export interface GateItem {
  label: string;
  met: boolean;
  hard?: boolean; // hard items block the handoff
}

export interface StageGate {
  items: GateItem[];
  /** all hard items satisfied → the handoff is allowed even in hard mode */
  met: boolean;
  /** first unmet hard item, for a short "waiting on …" line */
  reason?: string;
}

/** The exit-gate checklist for `stage`, evaluated against the signals. */
export function stageGate(stage: string, s: GateSignals): StageGate {
  let items: GateItem[] = [];
  switch (stage) {
    case "registration":
      items = [{ label: "Registration cleared (paid or waived)", met: s.registrationPaid, hard: true }];
      break;
    case "admissions":
      items = [
        { label: "Study plan finalised", met: s.planFinalized, hard: true },
        { label: "Required documents collected", met: s.requiredDocsPresent },
      ];
      break;
    case "offer":
      items = [
        { label: "All fees cleared", met: s.allFeesCleared, hard: true },
        ...(s.isInternational
          ? [{ label: "Flagged ready for visa", met: s.readyForVisa, hard: true }]
          : []),
      ];
      break;
    case "visa":
      items = [{ label: "Student pass issued", met: s.passIssued, hard: true }];
      break;
    default:
      items = [];
  }
  const hard = items.filter((i) => i.hard);
  const firstUnmet = hard.find((i) => !i.met);
  return { items, met: !firstUnmet, reason: firstUnmet?.label };
}
