import { NextResponse } from "next/server";
import { lookupStatus } from "@/lib/status";

export const runtime = "nodejs";

export async function POST(request: Request) {
  let body: { passport?: string; code?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }
  const status = await lookupStatus(body.passport ?? "", body.code ?? "");
  if (!status) {
    return NextResponse.json({ ok: false, error: "not_found" }, { status: 404 });
  }
  return NextResponse.json({ ok: true, status });
}
