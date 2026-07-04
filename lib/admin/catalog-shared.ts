/** Catalog types — institutions + programs. Pure, client-safe. */

export interface Institution {
  id: string;
  value: string;
  label: string;
  category: string;
  partner: boolean;
  active: boolean;
  sort_order: number;
}

export interface Program {
  id: string;
  value: string;
  label: string;
  active: boolean;
  sort_order: number;
}

export const INSTITUTION_CATEGORIES = [
  "public",
  "private",
  "university-college",
  "branch",
] as const;

/** A stable machine value derived from a label (for new catalog rows). */
export function slugify(label: string): string {
  return (
    label
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 40) || "item"
  );
}
