import { createClient } from "@/lib/supabase/server";
import { authConfigured } from "./applications-shared";
import type { ProgramIntake, PublicHoliday } from "./intakes-shared";

export * from "./intakes-shared";

export async function listIntakes(): Promise<ProgramIntake[]> {
  if (!authConfigured) return [];
  const supabase = await createClient();
  const { data } = await supabase
    .from("program_intakes")
    .select("*")
    .order("start_date", { ascending: true });
  return (data as ProgramIntake[] | null) ?? [];
}

export async function listHolidays(): Promise<PublicHoliday[]> {
  if (!authConfigured) return [];
  const supabase = await createClient();
  const { data } = await supabase
    .from("public_holidays")
    .select("*")
    .order("holiday_date", { ascending: true });
  return (data as PublicHoliday[] | null) ?? [];
}
