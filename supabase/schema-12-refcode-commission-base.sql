-- Migration 12_refcode_commission_base. Idempotent. Applied live via the MCP.
-- Two unrelated concerns bundled: (1) a student-facing tracking code minted at
-- registration, and (2) a settable commission base fee (promotions / agent
-- pricing flexibility). English commission is scoped to tuition in code, not here.

-- (1) Tracking code on every enquiry. High-entropy, human-typable (10 hex chars),
-- emailed to the applicant so they can check status before an application exists.
alter table registrations
  add column if not exists access_code text
    default upper(substr(md5(gen_random_uuid()::text), 1, 10));
-- Backfill any pre-existing rows that predate the default.
update registrations
  set access_code = upper(substr(md5(gen_random_uuid()::text), 1, 10))
  where access_code is null;
create unique index if not exists registrations_access_code_idx
  on registrations (access_code);

-- (2) Commission base fee. base_amount is the settable figure a rule/commission
-- applies its rate to; base_fee_type records what that figure represents
-- (e.g. tuition | full_fee | promo). Per-commission base_amount overrides the
-- rule default so a single deal can be priced up or down.
alter table commission_rules
  add column if not exists base_amount numeric(12,2),
  add column if not exists base_fee_type text;

alter table commissions
  add column if not exists base_amount numeric(12,2);
