-- =============================================================================
-- PECSB Platform — recruitment & admissions data model (additive migration).
-- Run AFTER schema.sql + storage.sql. Extends the lead-capture schema into the
-- full application lifecycle. Reuses helpers current_role() / current_agent_code().
-- =============================================================================

-- Expanded staff/partner roles: admin | admissions | visa | finance |
-- counsellor | agent | student  (existing rows keep their value).
alter table profiles add column if not exists agent_tier text;      -- for role = agent
alter table profiles add column if not exists commission_rate numeric; -- default % for the partner

create or replace function public.has_role(roles text[]) returns boolean
  language sql stable security definer set search_path = public as $$
  select coalesce((select role from profiles where id = auth.uid()) = any(roles), false);
$$;

-- -----------------------------------------------------------------------------
-- students — the person master (created when an enquiry becomes an applicant)
-- -----------------------------------------------------------------------------
create table if not exists students (
  id            uuid primary key default gen_random_uuid(),
  created_at    timestamptz not null default now(),
  enquiry_id    uuid references registrations(id) on delete set null,
  full_name     text not null,
  email         text not null,
  phone         text,
  whatsapp      text,
  nationality   text,
  home_country  text,
  passport_no   text,
  date_of_birth date,
  gender        text,
  -- Residency drives the pipeline lane, NOT the track: any international student
  -- (English or university) needs a student pass and runs the full visa/medical
  -- lane; local (Malaysian) students take the short lane.
  is_international boolean not null default true,
  agent_code    text,
  agent_id      uuid references profiles(id)
);
create index if not exists students_agent_idx on students (agent_id);
create index if not exists students_passport_idx on students (passport_no);

-- -----------------------------------------------------------------------------
-- applications — the unit that moves through the pipeline
-- -----------------------------------------------------------------------------
create table if not exists applications (
  id                 uuid primary key default gen_random_uuid(),
  created_at         timestamptz not null default now(),
  student_id         uuid not null references students(id) on delete cascade,
  track              text not null,                 -- english | university | corporate
  submitted_by       text not null default 'student', -- student | agent | staff
  agent_id           uuid references profiles(id),
  target_institution text,                          -- value from the institutions list
  program_name       text,
  qualification_level text,                          -- foundation | diploma | degree | master | phd
  intake             text,
  -- pipeline state machine
  stage              text not null default 'application', -- see build spec §pipeline
  sub_status         text,
  status             text not null default 'active',   -- active | withdrawn | completed
  assigned_to        uuid references profiles(id),
  next_action        text,
  next_action_due    date,
  -- Public status portal: a random code, auto-generated, given to the student.
  access_code        text not null default upper(substr(md5(gen_random_uuid()::text) from 1 for 10)),
  -- Denormalised display fields (populated on creation) so list reads are a
  -- plain `select *` — the app types are flat, so we avoid fragile join-shape
  -- mapping. Keep in sync when the student/agent changes.
  student_name       text,
  student_email      text,
  passport_no        text,        -- second factor for the status portal
  is_international    boolean,
  agent_name         text,
  meta               jsonb not null default '{}'::jsonb
);
create index if not exists applications_access_code_idx on applications (access_code);
create index if not exists applications_student_idx on applications (student_id);
create index if not exists applications_stage_idx on applications (stage);
create index if not exists applications_agent_idx on applications (agent_id);
create index if not exists applications_assigned_idx on applications (assigned_to);

-- application_events — the per-application timeline (notes, stage moves, emails…)
create table if not exists application_events (
  id             uuid primary key default gen_random_uuid(),
  application_id uuid not null references applications(id) on delete cascade,
  actor_id       uuid references profiles(id),
  type           text not null,   -- note | stage_change | email | call | doc | offer | payment | assignment
  from_stage     text,
  to_stage       text,
  body           text,
  meta           jsonb,
  created_at     timestamptz not null default now()
);
create index if not exists application_events_idx on application_events (application_id, created_at desc);

