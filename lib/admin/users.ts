import { createClient } from "@/lib/supabase/server";
import { authConfigured } from "./leads-shared";
import type { StaffUser } from "./users-shared";

export * from "./users-shared";

const MOCK_USERS: StaffUser[] = [
  { id: "s-waty", full_name: "Madam Waty", email: "waty@premium.edu.my", role: "admin" },
  { id: "s-aina", full_name: "Aina", email: "aina@premium.edu.my", role: "admissions" },
  { id: "s-hafiz", full_name: "Hafiz", email: "hafiz@premium.edu.my", role: "visa" },
  { id: "s-meiling", full_name: "Mei Ling", email: "meiling@premium.edu.my", role: "finance" },
  { id: "s-celia", full_name: "Celia", email: "celia@partners.example", role: "agent", agent_code: "CELIA" },
  { id: "s-felix", full_name: "Felix", email: "felix@partners.example", role: "agent", agent_code: "FELIX" },
];

export async function listUsers(q?: string): Promise<StaffUser[]> {
  let rows: StaffUser[];
  if (!authConfigured) {
    rows = MOCK_USERS;
  } else {
    const supabase = await createClient();
    const { data } = await supabase
      .from("profiles")
      .select("id,full_name,email,role,agent_code,created_at")
      .order("created_at", { ascending: true })
      .limit(200);
    rows = (data as StaffUser[] | null) ?? [];
  }
  if (!q) return rows;
  const needle = q.toLowerCase();
  return rows.filter((u) =>
    `${u.full_name} ${u.email} ${u.role} ${u.agent_code ?? ""}`
      .toLowerCase()
      .includes(needle),
  );
}
