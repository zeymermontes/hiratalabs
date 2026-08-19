import { NextResponse, type NextRequest } from "next/server";
import { isAllowedAdmin } from "@/lib/auth";
import { supabaseServer } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Relative Location headers only. Behind Render's proxy `req.url` is the
 * internal http://localhost:10000, so building an absolute redirect from it
 * sends people to a host that only exists inside the container.
 */
function redirectTo(path: string) {
  return new NextResponse(null, { status: 303, headers: { Location: path } });
}

function back(error: string) {
  return redirectTo(`/login?error=${encodeURIComponent(error)}`);
}

/** Never bounce to another origin on the strength of a query parameter. */
function safeNext(raw: string | null): string {
  if (!raw || !raw.startsWith("/") || raw.startsWith("//")) return "/";
  return raw;
}

export async function GET(req: NextRequest) {
  const params = req.nextUrl.searchParams;
  const code = params.get("code");
  const next = safeNext(params.get("next"));

  // Supabase reports its own failures (expired or already-used links) here.
  if (params.get("error_description") ?? params.get("error")) return back("link_invalid");
  if (!code) return back("missing_code");

  const sb = await supabaseServer();
  const { data, error } = await sb.auth.exchangeCodeForSession(code);

  if (error) {
    console.error(`[auth] code exchange failed: ${error.message}`);
    return back("exchange_failed");
  }
  if (!data.user?.email || !(await isAllowedAdmin(data.user.email))) {
    await sb.auth.signOut();
    return back("not_allowed");
  }

  return redirectTo(next);
}
