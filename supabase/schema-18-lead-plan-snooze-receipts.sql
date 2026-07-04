-- Migration 18_lead_plan_snooze_receipts. Applied live via the MCP.

-- Study plans on leads (pre-conversion) — same shape as applications.plan.
alter table registrations add column if not exists plan jsonb;

-- Stale-flag dismissal: snooze until a date; the reason is recorded as a lead event.
alter table registrations add column if not exists stale_snoozed_until date;

-- Payment receipts: link a payment to the uploaded receipt document.
alter table payments add column if not exists receipt_doc_id uuid references application_documents(id);
