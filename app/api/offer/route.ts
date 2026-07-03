import { NextResponse } from "next/server";
import path from "node:path";
import { renderToBuffer } from "@react-pdf/renderer";
import { getApplication } from "@/lib/admin/applications";
import { getProfile } from "@/lib/auth";
import { EnglishOfferLetter, type OfferData } from "@/lib/pdf/EnglishOfferLetter";
import { INTAKE_PREFERENCES } from "@/lib/config/universities";

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
  const { app } = record;

  const now = new Date();
  const valid = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

  const data: OfferData = {
    ref: `PLC-${app.id.slice(0, 8).toUpperCase()}`,
    date: fmt(now),
    studentName: app.student_name,
    program: app.program_name ?? "General English",
    intake:
      INTAKE_PREFERENCES.find((i) => i.value === app.intake)?.label ??
      app.intake ??
      undefined,
    validUntil: fmt(valid),
    logoSrc: path.join(process.cwd(), "public", "pecsb-logo.png"),
  };

  const buffer = await renderToBuffer(EnglishOfferLetter({ data }));

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "content-type": "application/pdf",
      "content-disposition": `inline; filename="offer-${data.ref}.pdf"`,
    },
  });
}
