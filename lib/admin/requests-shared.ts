/** Cross-team action requests — pure types, safe for client and server. */

export const TEAMS = [
  { id: "marketing", label: "Marketing" },
  { id: "admissions", label: "Admissions" },
  { id: "finance", label: "Finance" },
  { id: "visa", label: "Visa" },
  { id: "academic", label: "Academic" },
] as const;

export const TEAM_LABEL: Record<string, string> = Object.fromEntries(
  TEAMS.map((t) => [t.id, t.label]),
);
TEAM_LABEL.admin = "Admin";

export type RequestType = "handoff" | "request" | "blocker";

export const REQUEST_TYPES: { id: RequestType; label: string }[] = [
  { id: "handoff", label: "Handoff" },
  { id: "request", label: "Action needed" },
  { id: "blocker", label: "Blocker" },
];

export interface ActionRequest {
  id: string;
  application_id?: string | null;
  /** Display label — the student/lead the request is about. */
  subject?: string | null;
  from_role: string;
  to_role: string;
  type: RequestType;
  title: string;
  detail?: string | null;
  due_date?: string | null;
  status: "open" | "done" | "dismissed";
  created_at: string;
}
