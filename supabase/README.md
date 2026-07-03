# Database setup

Run these SQL files **in order** in the Supabase SQL editor (or via
`supabase db push`). Each is additive and safe to re-run.

| # | File | What it creates |
|---|------|-----------------|
| 1 | `schema.sql` | `profiles`, `registrations`, `registration_documents`, `lead_events`, `notifications`; `current_role()` / `current_agent_code()`; RLS |
| 2 | `storage.sql` | private `registration-docs` bucket + storage policy |
| 3 | `schema-platform.sql` | `students`, `applications` (+ stage engine, auto access codes, denormalised display fields), `offers`, `fees`, `payments`, `commissions`, `visa_cases`, `visa_renewals`; `has_role()`; per-module RLS |
| 4 | `schema-audit.sql` | `audit_logs` (admin-read) |
| 5 | `schema-teams.sql` | `action_requests` + `applications.class_start/end` |

Order matters: `storage.sql` and `schema-audit.sql` use `current_role()` from
step 1; `schema-teams.sql` uses `has_role()` from step 3.

## Bootstrap the first admin

After the schema is in, create one Auth user (Dashboard → Authentication → Add
user, or the API), then give it the admin role:

```sql
-- replace the email with the user you just created
insert into public.profiles (id, full_name, email, role)
select id, 'Madam Waty', email, 'admin'
from auth.users where email = 'waty@premium.edu.my'
on conflict (id) do update set role = 'admin';
```

From then on, all other staff/partner accounts are created inside the app at
**/admin/users** (superadmin only).

## Roles

`admin` (superadmin) · `marketing` · `admissions` · `visa` · `finance` ·
`academic` · `counsellor` · `staff` · `agent`. `student` self-service is the
public `/status` portal (no account).

## Notes

- The public form writes via the **service-role key** on the server, so it
  bypasses RLS by design. There are intentionally no anonymous insert policies.
- `applications.access_code` is auto-generated; the student uses it + their
  passport **or** email at `/status`.
- Display fields (`student_name`, `agent_name`, …) are denormalised onto
  `applications`/`fees`/`commissions`/`visa_cases` and populated on creation, so
  list reads are a plain `select *`.
