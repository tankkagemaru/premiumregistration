import { NextResponse } from "next/server";
import path from "node:path";
import { renderToBuffer } from "@react-pdf/renderer";
import { getApplication } from "@/lib/admin/applications";
import { getProfile } from "@/lib/auth";
import { EnglishOfferLetter, type OfferData } from "@/lib/pdf/EnglishOfferLetter";
import { INTAKE_PREFERENCES } from "@/lib/config/universities";
import { FEE_TYPE_LABEL, type Fee, type FeeType } from "@/lib/admin/finance-shared";

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
  const { app, contact } = record;

  const now = new Date();
  const valid = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

  // Fees for the schedule table — service role (fees are finance-scoped under
  // RLS); registration first, then tuition, then the rest, skipping any TBD/0.
  const { createAdminClient } = await import("@/lib/supabase/admin");
  const adminRead = createAdminClient();
  const { data: feeRows } = await adminRead
    .from("fees")
    .select("type, label, amount, currency, status")
    .eq("application_id", app.id);
  const ORDER: Record<string, number> = { registration: 0, application: 1, tuition: 2 };
  const fees = ((feeRows as Pick<Fee, "type" | "label" | "amount" | "currency" | "status">[] | null) ?? [])
    .filter((f) => Number(f.amount) > 0 && f.status !== "waived")
    .sort((a, b) => (ORDER[a.type] ?? 9) - (ORDER[b.type] ?? 9))
    .map((f) => ({
      label: f.label || FEE_TYPE_LABEL[f.type as FeeType] || "Fee",
      amount: Number(f.amount),
      currency: f.currency || "MYR",
    }));

  const fmtDay = (d?: string | null) =>
    d ? fmt(new Date(`${d}T00:00:00`)) : undefined;

  const data: OfferData = {
    ref: `PLC-${app.id.slice(0, 8).toUpperCase()}`,
    date: fmt(now),
    studentName: app.student_name,
    passportNo: (app as { passport_no?: string | null }).passport_no ?? undefined,
    nationality: contact?.nationality ?? undefined,
    program: app.program_name ?? "General English Programme",
    level: app.qualification_level ?? undefined,
    intake:
      INTAKE_PREFERENCES.find((i) => i.value === app.intake)?.label ??
      app.intake ??
      undefined,
    classStart: fmtDay(app.class_start),
    classEnd: fmtDay(app.class_end),
    validUntil: fmt(valid),
    isInternational: app.is_international,
    fees,
    logoSrc: path.join(process.cwd(), "public", "pecsb-logo.png"),
  };

  // Track the offer's reply-by deadline so an expiring offer can be surfaced.
  await adminRead
    .from("applications")
    .update({ offer_expires_at: valid.toISOString().slice(0, 10) })
    .eq("id", app.id);

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
