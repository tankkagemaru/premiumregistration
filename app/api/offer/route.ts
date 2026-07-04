import { NextResponse } from "next/server";
import path from "node:path";
import { renderToBuffer } from "@react-pdf/renderer";
import { getApplication } from "@/lib/admin/applications";
import { getProfile } from "@/lib/auth";
import { EnglishOfferLetter, type OfferData } from "@/lib/pdf/EnglishOfferLetter";
import { INTAKE_PREFERENCES } from "@/lib/config/universities";

export const runtime = "nodejs";

function fmt(d: Date) {
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(d);
}

export async function GET(request: Request) {
  const profile = await getProfile();
  if (!profile || !["admin", "admissions"].includes(profile.role)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const id = new URL(request.url).searchParams.get("app");
  if (!id) return NextResponse.json({ error: "missing_app" }, { status: 400 });

  const record = await getApplication(id);
  if (!record) return NextResponse.json({ error: "not_found" }, { status: 404 });
  const { app } = record;

  const now = new Date();
  const valid = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

  const data: OfferData = {
    ref: `PLC-${app.id.slice(0, 8).toUpperCase()}`,
    date: fmt(now),
    studentName: app.student_name,
    program: app.program_name ?? "General English",
    intake:
      INTAKE_PREFERENCES.find((i) => i.value === app.intake)?.label ??
      app.intake ??
      undefined,
    validUntil: fmt(valid),
    isInternational: app.is_international,
    logoSrc: path.join(process.cwd(), "public", "pecsb-logo.png"),
  };

  const { logAudit } = await import("@/lib/admin/audit");
  await logAudit({
    action: "offer_generated",
    target_type: "application",
    target_id: app.id,
    detail: `${data.program} — ${app.student_name}`,
  });

  const buffer = await renderToBuffer(EnglishOfferLetter({ data }));

  // Auto-attach the generated letter as an offer_letter document, so the
  // student can download + acknowledge it on the status portal (same flow as
  // university offers). Best-effort — a storage hiccup must not block the PDF.
  try {
    const { randomUUID } = await import("node:crypto");
    const { createAdminClient } = await import("@/lib/supabase/admin");
    const admin = createAdminClient();
    const path = `applications/${app.id}/offer_letter/${randomUUID()}-offer-${data.ref}.pdf`;
    const { error: upErr } = await admin.storage
      .from("registration-docs")
      .upload(path, new Uint8Array(buffer), { contentType: "application/pdf" });
    if (!upErr) {
      await admin.from("application_documents").insert({
        application_id: app.id,
        kind: "offer_letter",
        storage_path: path,
        review_status: "verified", // we issued it ourselves
      });
    }
  } catch (err) {
    console.error("[offer] attach failed:", err);
  }

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "content-type": "application/pdf",
      "content-disposition": `inline; filename="offer-${data.ref}.pdf"`,
    },
  });
}
