import { NextResponse, type NextRequest } from "next/server";
import { siteKindForHost } from "@/lib/site-kind";

/**
 * Ruteo por host. En Next 16 el proxy corre en Node.js.
 *
 * Una landing se sirve desde /srv/<host> (archivos estáticos del ZIP). Una
 * tienda se renderiza en /store/<host> (páginas de Next). Para saber cuál es
 * cada host se consulta la base (solo la columna kind) y se recuerda un rato
 * en memoria. Si la consulta falla, el host se trata como landing.
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

/** Supabase guarda la sesión en cookies sb-<proyecto>-auth-token (a veces partida en .0, .1…). */
function hasSessionCookie(req: NextRequest): boolean {
  return req.cookies.getAll().some((c) => /^sb-.+-auth-token(\.\d+)?$/.test(c.name) && c.value.length > 0);
}

async function kindFor(host: string): Promise<Kind> {
  const hit = KIND_CACHE.get(host);
  if (hit && hit.expires > Date.now()) return hit.kind;

  let kind: Kind = "landing";
  try {
    if ((await siteKindForHost(host)) === "store") kind = "store";
  } catch (e) {
    // Si la consulta falla, se trata como landing: es el camino de siempre.
    console.error(`[proxy] no se pudo saber el tipo de ${host}: ${(e as Error).message}`);
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
    // En el host de dueños, quien llega sin sesión ve la landing del producto
    // (la URL sigue siendo "/"); con sesión entra directo a su panel.
    if (APP_HOST !== "" && host === APP_HOST && pathname === "/" && !hasSessionCookie(req)) {
      const url = req.nextUrl.clone();
      url.pathname = "/inicio";
      return NextResponse.rewrite(url);
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

  const kind = await kindFor(host);
  const url = req.nextUrl.clone();
  url.pathname = `/${kind === "store" ? "store" : "srv"}/${host}${pathname}`;
  url.search = search;

  // Vista previa del editor: el token de la URL llega a las páginas como
  // encabezado (los layouts no leen searchParams). La firma se verifica allá.
  const requestHeaders = new Headers(req.headers);
  requestHeaders.delete("x-sf-preview");
  const previewToken = kind === "store" ? req.nextUrl.searchParams.get("__preview") : null;
  if (previewToken) requestHeaders.set("x-sf-preview", previewToken.slice(0, 200));

  const res = NextResponse.rewrite(url, { request: { headers: requestHeaders } });
  res.headers.set("x-site-host", host);
  if (previewToken) res.headers.set("Cache-Control", "no-store");
  return res;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image).*)"],
};
