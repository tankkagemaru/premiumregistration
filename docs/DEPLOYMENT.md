# Deployment (P0 go-live)

End-to-end steps to take the platform from "runs on mock data" to live. Roughly
in order; the whole thing is ~an afternoon plus DNS propagation.

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
