import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getProfile } from "@/lib/auth";
import { authConfigured } from "@/lib/admin/leads-shared";
import { logAudit } from "@/lib/admin/audit";

export const runtime = "nodejs";

const BUCKET = "registration-docs";

/** Redirects an authenticated admin/staff user to a short-lived signed URL for
 *  the requested document. RLS + the profile check gate access. */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!authConfigured) {
    return NextResponse.json({ error: "not_configured" }, { status: 404 });
  }
  const profile = await getProfile();
  if (!profile || !["admin", "staff"].includes(profile.role)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const supabase = await createClient();
  const { data: doc } = await supabase
    .from("registration_documents")
    .select("storage_path")
    .eq("id", id)
    .single();
  if (!doc) return NextResponse.json({ error: "not_found" }, { status: 404 });

  const { data: signed } = await supabase.storage
    .from(BUCKET)
    .createSignedUrl(doc.storage_path, 60);
  if (!signed) return NextResponse.json({ error: "sign_failed" }, { status: 500 });

  // PII access trail — every passport/transcript view is recorded.
  await logAudit({
    action: "doc_downloaded",
    target_type: "document",
    target_id: id,
    detail: doc.storage_path,
  });

  return NextResponse.redirect(signed.signedUrl);
}
