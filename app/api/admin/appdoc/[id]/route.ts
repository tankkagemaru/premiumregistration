import { NextResponse } from "next/server";
import { getProfile } from "@/lib/auth";
import { authConfigured } from "@/lib/admin/leads-shared";
import { logAudit } from "@/lib/admin/audit";

export const runtime = "nodejs";

const BUCKET = "registration-docs";
// boss: read-only document view from the exec student popout (audited like all).
// marketing: opens invoices to send to students / agents.
const VIEW_ROLES = ["admin", "boss", "admissions", "visa", "finance", "counsellor", "academic", "staff", "marketing"];

/** Redirect a permitted staff user to a short-lived signed URL for an
 *  application document. Role checked in code; the signed URL is minted with the
 *  service role so it isn't blocked by storage RLS. Every view is audited. */
export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!authConfigured) return NextResponse.json({ error: "not_configured" }, { status: 404 });
  const profile = await getProfile();
  if (!profile || !VIEW_ROLES.includes(profile.role)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const { createAdminClient } = await import("@/lib/supabase/admin");
  const admin = createAdminClient();
  const { data: doc } = await admin
    .from("application_documents")
    .select("storage_path")
    .eq("id", id)
    .maybeSingle();
  if (!doc?.storage_path) return NextResponse.json({ error: "not_found" }, { status: 404 });

  // Default opens the file inline (new tab); ?dl=1 forces a download.
  const asDownload = new URL(req.url).searchParams.get("dl") === "1";
  const { data: signed } = await admin.storage
    .from(BUCKET)
    .createSignedUrl(doc.storage_path, 60, asDownload ? { download: true } : undefined);
  if (!signed) return NextResponse.json({ error: "sign_failed" }, { status: 500 });

  await logAudit({
    action: asDownload ? "doc_downloaded" : "doc_viewed",
    target_type: "document",
    target_id: id,
    detail: doc.storage_path,
  });
  return NextResponse.redirect(signed.signedUrl);
}
