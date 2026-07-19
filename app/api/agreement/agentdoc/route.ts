import { NextResponse } from "next/server";
import { getProfile } from "@/lib/auth";
import { authConfigured } from "@/lib/admin/applications-shared";
import { logAudit } from "@/lib/admin/audit";
import type { AgentDocument } from "@/lib/admin/agreements-shared";

export const runtime = "nodejs";

const BUCKET = "registration-docs";

/** Serve an agent due-diligence document (passport / business registration…)
 *  inline. Finance/admin any; an agent their own. Every view is audited —
 *  these are identity documents. */
export async function GET(request: Request) {
  if (!authConfigured) return NextResponse.json({ error: "not_configured" }, { status: 404 });
  const profile = await getProfile();
  if (!profile) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const id = new URL(request.url).searchParams.get("id");
  if (!id) return NextResponse.json({ error: "missing_id" }, { status: 400 });

  const { createAdminClient } = await import("@/lib/supabase/admin");
  const admin = createAdminClient();
  const { data } = await admin.from("agent_documents").select("*").eq("id", id).maybeSingle();
  const doc = data as AgentDocument | null;
  if (!doc) return NextResponse.json({ error: "not_found" }, { status: 404 });

  const isFinance = ["admin", "finance"].includes(profile.role);
  const isOwner = profile.role === "agent" && doc.agent_id === profile.id;
  if (!isFinance && !isOwner) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const { data: blob, error } = await admin.storage.from(BUCKET).download(doc.storage_path);
  if (error || !blob) return NextResponse.json({ error: "not_found" }, { status: 404 });

  const ext = (doc.storage_path.split(".").pop() ?? "").toLowerCase();
  const byExt: Record<string, string> = {
    pdf: "application/pdf",
    png: "image/png",
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
    webp: "image/webp",
  };
  await logAudit({ action: "agent_doc_viewed", target_type: "agent_document", target_id: id, detail: doc.kind });
  return new NextResponse(await blob.arrayBuffer(), {
    headers: {
      "content-type": byExt[ext] || "application/octet-stream",
      "content-disposition": "inline",
      "cache-control": "private, max-age=60",
    },
  });
}
