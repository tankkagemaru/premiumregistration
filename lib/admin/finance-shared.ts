/** Finance types + constants — pure module, safe for client and server. */

export type FeeStatus = "unpaid" | "partial" | "paid" | "waived";
export type FeeType =
  | "application"
  | "registration"
  | "visa_emgs"
  | "immigration"
  | "medical"
  | "insurance"
  | "tuition"
  | "other";

export const FEE_STATUS_LABEL: Record<string, string> = {
  unpaid: "Unpaid",
  partial: "Partially paid",
  paid: "Paid",
  waived: "Waived",
};

export const COMMISSION_MILESTONE_LABEL: Record<string, string> = {
  on_enrolment: "On enrolment",
  on_payment: "On payment",
  on_arrival: "On arrival",
  on_offer: "On offer",
};

export const FEE_TYPE_LABEL: Record<FeeType, string> = {
  application: "Application fee",
  registration: "Registration fee",
  visa_emgs: "EMGS fee",
  immigration: "Immigration fee",
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
  claim_ready?: boolean; // finance has opened this for the agent to claim
  claim_invoice_doc_id?: string | null; // the agent's uploaded claim invoice
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
