import { NextResponse } from "next/server";
import { lookupStatus } from "@/lib/status";

export const runtime = "nodejs";

/**
 * Per-IP throttle: 10 lookups/minute. In-memory (per serverless instance) —
 * enough to stop casual passport+code enumeration; swap for a durable store
 * (Upstash/Redis) if abuse appears in production.
 */
const WINDOW_MS = 60_000;
const MAX_HITS = 10;
const hits = new Map<string, { n: number; t: number }>();

function throttled(ip: string): boolean {
  const now = Date.now();
  const entry = hits.get(ip);
  if (!entry || now - entry.t > WINDOW_MS) {
    hits.set(ip, { n: 1, t: now });
    return false;
  }
  entry.n += 1;
  if (hits.size > 5000) hits.clear(); // memory guard
  return entry.n > MAX_HITS;
}

export async function POST(request: Request) {
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  if (throttled(ip)) {
    return NextResponse.json({ ok: false, error: "rate_limited" }, { status: 429 });
  }
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
