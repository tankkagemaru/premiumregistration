/** Finance types + constants — pure module, safe for client and server. */

export type FeeStatus = "unpaid" | "partial" | "paid" | "waived";
export type FeeType =
  | "application"
  | "registration"
  | "visa_emgs"
  | "medical"
  | "insurance"
  | "tuition"
  | "other";

export const FEE_TYPE_LABEL: Record<FeeType, string> = {
  application: "Application fee",
  registration: "Registration fee",
  visa_emgs: "Visa / EMGS fee",
  medical: "Medical screening",
  insurance: "Insurance",
  tuition: "Tuition",
  other: "Other",
};

export interface Fee {
  id: string;
  application_id: string;
  student_name: string;
  type: FeeType;
  label?: string | null;
  amount: number;
  currency: string;
  due_date?: string | null;
  status: FeeStatus;
  waive_reason?: string | null; // why a waived fee was waived (promo / scholarship)
  billable_item_id?: string | null; // catalogue item this fee came from
  invoice_doc_id?: string | null; // attached third-party invoice (QuickBooks)
}

export interface Payment {
  id: string;
  application_id: string;
  fee_id?: string | null;
  amount: number;
  method?: string | null;
  reference?: string | null;
  paid_at: string;
}

export type CommissionStatus = "accrued" | "invoiced" | "paid";

export interface Commission {
  id: string;
  application_id: string;
  student_name: string;
  agent_id?: string | null;
  agent_name?: string | null;
  /** payable = PECSB pays the recruitment partner; receivable = a university pays PECSB. */
  direction: "payable" | "receivable";
  amount: number;
  base_amount?: number | null; // the fee the rate was applied to (settable per deal)
  currency: string;
  milestone: string; // on_offer | on_enrolment | on_payment
  status: CommissionStatus;
}

export function formatMoney(
  amount: number | null | undefined,
  currency = "MYR",
): string {
  if (amount == null) return "—"; // e.g. an accrued commission whose amount is TBD
  return `${currency} ${amount.toLocaleString("en-MY")}`;
}

/** Amount actually received against a fee. */
export function paidTowards(fee: Fee, payments: Payment[]): number {
  return payments
    .filter((p) => p.fee_id === fee.id)
    .reduce((sum, p) => sum + p.amount, 0);
}
