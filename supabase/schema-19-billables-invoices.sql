-- Migration 19_billable_items_invoices. Applied live via the MCP.

-- Billable-items catalogue: the price list fees are created from (name, default
-- amount, tax/commission flags). Finance/admin manage; all staff can read.
create table if not exists billable_items (
  id             uuid primary key default gen_random_uuid(),
  name           text not null,
  fee_type       text not null default 'other', -- maps to fees.type
  default_amount numeric(12,2),
  currency       text not null default 'MYR',
  taxable        boolean not null default false,
  commissionable boolean not null default false,
  active         boolean not null default true,
  sort_order     int not null default 0,
  notes          text,
  created_at     timestamptz not null default now()
);

alter table billable_items enable row level security;
drop policy if exists "billables read" on billable_items;
create policy "billables read" on billable_items for select to authenticated using (true);
drop policy if exists "billables write" on billable_items;
create policy "billables write" on billable_items for all to authenticated
  using (public.has_role(array['admin','finance']))
  with check (public.has_role(array['admin','finance']));

-- Fees: which catalogue item they came from + the attached invoice document.
alter table fees
  add column if not exists billable_item_id uuid references billable_items(id),
  add column if not exists invoice_doc_id uuid references application_documents(id);

-- Seed the common PECSB items (tune amounts in the console).
insert into billable_items (name, fee_type, default_amount, taxable, commissionable, sort_order) values
('Application fee', 'application', 100, false, false, 0),
('Registration fee', 'registration', 500, false, false, 1),
('Tuition (per term)', 'tuition', null, false, true, 2),
('EMGS / visa processing', 'visa_emgs', 2500, false, false, 3),
('Medical screening', 'medical', 250, false, false, 4),
('Insurance (annual)', 'insurance', 500, false, false, 5),
('Resource / materials fee', 'other', 150, false, false, 6),
('Airport pickup', 'other', 200, false, false, 7)
on conflict do nothing;