-- application_documents — per-application files (superset of registration_documents)
create table if not exists application_documents (
  id             uuid primary key default gen_random_uuid(),
  application_id uuid not null references applications(id) on delete cascade,
  kind           text not null,   -- passport | transcript | photo | financial | offer_letter | medical | eval | val | other
  storage_path   text not null,
  drive_url      text,
  review_status  text not null default 'pending', -- pending | verified | rejected
  uploaded_by    uuid references profiles(id),
  created_at     timestamptz not null default now()
);
create index if not exists application_documents_idx on application_documents (application_id);

-- offers — conditional / final offer letters
create table if not exists offers (
  id             uuid primary key default gen_random_uuid(),
  application_id uuid not null references applications(id) on delete cascade,
  type           text not null,   -- conditional | final
  conditions     text,
  status         text not null default 'draft', -- draft | issued | accepted | declined
  letter_path    text,
  issued_at      timestamptz,
  accepted_at    timestamptz,
  created_at     timestamptz not null default now()
);
create index if not exists offers_application_idx on offers (application_id);

-- fees + payments (record-only in v1)
create table if not exists fees (
  id             uuid primary key default gen_random_uuid(),
  application_id uuid not null references applications(id) on delete cascade,
  student_name   text,            -- denormalised for list reads
  type           text not null,   -- application | registration | visa_emgs | medical | insurance | tuition | other
  label          text,
  amount         numeric(12,2) not null,
  currency       text not null default 'MYR',
  due_date       date,
  status         text not null default 'unpaid', -- unpaid | partial | paid | waived
  created_at     timestamptz not null default now()
);
create index if not exists fees_application_idx on fees (application_id);

create table if not exists payments (
  id             uuid primary key default gen_random_uuid(),
  fee_id         uuid references fees(id) on delete set null,
  application_id uuid not null references applications(id) on delete cascade,
  amount         numeric(12,2) not null,
  method         text,            -- bank_transfer | fpx | card | cash | other
  reference      text,
  receipt_path   text,
  recorded_by    uuid references profiles(id),
  paid_at        date not null default current_date,
  created_at     timestamptz not null default now()
);
create index if not exists payments_application_idx on payments (application_id);

-- commissions — payable to (or receivable from) a recruitment partner
create table if not exists commissions (
  id             uuid primary key default gen_random_uuid(),
  application_id uuid not null references applications(id) on delete cascade,
  agent_id       uuid references profiles(id),
  student_name   text,            -- denormalised for list reads
  agent_name     text,            -- partner name (or the payer, for receivable)
  direction      text not null default 'payable',  -- payable | receivable
  basis          text not null default 'percent',  -- percent | fixed
  rate           numeric(12,2),
  amount         numeric(12,2),
  currency       text not null default 'MYR',
  milestone      text not null default 'on_enrolment', -- on_offer | on_enrolment | on_payment
  status         text not null default 'accrued',  -- accrued | invoiced | paid
  created_at     timestamptz not null default now(),
  paid_at        date
);
create index if not exists commissions_agent_idx on commissions (agent_id);
create index if not exists commissions_application_idx on commissions (application_id);

-- visa_cases — flexible submitter (university for private, PECSB for public)
create table if not exists visa_cases (
  id                  uuid primary key default gen_random_uuid(),
  application_id      uuid not null references applications(id) on delete cascade,
  student_name        text,            -- denormalised for list reads
  target              text,            -- programme / institution
  submitted_by        text,            -- university | pecsb
  emgs_ref            text,
  eval_status         text,            -- not_started | submitted | approved | rejected
  medical_status      text,            -- pending | passed | failed
  val_status          text,
  single_entry_visa   text,
  student_pass_expiry date,
  stage               text not null default 'not_started',
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);
create index if not exists visa_cases_application_idx on visa_cases (application_id);
create index if not exists visa_cases_expiry_idx on visa_cases (student_pass_expiry);

create table if not exists visa_renewals (
  id            uuid primary key default gen_random_uuid(),
  visa_case_id  uuid not null references visa_cases(id) on delete cascade,
  due_date      date,
  submitted_at  date,
  status        text not null default 'upcoming', -- upcoming | submitted | approved
  created_at    timestamptz not null default now()
);

