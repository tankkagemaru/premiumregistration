-- Migration 20_program_intakes_holidays. Applied live via the MCP.

create table if not exists program_intakes (
  id          uuid primary key default gen_random_uuid(),
  program     text not null,            -- pep | exam_prep | summer_camp | other
  level       int,                      -- PEP 1..5; null otherwise
  route       text,                     -- exam-prep route — free text
  label       text,
  start_date  date not null,
  end_date    date not null,            -- auto-computed from duration, editable
  capacity    int,
  status      text not null default 'planned', -- planned | open | running | done | cancelled
  notes       text,
  created_by  uuid references profiles(id),
  created_at  timestamptz not null default now()
);
create index if not exists program_intakes_start_idx on program_intakes (start_date);

alter table program_intakes enable row level security;
drop policy if exists "intakes read" on program_intakes;
create policy "intakes read" on program_intakes for select to authenticated using (true);
drop policy if exists "intakes write" on program_intakes;
create policy "intakes write" on program_intakes for all to authenticated
  using (public.has_role(array['admin','academic']))
  with check (public.has_role(array['admin','academic']));

create table if not exists public_holidays (
  id           uuid primary key default gen_random_uuid(),
  holiday_date date not null unique,
  name         text not null,
  created_at   timestamptz not null default now()
);

alter table public_holidays enable row level security;
drop policy if exists "holidays read" on public_holidays;
create policy "holidays read" on public_holidays for select to authenticated using (true);
drop policy if exists "holidays write" on public_holidays;
create policy "holidays write" on public_holidays for all to authenticated
  using (public.has_role(array['admin','academic']))
  with check (public.has_role(array['admin','academic']));

alter table applications add column if not exists intake_id uuid references program_intakes(id);

-- Malaysia federal public holidays 2026 (religious/movable dates need verifying).
insert into public_holidays (holiday_date, name) values
('2026-01-01','New Year''s Day'),
('2026-02-17','Chinese New Year'),
('2026-02-18','Chinese New Year (2nd day)'),
('2026-03-20','Hari Raya Aidilfitri'),
('2026-03-21','Hari Raya Aidilfitri (2nd day)'),
('2026-05-01','Labour Day'),
('2026-05-27','Hari Raya Haji'),
('2026-05-31','Wesak Day'),
('2026-06-01','Agong''s Birthday'),
('2026-06-17','Awal Muharram'),
('2026-08-25','Maulidur Rasul'),
('2026-08-31','National Day (Merdeka)'),
('2026-09-16','Malaysia Day'),
('2026-11-08','Deepavali'),
('2026-12-25','Christmas Day')
on conflict (holiday_date) do nothing;
