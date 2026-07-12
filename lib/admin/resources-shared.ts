/** Shared resources — marketing materials, documents, agreements. Pure. */

export interface Resource {
  id: string;
  label: string;
  url: string;
  category: string; // marketing | document | agreement
  active: boolean;
  sort_order: number;
}

export const RESOURCE_CATEGORIES = [
  { id: "marketing", label: "Marketing materials" },
  { id: "document", label: "Important documents" },
  { id: "agreement", label: "Agreements" },
] as const;

export const RESOURCE_CATEGORY_LABEL: Record<string, string> = Object.fromEntries(
  RESOURCE_CATEGORIES.map((c) => [c.id, c.label]),
);
