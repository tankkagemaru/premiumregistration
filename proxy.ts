import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

const authConfigured = Boolean(
  process.env.NEXT_PUBLIC_SUPABASE_URL &&
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
);

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Dev: no Supabase configured → allow the admin console through with the
  // mock data + bypass profile (see lib/auth.ts).
  if (!authConfigured) return NextResponse.next();

  const { response, user } = await updateSession(request);

  if (pathname === "/admin/login") return response;

  if (!user) {
    const url = request.nextUrl.clone();
    url.pathname = "/admin/login";
    return NextResponse.redirect(url);
  }
  return response;
}

export const config = { matcher: ["/admin/:path*", "/agent/:path*"] };
