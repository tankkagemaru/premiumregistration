import { NextResponse } from "next/server";
import { z } from "zod";
import { randomUUID } from "node:crypto";
import { registrationSchema } from "@/lib/schema";
import { documentMetaSchema, type UploadTarget } from "@/lib/registration";
import {
  serverEnv,
  supabaseConfigured,
  turnstileConfigured,
} from "@/lib/env";

export const runtime = "nodejs";

const BUCKET = "registration-docs";

const requestSchema = z.object({
  values: registrationSchema,
  turnstileToken: z.string().optional(),
  documents: z.array(documentMetaSchema).max(12).optional(),
  attribution: z
    .object({
      utm_source: z.string().optional(),
      utm_medium: z.string().optional(),
      utm_campaign: z.string().optional(),
      referrer: z.string().optional(),
      agent_code: z.string().optional(),
    })
    .optional(),
});

async function verifyTurnstile(token: string | undefined, ip: string | null) {
  if (!turnstileConfigured) return true; // dev: verification skipped
  const res = await fetch(
    "https://challenges.cloudflare.com/turnstile/v0/siteverify",
    {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        secret: serverEnv.turnstileSecret!,
        response: token ?? "",
        ...(ip ? { remoteip: ip } : {}),
      }),
    },
  );
  const data = (await res.json()) as { success?: boolean };
  return Boolean(data.success);
}

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "invalid_json" }, { status: 400 });
  }

  const parsed = requestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: "validation", issues: parsed.error.flatten() },
      { status: 400 },
    );
  }
  const { values, turnstileToken, documents = [], attribution } = parsed.data;

  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null;
  if (!(await verifyTurnstile(turnstileToken, ip))) {
    return NextResponse.json({ ok: false, error: "turnstile" }, { status: 400 });
  }

  // Build the track-keyed details payload (only for selected tracks).
  const details: Record<string, unknown> = {};
  if (values.tracks.includes("english")) details.english = values.english ?? {};
  if (values.tracks.includes("university"))
    details.university = values.university ?? {};
  if (values.tracks.includes("corporate"))
    details.corporate = values.corporate ?? {};

  // Dev fallback: no Supabase configured → log and confirm the client flow.
  if (!supabaseConfigured) {
    console.log("[register] dry-run (Supabase not configured):", {
      tracks: values.tracks,
      email: values.email,
      documents: documents.map((d) => d.filename),
    });
    return NextResponse.json({ ok: true, id: "dry-run", uploads: [], dryRun: true });
  }

  const { createAdminClient } = await import("@/lib/supabase/admin");
  const admin = createAdminClient();

  const { data: row, error: insertError } = await admin
    .from("registrations")
    .insert({
      tracks: values.tracks,
      full_name: values.full_name,
      email: values.email,
      phone: values.phone,
      whatsapp: values.whatsapp || null,
      nationality: values.nationality,
      utm_source: attribution?.utm_source ?? null,
      utm_medium: attribution?.utm_medium ?? null,
      utm_campaign: attribution?.utm_campaign ?? null,
      referrer: attribution?.referrer ?? null,
      agent_code: attribution?.agent_code ?? null,
      details,
    })
    .select("id")
    .single();

  if (insertError || !row) {
    console.error("[register] insert failed:", insertError);
    return NextResponse.json({ ok: false, error: "insert" }, { status: 500 });
  }

  // Mint a scoped signed upload URL per document, and record the doc rows.
  const uploads: UploadTarget[] = [];
  for (const doc of documents) {
    const safeName = doc.filename.replace(/[^\w.\-]/g, "_");
    const path = `${row.id}/${doc.kind}/${randomUUID()}-${safeName}`;
    const { data: signed, error: signErr } = await admin.storage
      .from(BUCKET)
      .createSignedUploadUrl(path);
    if (signErr || !signed) {
      console.error("[register] signed url failed:", signErr);
      continue;
    }
    await admin.from("registration_documents").insert({
      registration_id: row.id,
      kind: doc.kind,
      storage_path: path,
    });
    uploads.push({ kind: doc.kind, path, token: signed.token });
  }

  return NextResponse.json({ ok: true, id: row.id, uploads });
}
