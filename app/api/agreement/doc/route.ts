import { NextResponse } from "next/server";
import { getProfile } from "@/lib/auth";
import { authConfigured } from "@/lib/admin/applications-shared";
import { logAudit } from "@/lib/admin/audit";
import type { AgentAgreement } from "@/lib/admin/agreements-shared";

export const runtime = "nodejs";

const BUCKET = "registration-docs";

/** Serve the uploaded wet-signed / stamped copy of an agreement (inline).
 *  Finance/admin any; agent their own. */
export async function GET(request: Request) {
  if (!authConfigured) return NextResponse.json({ error: "not_configured" }, { status: 404 });
  const profile = await getProfile();
  if (!profile) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const id = new URL(request.url).searchParams.get("id");
  if (!id) return NextResponse.json({ error: "missing_id" }, { status: 400 });

  const { createAdminClient } = await import("@/lib/supabase/admin");
  const admin = createAdminClient();
  const { data } = await admin
    .from("agent_agreements")
    .select("agent_id, status, signed_doc_path")
    .eq("id", id)
    .maybeSingle();
  const agr = data as Pick<AgentAgreement, "agent_id" | "status" | "signed_doc_path"> | null;
  if (!agr?.signed_doc_path) return NextResponse.json({ error: "not_found" }, { status: 404 });

  const isFinance = ["admin", "finance"].includes(profile.role);
  const isOwner = profile.role === "agent" && agr.agent_id === profile.id && agr.status !== "draft";
  if (!isFinance && !isOwner) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const { data: blob, error } = await admin.storage.from(BUCKET).download(agr.signed_doc_path);
  if (error || !blob) return NextResponse.json({ error: "not_found" }, { status: 404 });

  const ext = (agr.signed_doc_path.split(".").pop() ?? "").toLowerCase();
  const byExt: Record<string, string> = {
    pdf: "application/pdf",
    png: "image/png",
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
  };
  await logAudit({ action: "agreement_doc_viewed", target_type: "agreement", target_id: id });
  return new NextResponse(await blob.arrayBuffer(), {
    headers: {
      "content-type": byExt[ext] || "application/octet-stream",
      "content-disposition": "inline",
      "cache-control": "private, max-age=60",
    },
  });
}
