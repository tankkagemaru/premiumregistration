import type { Role } from "@/lib/auth";

export interface StaffUser {
  id: string;
  full_name: string;
  email: string;
  role: Role;
  agent_code?: string | null;
  // For role = agent: the master agent this agent is handled under.
  parent_agent_id?: string | null;
  created_at?: string;
}

export const ASSIGNABLE_ROLES: Role[] = [
  "admin",
  "boss",
  "marketing",
  "admissions",
  "visa",
  "finance",
  "academic",
  "counsellor",
  "staff",
  "agent",
];
