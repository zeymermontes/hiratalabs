import { cache } from "react";
import { normalizeHost } from "@/lib/host";
import { resolveSiteByHost, type ResolvedSite } from "@/lib/sites";
import { resolveTheme, type ResolvedTheme } from "@/lib/theme";

export type StorefrontContext = ResolvedSite & { host: string; theme: ResolvedTheme };

/**
 * Contexto de una tienda para las páginas de /store/[host]. Se memoriza por
 * request (React cache) para que layout y página no resuelvan dos veces.
 * Devuelve null si el host no es una tienda: la página decide qué mostrar.
 */
export const getStorefront = cache(async (rawHost: string): Promise<StorefrontContext | null> => {
  const host = normalizeHost(decodeURIComponent(rawHost));
  const resolved = await resolveSiteByHost(host);
  if (!resolved || resolved.site.kind !== "store") return null;
  return { ...resolved, host, theme: resolveTheme(resolved.site.theme) };
});

/** Enlace interno del storefront (todo vive bajo el host del cliente). */
export function sfHref(path: string) {
  return path.startsWith("/") ? path : `/${path}`;
}

export function formatMXN(cents: number) {
  return new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN" }).format(cents / 100);
}
