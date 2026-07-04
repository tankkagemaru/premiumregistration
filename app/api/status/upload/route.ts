import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { verifyStatusApplication } from "@/lib/status";
import { supabaseConfigured } from "@/lib/env";

export const runtime = "nodejs";
const BUCKET = "registration-docs";

/**
 * Student self-upload from the status portal. Every call re-verifies the
 * passport/email + access code (the student's credentials) and, on confirm,
 * checks the storage path belongs to that application — so a student can only
 * add documents to their own record. Two actions:
 *   sign    → returns a short-lived signed upload URL (client PUTs the file)
 *   confirm → records the application_documents row (review_status pending)
 */
export async function POST(request: Request) {
  let body: {
    passport?: string;
    code?: string;
    action?: string;
    kind?: string;
    filename?: string;
    path?: string;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  const appId = await verifyStatusApplication(body.passport ?? "", body.code ?? "");
  if (!appId) return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 });
  if (!supabaseConfigured)
    return NextResponse.json({ ok: true, path: "", token: "", dryRun: true });

  const kind = (body.kind ?? "other").replace(/[^\w]/g, "").slice(0, 40) || "other";
  const { createAdminClient } = await import("@/lib/supabase/admin");
  const admin = createAdminClient();

  if (body.action === "sign") {
    const safe = (body.filename ?? "file").replace(/[^\w.\-]/g, "_");
    const path = `applications/${appId}/${kind}/${randomUUID()}-${safe}`;
    const { data, error } = await admin.storage.from(BUCKET).createSignedUploadUrl(path);
    if (error || !data)
      return NextResponse.json({ ok: false, error: "sign_failed" }, { status: 500 });
    return NextResponse.json({ ok: true, path, token: data.token });
  }

  if (body.action === "confirm") {
    const path = body.path ?? "";
    if (!path.startsWith(`applications/${appId}/`))
      return NextResponse.json({ ok: false, error: "bad_path" }, { status: 400 });
    await admin.from("application_documents").insert({
      application_id: appId,
      kind,
      storage_path: path,
      review_status: "pending",
    });
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ ok: false, error: "bad_action" }, { status: 400 });
}
