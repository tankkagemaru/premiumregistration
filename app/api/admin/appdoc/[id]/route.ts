import { NextResponse } from "next/server";
import { getProfile } from "@/lib/auth";
import { authConfigured } from "@/lib/admin/leads-shared";
import { logAudit } from "@/lib/admin/audit";

export const runtime = "nodejs";

const BUCKET = "registration-docs";
const VIEW_ROLES = ["admin", "admissions", "visa", "finance", "counsellor", "academic", "staff"];

/** Redirect a permitted staff user to a short-lived signed URL for an
 *  application document. Role checked in code; the signed URL is minted with the
 *  service role so it isn't blocked by storage RLS. Every view is audited. */
export async function GET(
  _req: Request,
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

  const { data: signed } = await admin.storage.from(BUCKET).createSignedUrl(doc.storage_path, 60);
  if (!signed) return NextResponse.json({ error: "sign_failed" }, { status: 500 });

  await logAudit({ action: "doc_downloaded", target_type: "document", target_id: id, detail: doc.storage_path });
  return NextResponse.redirect(signed.signedUrl);
}
