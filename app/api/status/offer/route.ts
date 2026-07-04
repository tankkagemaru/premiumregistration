import { NextResponse } from "next/server";
import { verifyStatusApplication } from "@/lib/status";
import { supabaseConfigured } from "@/lib/env";

export const runtime = "nodejs";
const BUCKET = "registration-docs";

/**
 * Student-facing offer-letter endpoint. After re-verifying passport/email +
 * tracking code:
 *   action "sign" → short-lived signed download URL for the latest offer letter.
 *   action "ack"  → records the student's acknowledgement (first click wins).
 */
export async function POST(request: Request) {
  let body: { passport?: string; code?: string; action?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }
  if (!supabaseConfigured) return NextResponse.json({ ok: false }, { status: 400 });

  const appId = await verifyStatusApplication(body.passport ?? "", body.code ?? "");
  if (!appId) return NextResponse.json({ ok: false }, { status: 403 });

  const { createAdminClient } = await import("@/lib/supabase/admin");
  const admin = createAdminClient();

  if (body.action === "sign") {
    const { data: doc } = await admin
      .from("application_documents")
      .select("storage_path")
      .eq("application_id", appId)
      .eq("kind", "offer_letter")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (!doc?.storage_path) return NextResponse.json({ ok: false }, { status: 404 });
    const { data: signed, error } = await admin.storage
      .from(BUCKET)
      .createSignedUrl(doc.storage_path, 120);
    if (error || !signed) return NextResponse.json({ ok: false }, { status: 500 });
    return NextResponse.json({ ok: true, url: signed.signedUrl });
  }

  if (body.action === "ack") {
    const now = new Date().toISOString();
    // First acknowledgement wins; repeat clicks are no-ops.
    await admin
      .from("applications")
      .update({ offer_acknowledged_at: now })
      .eq("id", appId)
      .is("offer_acknowledged_at", null);
    await admin.from("application_events").insert({
      application_id: appId,
      type: "note",
      body: "Offer letter acknowledged by the student (status portal)",
    });
    return NextResponse.json({ ok: true, acknowledgedAt: now });
  }

  return NextResponse.json({ ok: false }, { status: 400 });
}
