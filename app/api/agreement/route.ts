import { NextResponse } from "next/server";
import path from "node:path";
import { renderToBuffer } from "@react-pdf/renderer";
import { getProfile } from "@/lib/auth";
import { authConfigured } from "@/lib/admin/applications-shared";
import { AgentAgreementPdf } from "@/lib/pdf/AgentAgreementPdf";
import type { AgentAgreement } from "@/lib/admin/agreements-shared";

export const runtime = "nodejs";

/**
 * Render the recruitment agreement as a PDF. Finance/admin can open any
 * agreement; an agent can open their own (once it has left draft). The agent
 * downloads this to wet-sign when they prefer paper over the typed signature.
 */
export async function GET(request: Request) {
  if (!authConfigured) return NextResponse.json({ error: "not_configured" }, { status: 404 });
  const profile = await getProfile();
  if (!profile) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const id = new URL(request.url).searchParams.get("id");
  if (!id) return NextResponse.json({ error: "missing_id" }, { status: 400 });

  const { createAdminClient } = await import("@/lib/supabase/admin");
  const admin = createAdminClient();
  const { data } = await admin.from("agent_agreements").select("*").eq("id", id).maybeSingle();
  const agr = data as AgentAgreement | null;
  if (!agr) return NextResponse.json({ error: "not_found" }, { status: 404 });

  const isFinance = ["admin", "finance"].includes(profile.role);
  const isOwner = profile.role === "agent" && agr.agent_id === profile.id && agr.status !== "draft";
  if (!isFinance && !isOwner) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const buffer = await renderToBuffer(
    AgentAgreementPdf({
      data: { agreement: agr, logoSrc: path.join(process.cwd(), "public", "pecsb-logo.png") },
    }),
  );

  const { logAudit } = await import("@/lib/admin/audit");
  await logAudit({ action: "agreement_pdf_generated", target_type: "agreement", target_id: id });

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "content-type": "application/pdf",
      "content-disposition": `inline; filename="PECSB-Agreement-${id.slice(0, 8)}.pdf"`,
      "cache-control": "private, no-store",
    },
  });
}
