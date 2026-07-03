import type { Role } from "@/lib/auth";

export interface StaffUser {
  id: string;
  full_name: string;
  email: string;
  role: Role;
  agent_code?: string | null;
  created_at?: string;
}

export const ASSIGNABLE_ROLES: Role[] = [
  "admin",
  "marketing",
  "admissions",
  "visa",
  "finance",
  "academic",
  "counsellor",
  "staff",
  "agent",
];
