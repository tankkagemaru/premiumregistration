# Deployment (P0 go-live)

End-to-end steps to take the platform from "runs on mock data" to live. Roughly
in order; the whole thing is ~an afternoon plus DNS propagation.

---

## Fast path: MCP-assisted (recommended)

Connect the Supabase + Vercel MCP servers to Claude Code and the assistant can
run the SQL, bootstrap the admin, set env vars, deploy, and smoke-test the live
paths for you. What only **you** can do: create the accounts/projects and
generate the tokens.

### Connect the MCP servers (you, once)

**Supabase** — get a Personal Access Token: Supabase dashboard → account menu →
**Access Tokens** → generate. Then, in this repo's folder:

```bash
# omit --read-only while the assistant applies the schema; add it back after
claude mcp add supabase -e SUPABASE_ACCESS_TOKEN=YOUR_PAT \
  -- npx -y @supabase/mcp-server-supabase@latest --project-ref=YOUR_PROJECT_REF
```

**Vercel** — hosted, uses OAuth (approve in the browser when prompted):

```bash
claude mcp add --transport http vercel https://mcp.vercel.com
```

Restart Claude Code so the new tools load, then tell the assistant "the MCPs are
connected." (Flags evolve — check each project's README if a command errors.)

### Who does what

| Step | You | Assistant (via MCP) |
|------|-----|---------------------|
| Create Supabase project (region, billing) | ✅ | |
| Run the 5 SQL files in order | | ✅ |
| Bootstrap the first admin | | ✅ (you give the email) |
| Create Vercel project + connect GitHub repo | ✅ | |
| Set env vars on Vercel | | ✅ (needs the keys below) |
| Trigger deploy + read logs to debug | | ✅ |
| Turnstile keys · Resend key + verify domain | ✅ | (no MCP) |
| Walk the live smoke-test checklist | | ✅ |

### Security notes

- The Supabase PAT can write to your projects — use it only for this setup, and
  **revoke it afterwards** (or scope it). It's a brand-new project with no real
  data yet, so the blast radius is nil.
- Treat MCP tool calls like any automation: review what the assistant proposes
  before confirming destructive actions. Supabase's own guidance is to prefer
  `--read-only` and project-scoping for day-to-day use.

---

## Manual path

If you'd rather click through it yourself, the full manual steps follow.

## 1. Supabase

1. Create a project at [supabase.com](https://supabase.com) (region: Singapore
   `ap-southeast-1` for Malaysia latency).
2. **SQL editor** → run the five files from `supabase/README.md` in order.
3. **Storage** → confirm the private `registration-docs` bucket exists (step 2
   creates it).
4. **Bootstrap the first admin** — see `supabase/README.md`.
5. Copy from **Settings → API**: Project URL, `anon` key, `service_role` key.

## 2. Cloudflare Turnstile

1. [dash.cloudflare.com](https://dash.cloudflare.com) → Turnstile → add a widget
   for your domain. Copy the **site key** and **secret key**.
2. Local dev without keys still works (the widget hides, the server skips
   verification) — only set these for staging/prod.

## 3. Resend (email)

1. [resend.com](https://resend.com) → add and **verify the sending domain**
   (`premium.edu.my`): add the DKIM/SPF DNS records they give you.
2. Create an API key. Set `EMAIL_FROM` to an address on that verified domain.
3. Until this is done, email silently no-ops (safe).

## 4. Vercel

1. Import the GitHub repo at [vercel.com](https://vercel.com) (framework auto-
   detected as Next.js).
2. **Environment variables** — set everything in `.env.example`:
   - `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`,
     `SUPABASE_SERVICE_ROLE_KEY`
   - `NEXT_PUBLIC_TURNSTILE_SITE_KEY`, `TURNSTILE_SECRET_KEY`
   - `RESEND_API_KEY`, `ADMIN_ALERT_EMAIL`, `EMAIL_FROM`
   - `NEXT_PUBLIC_APP_URL` = your production URL (e.g. `https://register.premium.edu.my`)
   - `NEXT_PUBLIC_PRIVACY_URL`, `CRON_SECRET` (any long random string)
3. Deploy. `vercel.json` already schedules the daily digest cron; Vercel injects
   `Authorization: Bearer $CRON_SECRET` automatically.
4. Add the custom domain + DNS.

## 5. Smoke test the live paths (do NOT skip)

Everything below ran only against mock data before — verify each against the
real DB and real logins:

- [ ] Public form submit → a `registrations` row appears; admin alert + applicant
      auto-reply arrive; uploaded files land in the private bucket.
- [ ] Lead drawer → **Create application** → `students` + `applications` rows;
      `access_code` populated; denormalised `student_name` shows in the board.
- [ ] Log in as each role → the console nav shows only that role's tabs and
      Finance/Visa/Users/Logs redirect if the role is wrong (RLS + `requireRole`).
- [ ] Agent login → sees only their own students; commission figures correct.
- [ ] `/status` → passport **or** email + the generated code shows the ring +
      timeline; a wrong code fails; 11 rapid tries return `429`.
- [ ] Generate an offer letter (PDF renders with embedded fonts); a
      `doc_downloaded` / `offer_generated` row appears in **/admin/logs**.
- [ ] Raise a cross-team request → the receiving team sees it; resolve it.

## 6. Known follow-ups (see docs/BACKLOG.md)

Access-code **delivery** to students (email the code on application creation),
durable rate-limit store, notification realtime, and the automation layer are
tracked in the backlog. None block go-live for internal use, but the first two
matter before the student portal is publicised.
