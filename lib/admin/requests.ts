import { createClient } from "@/lib/supabase/server";
import { authConfigured } from "./leads-shared";
import type { ActionRequest } from "./requests-shared";

export * from "./requests-shared";

/* Mock data — mirrors the real inter-team flows:
   marketing → admissions (qualified lead), admissions → visa (handoff once
   admission is done), visa → academic (needs attendance for renewal),
   academic → finance (has the student paid? may they enter class?),
   admissions → finance (invoice before payment). */
const MOCK_REQUESTS: ActionRequest[] = [
  {
    id: "r1",
    subject: "Chen Wei",
    from_role: "marketing",
    to_role: "admissions",
    type: "handoff",
    title: "Qualified lead ready for application",
    detail: "From the July intake Instagram campaign — wants Business English.",
    status: "open",
    created_at: "2026-07-02T09:00:00Z",
  },
  {
    id: "r2",
    application_id: "a-0002",
    subject: "Budi Santoso",
    from_role: "admissions",
    to_role: "visa",
    type: "handoff",
    title: "Admission complete — begin EMGS submission",
    status: "done",
    created_at: "2026-06-24T10:00:00Z",
  },
  {
    id: "r3",
    application_id: "a-0004",
    subject: "Fatima Al-Zahra",
    from_role: "visa",
    to_role: "academic",
    type: "request",
    title: "Attendance record needed for pass renewal",
    detail: "EMGS renewal requires the attendance percentage for the current term.",
    due_date: "2026-07-20",
    status: "open",
    created_at: "2026-07-01T14:00:00Z",
  },
  {
    id: "r4",
    application_id: "a-0004",
    subject: "Fatima Al-Zahra",
    from_role: "academic",
    to_role: "finance",
    type: "blocker",
    title: "Confirm Term 2 tuition before class entry",
    detail: "Student cannot join the new term until the outstanding tuition is confirmed.",
    status: "open",
    created_at: "2026-07-02T08:30:00Z",
  },
  {
    id: "r5",
    application_id: "a-0003",
    subject: "Nguyen Van An",
    from_role: "admissions",
    to_role: "finance",
    type: "request",
    title: "Registration fee invoice needed",
    detail: "Acceptance letter is ready; invoice the registration fee so the offer can be confirmed.",
    status: "open",
    created_at: "2026-07-01T12:00:00Z",
  },
];

export async function listRequests(filters: {
  toRole?: string;
  fromRole?: string;
  applicationId?: string;
  openOnly?: boolean;
} = {}): Promise<ActionRequest[]> {
  let rows: ActionRequest[];
  if (!authConfigured) {
    rows = MOCK_REQUESTS;
  } else {
    const supabase = await createClient();
    const { data } = await supabase
      .from("action_requests")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(200);
    rows = (data as ActionRequest[] | null) ?? [];
  }
  return rows.filter((r) => {
    if (filters.toRole && r.to_role !== filters.toRole) return false;
    if (filters.fromRole && r.from_role !== filters.fromRole) return false;
    if (filters.applicationId && r.application_id !== filters.applicationId)
      return false;
    if (filters.openOnly && r.status !== "open") return false;
    return true;
  });
}
