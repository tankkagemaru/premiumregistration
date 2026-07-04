/** Billable-items catalogue types. Pure, client-safe. */

export interface BillableItem {
  id: string;
  name: string;
  fee_type: string; // maps to fees.type
  default_amount?: number | null;
  currency: string;
  taxable: boolean;
  commissionable: boolean;
  active: boolean;
  sort_order: number;
  notes?: string | null;
}
