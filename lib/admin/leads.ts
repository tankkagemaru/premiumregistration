import { createClient } from "@/lib/supabase/server";
import {
  authConfigured,
  type Lead,
  type LeadEvent,
  type LeadDocument,
  type LeadFilters,
} from "./leads-shared";

export * from "./leads-shared";

/* ------------------------------------------------------------- dev mock --- */

const MOCK_LEADS: Lead[] = [
  {
    id: "00000000-0000-0000-0000-000000000001",
    created_at: "2026-07-01T09:12:00Z",
    tracks: ["english", "university"],
    status: "new",
    full_name: "Aisyah binti Rahman",
    email: "aisyah@example.com",
    phone: "+60123456789",
    whatsapp: "+60123456789",
    nationality: "my",
    utm_source: "instagram",
    utm_campaign: "july-intake",
    agent_code: "CELIA",
    next_action: "Call to confirm intake",
    next_action_due: "2026-07-04",
    tags: ["hot"],
    details: {
      english: {
        program: "exam_prep",
        learning_purpose: "academic",
        exam_interest: ["ielts"],
        preferred_schedule: "weekday",
      },
      university: {
        home_country: "my",
        intended_qualification: "degree",
        preferred_universities: ["um", "monash-my"],
      },
    },
  },
  {
    id: "00000000-0000-0000-0000-000000000002",
    created_at: "2026-06-30T14:40:00Z",
    tracks: ["corporate"],
    status: "contacted",
    full_name: "David Tan",
    email: "david@acme.com",
    phone: "+60129998888",
    nationality: "my",
    utm_source: "google",
    details: {
      corporate: {
        company_name: "Acme Sdn Bhd",
        training_need: "Business English for sales",
        hrdf_claimable: "yes",
      },
    },
  },
  {
    id: "00000000-0000-0000-0000-000000000003",
    created_at: "2026-06-28T08:05:00Z",
    tracks: ["university"],
    status: "enrolled",
    full_name: "Budi Santoso",
    email: "budi@example.co.id",
    phone: "+628112223333",
    nationality: "id",
    utm_source: "tiktok",
    details: {
      university: {
        home_country: "id",
        intended_qualification: "master",
        study_mode: "research",
        preferred_universities: ["upm"],
      },
    },
  },
];

const MOCK_EVENTS: LeadEvent[] = [
  { id: "e1", type: "status_change", body: "Lead created", created_at: "2026-07-01T09:12:00Z" },
];

/* --------------------------------------------------------------- queries -- */

export async function listLeads(filters: LeadFilters = {}): Promise<Lead[]> {
  if (!authConfigured) {
    return MOCK_LEADS.filter((l) => {
      if (filters.status && l.status !== filters.status) return false;
      if (filters.track && !l.tracks.includes(filters.track)) return false;
      if (filters.q) {
        const q = filters.q.toLowerCase();
        const hay = `${l.full_name} ${l.email} ${l.phone ?? ""}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }

  const supabase = await createClient();
  let query = supabase
    .from("registrations")
    .select("*")
    .order("created_at", { ascending: false });
  if (filters.status) query = query.eq("status", filters.status);
  if (filters.track) query = query.contains("tracks", [filters.track]);
  if (filters.q) {
    const q = filters.q.replace(/[%,]/g, "");
    query = query.or(
      `full_name.ilike.%${q}%,email.ilike.%${q}%,phone.ilike.%${q}%`,
    );
  }
  const { data } = await query;
  return (data as Lead[] | null) ?? [];
}

export async function getLead(id: string): Promise<{
  lead: Lead;
  events: LeadEvent[];
  documents: LeadDocument[];
} | null> {
  if (!authConfigured) {
    const lead = MOCK_LEADS.find((l) => l.id === id);
    return lead ? { lead, events: MOCK_EVENTS, documents: [] } : null;
  }

  const supabase = await createClient();
  const { data: lead } = await supabase
    .from("registrations")
    .select("*")
    .eq("id", id)
    .single();
  if (!lead) return null;
  const { data: events } = await supabase
    .from("lead_events")
    .select("id,type,body,created_at")
    .eq("registration_id", id)
    .order("created_at", { ascending: false });
  const { data: documents } = await supabase
    .from("registration_documents")
    .select("id,kind,storage_path,drive_url,review_status,created_at")
    .eq("registration_id", id);
  return {
    lead: lead as Lead,
    events: (events as LeadEvent[]) ?? [],
    documents: (documents as LeadDocument[]) ?? [],
  };
}
