import { NextResponse, type NextRequest } from "next/server";

/**
 * Host-based routing only. Keep this dependency-free: the proxy runs on the
 * edge runtime, so no database or Node APIs here — the tenant route does that.
 */
const ADMIN_HOST = (process.env.ADMIN_HOST ?? "").toLowerCase();
// Render's own hostname always reaches the panel, so it stays usable before the
// custom domain's DNS exists — and as a way back in if that DNS ever breaks.
const RENDER_HOST = (process.env.RENDER_EXTERNAL_HOSTNAME ?? "").toLowerCase();

function normalize(raw: string | null): string {
  if (!raw) return "";
  return raw
    .split(",")[0].trim().toLowerCase()
    .replace(/:\d+$/, "")
    .replace(/\.+$/, "")
    .replace(/:\d+$/, "");
}

export function proxy(req: NextRequest) {
  const host = normalize(req.headers.get("x-forwarded-host") ?? req.headers.get("host"));
  const { pathname, search } = req.nextUrl;

  // The apex and www serve the home landing, so the panel lives on its own hosts.
  const isAdmin =
    host === ADMIN_HOST ||
    (RENDER_HOST !== "" && host === RENDER_HOST) ||
    host === "localhost" ||
    host === "127.0.0.1";

  if (isAdmin) {
    // Never let the tenant renderer be reached directly from the admin host.
    if (pathname.startsWith("/srv/")) {
      return new NextResponse("Not found", { status: 404 });
    }
    return NextResponse.next();
  }

  // Tenant host from here on. Three paths must never be rewritten into a site:
  // the form endpoint (landings post to it on their own origin), Next's assets,
  // and the health check — Render probes it with the instance host, not ours.
  if (
    pathname.startsWith("/_next/") ||
    pathname.startsWith("/api/f/") ||
    pathname === "/api/health"
  ) {
    return NextResponse.next();
  }

  const url = req.nextUrl.clone();
  url.pathname = `/srv/${host}${pathname}`;
  url.search = search;

  const res = NextResponse.rewrite(url);
  res.headers.set("x-site-host", host);
  return res;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image).*)"],
};
