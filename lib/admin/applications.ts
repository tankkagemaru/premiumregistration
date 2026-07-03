import { createClient } from "@/lib/supabase/server";
import {
  authConfigured,
  type Application,
  type ApplicationEvent,
  type ApplicationDoc,
} from "./applications-shared";

export * from "./applications-shared";

const MOCK: Application[] = [
  {
    id: "a-0001",
    created_at: "2026-07-01T10:00:00Z",
    student_id: "st-1",
    student_name: "Aisyah binti Rahman",
    student_email: "aisyah@example.com",
    is_international: false,
    track: "university",
    target_institution: "Universiti Malaya (UM)",
    program_name: "Computer Science",
    qualification_level: "degree",
    intake: "sep",
    submitted_by: "agent",
    agent_id: "s-celia",
    agent_name: "Celia",
    assigned_to: "s-waty",
    stage: "review",
    status: "active",
    next_action: "Verify transcript",
    next_action_due: "2026-07-05",
  },
  {
    id: "a-0002",
    created_at: "2026-06-29T09:00:00Z",
    student_id: "st-2",
    student_name: "Budi Santoso",
    student_email: "budi@example.co.id",
    is_international: true,
    track: "university",
    target_institution: "Universiti Putra Malaysia (UPM)",
    program_name: "Agricultural Science",
    qualification_level: "master",
    intake: "sep",
    submitted_by: "agent",
    agent_id: "s-felix",
    agent_name: "Felix",
    stage: "visa",
    status: "active",
    next_action: "EMGS medical booking",
    next_action_due: "2026-07-02",
  },
  {
    id: "a-0003",
    created_at: "2026-06-25T08:00:00Z",
    student_id: "st-3",
    student_name: "Nguyen Van An",
    student_email: "an@example.vn",
    is_international: true,
    track: "english",
    program_name: "General English (PLC)",
    intake: "may",
    submitted_by: "student",
    stage: "offer",
    status: "active",
    next_action: "Issue acceptance letter",
    next_action_due: "2026-07-04",
  },
];

const MOCK_EVENTS: ApplicationEvent[] = [
  { id: "ae1", type: "stage_change", body: "Moved to Review", created_at: "2026-07-01T11:00:00Z" },
  { id: "ae2", type: "note", body: "Passport verified", created_at: "2026-07-01T10:30:00Z" },
];

const MOCK_DOCS: ApplicationDoc[] = [
  { id: "ad1", kind: "passport", review_status: "verified" },
  { id: "ad2", kind: "transcript", review_status: "pending" },
];

export async function listApplications(filters: {
  stage?: string;
  q?: string;
} = {}): Promise<Application[]> {
  if (!authConfigured) {
    return MOCK.filter((a) => {
      if (filters.stage && a.stage !== filters.stage) return false;
      if (filters.q) {
        const q = filters.q.toLowerCase();
        if (!`${a.student_name} ${a.student_email}`.toLowerCase().includes(q))
          return false;
      }
      return true;
    });
  }
  const supabase = await createClient();
  let query = supabase
    .from("applications")
    .select("*, students!inner(full_name,email,is_international)")
    .order("created_at", { ascending: false });
  if (filters.stage) query = query.eq("stage", filters.stage);
  const { data } = await query;
  // NOTE: shape-mapping from the joined row happens here once live.
  return (data as unknown as Application[] | null) ?? [];
}

export async function getApplication(id: string): Promise<{
  app: Application;
  events: ApplicationEvent[];
  documents: ApplicationDoc[];
} | null> {
  if (!authConfigured) {
    const app = MOCK.find((a) => a.id === id);
    return app ? { app, events: MOCK_EVENTS, documents: MOCK_DOCS } : null;
  }
  const supabase = await createClient();
  const { data: app } = await supabase
    .from("applications")
    .select("*, students!inner(full_name,email,is_international)")
    .eq("id", id)
    .single();
  if (!app) return null;
  const { data: events } = await supabase
    .from("application_events")
    .select("id,type,body,created_at")
    .eq("application_id", id)
    .order("created_at", { ascending: false });
  const { data: documents } = await supabase
    .from("application_documents")
    .select("id,kind,review_status")
    .eq("application_id", id);
  return {
    app: app as unknown as Application,
    events: (events as ApplicationEvent[]) ?? [],
    documents: (documents as ApplicationDoc[]) ?? [],
  };
}
