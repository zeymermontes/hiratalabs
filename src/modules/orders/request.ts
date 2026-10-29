import { headers } from "next/headers";
import type { NextRequest } from "next/server";
import { normalizeHost } from "@/lib/host";
import { getStorefront, type StorefrontContext } from "@/lib/storefront";

/**
 * Host de la tienda desde la que llegó la petición. El proxy pone x-site-host
 * en las páginas; en /api/store/* (que no se reescribe) queda el host de siempre.
 */
export function hostFromHeaders(h: Headers): string {
  return normalizeHost(h.get("x-site-host") ?? h.get("x-forwarded-host") ?? h.get("host"));
}

/** Contexto de la tienda en un route handler. null si el host no es tienda. */
export async function storeFromRequest(req: NextRequest): Promise<StorefrontContext | null> {
  const host = hostFromHeaders(req.headers);
  if (!host) return null;
  return getStorefront(host);
}

/** Contexto de la tienda dentro de un server action o server component. */
export async function storeFromHeaders(): Promise<StorefrontContext | null> {
  const h = await headers();
  const host = hostFromHeaders(h);
  if (!host) return null;
  return getStorefront(host);
}

/** URL absoluta de una ruta en la tienda (correos, redirecciones de Supabase, Mercado Pago). */
export function storeUrl(host: string, path: string): string {
  const proto = host === "localhost" || host.endsWith(".localhost") || host === "127.0.0.1" ? "http" : "https";
  const port = proto === "http" ? `:${process.env.PORT ?? "3000"}` : "";
  return `${proto}://${host}${port}${path.startsWith("/") ? path : `/${path}`}`;
}

export function clientIp(req: NextRequest): string {
  const fwd = req.headers.get("x-forwarded-for");
  return (fwd ? fwd.split(",")[0] : req.headers.get("x-real-ip") ?? "").trim() || "unknown";
}
