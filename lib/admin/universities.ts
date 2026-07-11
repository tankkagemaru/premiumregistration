import { createClient } from "@/lib/supabase/server";
import { authConfigured } from "./applications-shared";
import type { University } from "./universities-shared";

const MOCK: University[] = [
  {
    id: "u-mock-1",
    name: "Universiti Malaya (UM)",
    short_name: "UM",
    type: "Public",
    currency: "MYR",
    website: "https://www.um.edu.my",
    location: "Kuala Lumpur",
    intakes: "Feb, Sep",
    active: true,
    programmes: {
      "Bachelor of Computer Science": "89,200",
      "Bachelor of Accounting": "99,100",
      "Master of Business Administration (MBA)": "79,100",
    },
  },
];

/** All universities in the catalogue (active first, alphabetical). */
export async function listUniversities(): Promise<University[]> {
  if (!authConfigured) return MOCK;
  const supabase = await createClient();
  const { data } = await supabase
    .from("universities")
    .select("*")
    .order("name", { ascending: true });
  return ((data as University[] | null) ?? []).map((u) => ({
    ...u,
    programmes: (u.programmes ?? {}) as Record<string, string>,
  }));
}