-- =============================================================================
-- Row Level Security. Public writes still go through the service-role server.
-- Departments read/update their own module; agents are scoped to their students.
-- =============================================================================
alter table students              enable row level security;
alter table applications          enable row level security;
alter table application_events    enable row level security;
alter table application_documents enable row level security;
alter table offers                enable row level security;
alter table fees                  enable row level security;
alter table payments              enable row level security;
alter table commissions           enable row level security;
alter table visa_cases            enable row level security;
alter table visa_renewals         enable row level security;

-- Staff who can see application records at all (everyone except pure agents/students).
-- helper: does the current agent own this application?
create or replace function public.owns_application(app_id uuid) returns boolean
  language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from applications a
    where a.id = app_id and a.agent_id = auth.uid()
  );
$$;

-- students / applications: staff read all; agents read their own.
create policy "students staff read" on students for select to authenticated
  using (has_role(array['admin','admissions','visa','finance','academic','counsellor','staff'])
         or agent_id = auth.uid());
create policy "applications staff read" on applications for select to authenticated
  using (has_role(array['admin','admissions','visa','finance','academic','counsellor','staff'])
         or agent_id = auth.uid());
create policy "applications staff write" on applications for update to authenticated
  using (has_role(array['admin','admissions','visa','academic','counsellor']))
  with check (has_role(array['admin','admissions','visa','academic','counsellor']));

-- events / documents / offers: readable by staff + owning agent; staff insert.
create policy "events read" on application_events for select to authenticated
  using (has_role(array['admin','admissions','visa','finance','academic','counsellor','staff'])
         or owns_application(application_id));
create policy "events staff insert" on application_events for insert to authenticated
  with check (has_role(array['admin','admissions','visa','finance','academic','counsellor','staff'])
              and actor_id = auth.uid());
create policy "docs read" on application_documents for select to authenticated
  using (has_role(array['admin','admissions','visa','finance','counsellor'])
         or owns_application(application_id));
create policy "docs staff update" on application_documents for update to authenticated
  using (has_role(array['admin','admissions','visa'])) with check (true);
create policy "offers read" on offers for select to authenticated
  using (has_role(array['admin','admissions','finance','counsellor'])
         or owns_application(application_id));
create policy "offers staff write" on offers for all to authenticated
  using (has_role(array['admin','admissions'])) with check (has_role(array['admin','admissions']));

-- finance: finance/admin manage; owning agent may read fees/commissions on their apps.
create policy "fees read" on fees for select to authenticated
  using (has_role(array['admin','finance','admissions','academic'])
         or owns_application(application_id));
create policy "fees finance write" on fees for all to authenticated
  using (has_role(array['admin','finance'])) with check (has_role(array['admin','finance']));
create policy "payments finance" on payments for all to authenticated
  using (has_role(array['admin','finance'])) with check (has_role(array['admin','finance']));
create policy "commissions read" on commissions for select to authenticated
  using (has_role(array['admin','finance']) or agent_id = auth.uid());
create policy "commissions finance write" on commissions for all to authenticated
  using (has_role(array['admin','finance'])) with check (has_role(array['admin','finance']));

-- visa: visa/admin manage; owning agent reads status.
create policy "visa read" on visa_cases for select to authenticated
  using (has_role(array['admin','visa','admissions']) or owns_application(application_id));
create policy "visa write" on visa_cases for all to authenticated
  using (has_role(array['admin','visa'])) with check (has_role(array['admin','visa']));
create policy "renewals read" on visa_renewals for select to authenticated
  using (has_role(array['admin','visa']));
create policy "renewals write" on visa_renewals for all to authenticated
  using (has_role(array['admin','visa'])) with check (has_role(array['admin','visa']));

-- Note: the public student status portal does NOT use RLS — a server route
-- validates passport_no + applications.access_code with the service-role key
-- and returns a read-only, redacted timeline.
