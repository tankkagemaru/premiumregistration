-- Migration 14_catalog. Institutions + English programs move to the DB so they
-- can be managed from Settings (admin). Seeded from the former config arrays.
-- Institutions keep the full Malaysian list; `partner` flags PECSB partners and
-- `active` hides an entry from the register form without deleting it.
create table if not exists institutions (
  id         uuid primary key default gen_random_uuid(),
  value      text not null unique,
  label      text not null,
  category   text not null,
  partner    boolean not null default false,
  active     boolean not null default true,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);
create index if not exists institutions_active_idx on institutions (active);

create table if not exists programs (
  id         uuid primary key default gen_random_uuid(),
  value      text not null unique,
  label      text not null,
  active     boolean not null default true,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

alter table institutions enable row level security;
alter table programs enable row level security;

-- Public (anon + authenticated) read of active rows — the register form needs
-- them without a session.
drop policy if exists "institutions public read" on institutions;
create policy "institutions public read" on institutions for select using (active);
drop policy if exists "programs public read" on programs;
create policy "programs public read" on programs for select using (active);

-- Admin manages the catalog (Settings is admin-gated). Admin also reads inactive
-- rows via this policy (policies are OR'd).
drop policy if exists "institutions admin all" on institutions;
create policy "institutions admin all" on institutions for all to authenticated
  using (public.has_role(array['admin'])) with check (public.has_role(array['admin']));
drop policy if exists "programs admin all" on programs;
create policy "programs admin all" on programs for all to authenticated
  using (public.has_role(array['admin'])) with check (public.has_role(array['admin']));

insert into institutions (value,label,category,sort_order) values
('iium','International Islamic University Malaysia (IIUM)','public',0),
('upnm','National Defence University of Malaysia (UPNM)','public',1),
('ukm','Universiti Kebangsaan Malaysia (UKM)','public',2),
('um','Universiti Malaya (UM)','public',3),
('umk','Universiti Malaysia Kelantan (UMK)','public',4),
('ump','Universiti Malaysia Pahang Al-Sultan Abdullah (UMPSA)','public',5),
('unimap','Universiti Malaysia Perlis (UniMAP)','public',6),
('ums','Universiti Malaysia Sabah (UMS)','public',7),
('unimas','Universiti Malaysia Sarawak (UNIMAS)','public',8),
('umt','Universiti Malaysia Terengganu (UMT)','public',9),
('upsi','Universiti Pendidikan Sultan Idris (UPSI)','public',10),
('upm','Universiti Putra Malaysia (UPM)','public',11),
('usm','Universiti Sains Malaysia (USM)','public',12),
('usim','Universiti Sains Islam Malaysia (USIM)','public',13),
('unisza','Universiti Sultan Zainal Abidin (UniSZA)','public',14),
('utem','Universiti Teknikal Malaysia Melaka (UTeM)','public',15),
('utm','Universiti Teknologi Malaysia (UTM)','public',16),
('uitm','Universiti Teknologi MARA (UiTM)','public',17),
('uthm','Universiti Tun Hussein Onn Malaysia (UTHM)','public',18),
('uum','Universiti Utara Malaysia (UUM)','public',19),
('aimst','AIMST University','private',20),
('aiu','Albukhary International University (AIU)','private',21),
('mediu','Al-Madinah International University (MEDIU)','private',22),
('aeu','Asia e University (AeU)','private',23),
('amu','Asia Metropolitan University (AMU)','private',24),
('apu','Asia Pacific University of Technology & Innovation (APU)','private',25),
('binary','Binary University of Management & Entrepreneurship','private',26),
('cityu','City University Malaysia (CityU)','private',27),
('dhu','DRB-HICOM University of Automotive Malaysia (DHU)','private',28),
('globalnxt','GlobalNxt University (GNU)','private',29),
('help','HELP University','private',30),
('imu','IMU University (formerly International Medical University)','private',31),
('inceif','INCEIF University','private',32),
('inti','INTI International University (INTI)','private',33),
('uim','Islamic University of Malaysia (UIM)','private',34),
('klust','Kuala Lumpur University of Science & Technology (KLUST)','private',35),
('limkokwing','Limkokwing University of Creative Technology','private',36),
('mahsa','MAHSA University','private',37),
('unimel','Kolej Universiti Islam Melaka (UNIMEL)','private',38),
('must','Malaysia University of Science & Technology (MUST)','private',39),
('msu','Management & Science University (MSU)','private',40),
('mila','MILA University','private',41),
('misi','MISI University','private',42),
('mmu','Multimedia University (MMU)','private',43),
('uniten','National Energy University (UNITEN)','private',44),
('nilai','Nilai University','private',45),
('oum','Open University Malaysia (OUM)','private',46),
('perdana','Perdana University (PU)','private',47),
('utp','Universiti Teknologi PETRONAS (UTP)','private',48),
('uptm','Poly-Tech University Malaysia (UPTM)','private',49),
('qiu','Quest International University (QIU)','private',50),
('segi','SEGi University','private',51),
('uis','Selangor Islamic University (UIS)','private',52),
('unishams','Sultan Abdul Halim Mu''adzam Shah International Islamic University (UniSHAMS)','private',53),
('usas','Sultan Azlan Shah University (USAS)','private',54),
('sunway','Sunway University','private',55),
('taylors','Taylor''s University','private',56),
('unirazak','Universiti Tun Abdul Razak (UNIRAZAK)','private',57),
('utar','Universiti Tunku Abdul Rahman (UTAR)','private',58),
('tarumt','Tunku Abdul Rahman University of Management and Technology (TAR UMT)','private',59),
('ucsi','UCSI University','private',60),
('unimy','Universiti Malaysia of Computer Science & Engineering (UniMy)','private',61),
('unitar','UNITAR International University','private',62),
('uoc','University of Cyberjaya (UoC)','private',63),
('unikl','University of Kuala Lumpur (UniKL)','private',64),
('umwales','University of Malaya-Wales (UM-Wales)','private',65),
('unisel','University of Selangor (UNISEL)','private',66),
('uts','University of Technology Sarawak (UTS)','private',67),
('wou','Wawasan Open University (WOU)','private',68),
('berjaya-uc','BERJAYA University College','university-college',69),
('cosmopoint-uc','Cosmopoint International University College (CiUC)','university-college',70),
('firstcity-uc','First City University College','university-college',71),
('genovasi-uc','Genovasi University College','university-college',72),
('gmi-uc','GMI-University College of Applied Sciences (GMI-UcAS)','university-college',73),
('hanchiang-uc','Han Chiang University College of Communication (HCUC)','university-college',74),
('ijn-uc','IJN University College (IJNUC)','university-college',75),
('insaniah-uc','Insaniah University College (KUIN)','university-college',76),
('jesselton-uc','Jesselton University College (JUC)','university-college',77),
('kpj-uc','KPJ Healthcare University College (KPJUC)','university-college',78),
('lincoln-uc','Lincoln University College (LUC)','university-college',79),
('linton-uc','Linton University College','university-college',80),
('newera-uc','New Era University College (NEUC)','university-college',81),
('saito-uc','SAITO University College','university-college',82),
('southern-uc','Southern University College','university-college',83),
('twintech-uc','Twintech International University College of Technology','university-college',84),
('uniti-uc','UNITI University College','university-college',85),
('unitar-klmuc','UNITAR University College Kuala Lumpur (KLMUC)','university-college',86),
('ucsf','University College Sabah Foundation (UCSF)','university-college',87),
('uctati','University College TATI (UC TATI)','university-college',88),
('uow-kdu-uc','UOW Malaysia KDU University College','university-college',89),
('widad-uc','Widad University College','university-college',90),
('curtin-my','Curtin University Malaysia','branch',91),
('heriotwatt-my','Heriot-Watt University Malaysia','branch',92),
('monash-my','Monash University Malaysia','branch',93),
('numed-my','Newcastle University Medicine Malaysia (NUMed)','branch',94),
('raffles-my','Raffles University (Iskandar)','branch',95),
('rumc-my','RCSI & UCD Malaysia Campus (RUMC)','branch',96),
('swinburne-my','Swinburne University of Technology Sarawak Campus','branch',97),
('nottingham-my','University of Nottingham Malaysia (UNMC)','branch',98),
('reading-my','University of Reading Malaysia (UoRM)','branch',99),
('southampton-my','University of Southampton Malaysia (USMC)','branch',100),
('wollongong-my','University of Wollongong Malaysia (UOW)','branch',101),
('xiamen-my','Xiamen University Malaysia (XMUM)','branch',102)
on conflict (value) do nothing;

insert into programs (value,label,sort_order) values
('general','General English',0),
('business','Business English',1),
('exam_prep','Exam preparation',2),
('corporate_other','Corporate / other',3)
on conflict (value) do nothing;
