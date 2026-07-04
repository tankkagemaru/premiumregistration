/** Agent-code registry types + constants. Pure, client-safe. */

export interface AgentCode {
  id: string;
  created_at: string;
  code: string;
  agent_name: string;
  contact?: string | null;
  notes?: string | null;
  active: boolean;
  issued_by?: string | null;
  issued_by_name?: string | null; // resolved for display
  profile_id?: string | null; // linked agent login (ties portal access to the code)
  profile_name?: string | null; // resolved for display
}

/** Roles allowed to issue / manage agent codes. */
export const AGENT_CODE_ROLES = ["admin", "finance", "marketing"];

/** A readable, hard-to-guess code, e.g. "AG-7F3K9Q". */
export function generateAgentCode(seed: string): string {
  const body = seed.replace(/[^a-z0-9]/gi, "").slice(0, 6).toUpperCase();
  return `AG-${body}`;
}
