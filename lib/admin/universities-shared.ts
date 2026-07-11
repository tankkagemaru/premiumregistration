/** University catalogue — pure types (client + server safe). Programmes are a
 *  { "Programme name": "fee" } map, mirroring the admissions finder tool. Fees
 *  are free-text strings (e.g. "132,100", "1,718.75 (Per Semester)"). */

export interface University {
  id: string;
  name: string;
  short_name?: string | null;
  type?: string | null; // Public | Private
  currency: string;
  website?: string | null;
  location?: string | null;
  intakes?: string | null;
  programmes: Record<string, string>;
  active: boolean;
}

/** Flatten to programme rows for searching/listing. */
export interface ProgrammeRow {
  university: string;
  name: string;
  fee: string;
  currency: string;
}

export function programmeRows(u: University): ProgrammeRow[] {
  return Object.entries(u.programmes ?? {}).map(([name, fee]) => ({
    university: u.name,
    name,
    fee,
    currency: u.currency,
  }));
}
