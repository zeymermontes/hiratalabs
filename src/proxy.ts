import { NextResponse, type NextRequest } from "next/server";

/**
 * Host-based routing only. Keep this dependency-free: the proxy runs on the
 * edge runtime, so no database or Node APIs here — the tenant routes do that.
 *
 * Una landing se sirve desde /srv/<host> (archivos estáticos del ZIP). Una
 * tienda se renderiza en /store/<host> (páginas de Next). Para saber cuál es
 * cada host sin tocar la base desde aquí, se consulta /api/kind/<host> una vez
 * y se recuerda un rato en memoria.
 */
const ADMIN_HOST = (process.env.ADMIN_HOST ?? "").toLowerCase();
// Panel de los dueños: mismo app, otro host. Quién entra a cuál lo decide auth.ts.
const APP_HOST = (process.env.APP_HOST ?? "").toLowerCase();
// Render's own hostname always reaches the panel, so it stays usable before the
// custom domain's DNS exists — and as a way back in if that DNS ever breaks.
const RENDER_HOST = (process.env.RENDER_EXTERNAL_HOSTNAME ?? "").toLowerCase();

type Kind = "landing" | "store";
const KIND_CACHE = new Map<string, { kind: Kind; expires: number }>();
const KIND_TTL_MS = 30_000;

function normalize(raw: string | null): string {
  if (!raw) return "";
  return raw
    .split(",")[0].trim().toLowerCase()
    .replace(/:\d+$/, "")
    .replace(/\.+$/, "")
    .replace(/:\d+$/, "");
}

async function kindFor(req: NextRequest, host: string): Promise<Kind> {
  const hit = KIND_CACHE.get(host);
  if (hit && hit.expires > Date.now()) return hit.kind;

  let kind: Kind = "landing";
  try {
    const url = req.nextUrl.clone();
    url.pathname = `/api/kind/${host}`;
    url.search = "";
    const res = await fetch(url, { headers: { host }, cache: "no-store" });
    if (res.ok) {
      const data = (await res.json()) as { kind?: string };
      if (data.kind === "store") kind = "store";
    }
  } catch {
    // Si la consulta falla, se trata como landing: es el camino de siempre.
  }
  KIND_CACHE.set(host, { kind, expires: Date.now() + KIND_TTL_MS });
  return kind;
}

export async function proxy(req: NextRequest) {
  const host = normalize(req.headers.get("x-forwarded-host") ?? req.headers.get("host"));
  const { pathname, search } = req.nextUrl;

  // The apex and www serve the home landing, so the panel lives on its own hosts.
  const isAdmin =
    host === ADMIN_HOST ||
    (APP_HOST !== "" && host === APP_HOST) ||
    (RENDER_HOST !== "" && host === RENDER_HOST) ||
    host === "localhost" ||
    host === "127.0.0.1";

  if (isAdmin) {
    // Never let the tenant renderers be reached directly from the admin host.
    if (pathname.startsWith("/srv/") || pathname.startsWith("/store/")) {
      return new NextResponse("Not found", { status: 404 });
    }
    return NextResponse.next();
  }

  // Tenant host from here on. These paths must never be rewritten into a site:
  // the form endpoints (landings post to them on their own origin), the store
  // API, Next's assets, the kind lookup, and the health check — Render probes
  // it with the instance host, not ours.
  if (
    pathname.startsWith("/_next/") ||
    pathname.startsWith("/api/f/") ||
    pathname.startsWith("/api/store/") ||
    pathname.startsWith("/api/kind/") ||
    pathname === "/api/health"
  ) {
    return NextResponse.next();
  }

  const kind = await kindFor(req, host);
  const url = req.nextUrl.clone();
  url.pathname = `/${kind === "store" ? "store" : "srv"}/${host}${pathname}`;
  url.search = search;

  const res = NextResponse.rewrite(url);
  res.headers.set("x-site-host", host);
  return res;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image).*)"],
};
