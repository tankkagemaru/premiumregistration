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

  // ?dl=1 forces a download — a signed URL with the download flag is enough.
  const asDownload = new URL(req.url).searchParams.get("dl") === "1";
  if (asDownload) {
    const { data: signed } = await admin.storage
      .from(BUCKET)
      .createSignedUrl(doc.storage_path, 60, { download: true });
    if (!signed) return NextResponse.json({ error: "sign_failed" }, { status: 500 });
    await logAudit({ action: "doc_downloaded", target_type: "document", target_id: id, detail: doc.storage_path });
    return NextResponse.redirect(signed.signedUrl);
  }

  // Inline preview: proxy the bytes ourselves with an explicit inline disposition
  // and a content-type derived from the file extension. Uploads went through
  // uploadToSignedUrl without a contentType, so many objects are stored as
  // application/octet-stream — redirecting to the signed URL made the browser
  // DOWNLOAD the file (blank <iframe> in the viewer float window) instead of
  // rendering it. Serving the bytes with the right headers fixes the preview.
  const { data: blob, error } = await admin.storage.from(BUCKET).download(doc.storage_path);
  if (error || !blob) return NextResponse.json({ error: "not_found" }, { status: 404 });

  const ext = (doc.storage_path.split(".").pop() ?? "").toLowerCase();
  const byExt: Record<string, string> = {
    pdf: "application/pdf",
    png: "image/png",
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
    webp: "image/webp",
    gif: "image/gif",
    heic: "image/heic",
  };
  const stored = blob.type && blob.type !== "application/octet-stream" ? blob.type : "";
  const contentType = byExt[ext] || stored || "application/octet-stream";

  await logAudit({ action: "doc_viewed", target_type: "document", target_id: id, detail: doc.storage_path });
  return new NextResponse(await blob.arrayBuffer(), {
    headers: {
      "content-type": contentType,
      "content-disposition": "inline",
      "cache-control": "private, max-age=60",
    },
  });
}
