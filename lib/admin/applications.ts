import { createClient } from "@/lib/supabase/server";
import {
  authConfigured,
  type Application,
  type ApplicationEvent,
  type ApplicationDoc,
  type AppContact,
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
    flag: "action",
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
    flag: "progress",
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
    flag: "progress",
    next_action: "Issue acceptance letter",
    next_action_due: "2026-07-04",
    class_start: "2026-07-14",
    class_end: "2026-10-02",
  },
  {
    id: "a-0004",
    created_at: "2025-08-10T08:00:00Z",
    student_id: "st-4",
    student_name: "Fatima Al-Zahra",
    student_email: "fatima@example.sa",
    is_international: true,
    track: "english",
    program_name: "IELTS Preparation (PLC)",
    submitted_by: "student",
    stage: "active",
    status: "active",
    flag: "ok",
    next_action: "Student pass renewal",
    next_action_due: "2026-07-15",
    class_start: "2025-09-01",
    class_end: "2026-08-28",
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

export interface ApplicationDocRow extends ApplicationDoc {
  application_id: string;
}

const MOCK_DOC_ROWS: ApplicationDocRow[] = [
  { id: "ad1", kind: "passport", review_status: "verified", application_id: "a-0001" },
  { id: "ad2", kind: "transcript", review_status: "pending", application_id: "a-0001" },
  { id: "ad3", kind: "passport", review_status: "verified", application_id: "a-0002" },
];

/** Documents across many applications, in one query (for portal checklists). */
export async function listDocumentsForApps(
  appIds: string[],
): Promise<ApplicationDocRow[]> {
  if (appIds.length === 0) return [];
  if (!authConfigured) {
    return MOCK_DOC_ROWS.filter((d) => appIds.includes(d.application_id));
  }
  const supabase = await createClient();
  const { data } = await supabase
    .from("application_documents")
    .select("id,kind,review_status,application_id")
    .in("application_id", appIds);
  return (data as ApplicationDocRow[] | null) ?? [];
}

export async function listApplications(filters: {
  stage?: string;
  q?: string;
  agentId?: string;
} = {}): Promise<Application[]> {
  if (!authConfigured) {
    return MOCK.filter((a) => {
      if (filters.stage && a.stage !== filters.stage) return false;
      if (filters.agentId && a.agent_id !== filters.agentId) return false;
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
    .select("*")
    .order("created_at", { ascending: false });
  if (filters.stage) query = query.eq("stage", filters.stage);
  if (filters.agentId) query = query.eq("agent_id", filters.agentId);
  if (filters.q) {
    const q = filters.q.replace(/[%,]/g, "");
    query = query.or(`student_name.ilike.%${q}%,student_email.ilike.%${q}%`);
  }
  const { data } = await query;
  return (data as Application[] | null) ?? [];
}

export async function getApplication(id: string): Promise<{
  app: Application;
  events: ApplicationEvent[];
  documents: ApplicationDoc[];
  contact: AppContact;
} | null> {
  if (!authConfigured) {
    const app = MOCK.find((a) => a.id === id);
    return app
      ? {
          app,
          events: MOCK_EVENTS,
          documents: MOCK_DOCS,
          contact: { phone: "+60123456789", whatsapp: "+60123456789", email: app.student_email },
        }
      : null;
  }
  const supabase = await createClient();
  const { data: app } = await supabase
    .from("applications")
    .select("*")
    .eq("id", id)
    .single();
  if (!app) return null;
  const [{ data: events }, { data: documents }, { data: student }] =
    await Promise.all([
      supabase
        .from("application_events")
        .select("id,type,body,created_at")
        .eq("application_id", id)
        .order("created_at", { ascending: false }),
      supabase
        .from("application_documents")
        .select("id,kind,review_status")
        .eq("application_id", id),
      supabase
        .from("students")
        .select("phone,whatsapp,nationality")
        .eq("id", (app as Application).student_id)
        .maybeSingle(),
    ]);
  return {
    app: app as Application,
    events: (events as ApplicationEvent[]) ?? [],
    documents: (documents as ApplicationDoc[]) ?? [],
    contact: {
      phone: (student as { phone?: string } | null)?.phone,
      whatsapp: (student as { whatsapp?: string } | null)?.whatsapp,
      email: (app as Application).student_email,
      nationality: (student as { nationality?: string } | null)?.nationality,
    },
  };
}
