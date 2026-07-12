/** Billable-items catalogue types. Pure, client-safe. */

export interface BillableItem {
  id: string;
  name: string;
  fee_type: string; // maps to fees.type
  category: string; // tuition | visa | markup | misc — coarse grouping
  default_amount?: number | null;
  currency: string;
  taxable: boolean;
  commissionable: boolean;
  active: boolean;
  sort_order: number;
  notes?: string | null;
}

/** Coarse categories for the price list, so each team knows which items are
 *  theirs (visa fees, tuition, markup/commission, or miscellaneous). */
export const BILLABLE_CATEGORIES = [
  { id: "tuition", label: "Tuition" },
  { id: "visa", label: "Visa & immigration" },
  { id: "markup", label: "Markup / commission" },
  { id: "misc", label: "Miscellaneous" },
] as const;

export const BILLABLE_CATEGORY_LABEL: Record<string, string> = Object.fromEntries(
  BILLABLE_CATEGORIES.map((c) => [c.id, c.label]),
);
