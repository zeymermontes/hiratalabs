import { NextResponse, type NextRequest } from "next/server";
import { isAllowedAdmin } from "@/lib/auth";
import { supabaseServer } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const next = url.searchParams.get("next") ?? "/";

  if (!code) {
    return NextResponse.redirect(new URL("/login?error=missing_code", url.origin));
  }

  const sb = await supabaseServer();
  const { data, error } = await sb.auth.exchangeCodeForSession(code);

  if (error || !data.user?.email || !(await isAllowedAdmin(data.user.email))) {
    await sb.auth.signOut();
    return NextResponse.redirect(new URL("/login?error=not_allowed", url.origin));
  }

  return NextResponse.redirect(new URL(next, url.origin));
}
