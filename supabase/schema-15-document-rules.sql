-- Migration 15_document_rules. Applied live via the MCP. Editable document
-- requirements: each rule requires a document under conditions (track, study
-- level, residency, a specific nationality, and the stage it's needed at —
-- application vs visa/EMGS). Seeded from the former hardcoded matrix + a
-- visa-stage example (flight ticket). The requiredDocuments() matcher resolves
-- these per applicant.
create table if not exists document_rules (
  id          uuid primary key default gen_random_uuid(),
  kind        text not null,
  label       text not null,
  note        text,
  optional    boolean not null default false,
  active      boolean not null default true,
  track       text,                                 -- english|university|corporate | null(any)
  level       text,                                 -- ug|pg|phd | null(any)
  applies_to  text not null default 'all',          -- all|international|local
  nationality text,                                 -- country code | null(any)
  stage       text not null default 'application',  -- application|visa
  sort_order  int not null default 0,
  created_at  timestamptz not null default now()
);
create index if not exists document_rules_active_idx on document_rules (active);

alter table document_rules enable row level security;

-- Public read of active rules (the register/status flow resolves them without a
-- session); admin manages the rules (Settings is admin-gated).
drop policy if exists "doc_rules public read" on document_rules;
create policy "doc_rules public read" on document_rules for select using (active);
drop policy if exists "doc_rules admin all" on document_rules;
create policy "doc_rules admin all" on document_rules for all to authenticated
  using (public.has_role(array['admin'])) with check (public.has_role(array['admin']));

insert into document_rules (kind,label,note,optional,track,level,applies_to,stage,sort_order) values
('photo','Passport-size photo',null,false,null,null,'all','application',0),
('passport','Passport (bio-data page)',null,false,null,null,'international','application',1),
('transcript','Academic transcript(s)',null,false,'university','ug','all','application',2),
('certificate','Highest qualification certificate',null,false,'university','ug','all','application',3),
('english_test','English test (IELTS / MUET / TOEFL)','if already taken',true,'university','ug','all','application',4),
('transcript','Degree transcript(s)',null,false,'university','pg','all','application',5),
('certificate','Degree certificate(s)',null,false,'university','pg','all','application',6),
('cv','CV / résumé',null,false,'university','pg','all','application',7),
('english_test','English test (IELTS / TOEFL)',null,false,'university','pg','all','application',8),
('proposal','Research proposal',null,false,'university','phd','all','application',9),
('reference','Reference letter(s)',null,true,'university','pg','all','application',10),
('financial','Proof of financial support',null,false,'university',null,'international','application',11),
('certificate','Highest qualification (optional)',null,true,'english',null,'all','application',12),
('company_letter','Company request / nomination letter',null,true,'corporate',null,'all','application',13),
('ticket','Flight itinerary / ticket',null,false,null,null,'international','visa',14);
