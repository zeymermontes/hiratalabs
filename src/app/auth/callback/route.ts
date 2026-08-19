import { NextResponse, type NextRequest } from "next/server";
import { isAllowedAdmin } from "@/lib/auth";
import { supabaseServer } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function back(origin: string, error: string) {
  const url = new URL("/login", origin);
  url.searchParams.set("error", error);
  return NextResponse.redirect(url);
}

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const next = url.searchParams.get("next") ?? "/";

  // Supabase reports its own failures (expired or already-used links) here.
  const supabaseError = url.searchParams.get("error_description") ?? url.searchParams.get("error");
  if (supabaseError) return back(url.origin, "link_invalid");
  if (!code) return back(url.origin, "missing_code");

  const sb = await supabaseServer();
  const { data, error } = await sb.auth.exchangeCodeForSession(code);

  if (error) {
    console.error(`[auth] code exchange failed: ${error.message}`);
    return back(url.origin, "exchange_failed");
  }
  if (!data.user?.email || !(await isAllowedAdmin(data.user.email))) {
    await sb.auth.signOut();
    return back(url.origin, "not_allowed");
  }

  return NextResponse.redirect(new URL(next, url.origin));
}
