import { headers } from "next/headers";
import { cache } from "react";
import { normalizeHost } from "@/lib/host";
import { resolveSiteByHost, type ResolvedSite } from "@/lib/sites";
import { resolveTheme, type ResolvedTheme } from "@/lib/theme";
import { PREVIEW_HEADER, verifyPreview } from "@/themes/preview";
import { resolveDoc, type ResolvedDoc } from "@/themes/resolve";
import { getDraftDoc, getPublishedDoc } from "@/themes/versions";

export type StorefrontContext = ResolvedSite & {
  host: string;
  /** Compatibilidad: colores y fuentes planos (correos, piezas viejas). */
  theme: ResolvedTheme;
  /** Tema completo: ajustes globales, esquemas y secciones por página. */
  design: ResolvedDoc;
  /** true cuando se está viendo el borrador desde el editor. */
  preview: boolean;
};

/**
 * Contexto de una tienda para las páginas de /store/[host]. Se memoriza por
 * request (React cache) para que layout y página no resuelvan dos veces.
 * Devuelve null si el host no es una tienda: la página decide qué mostrar.
 */
export const getStorefront = cache(async (rawHost: string): Promise<StorefrontContext | null> => {
  const host = normalizeHost(decodeURIComponent(rawHost));
  const resolved = await resolveSiteByHost(host);
  if (!resolved || resolved.site.kind !== "store") return null;

  const token = (await headers()).get(PREVIEW_HEADER);
  const preview = token ? verifyPreview(token) === resolved.site.id : false;
  const doc = preview ? (await getDraftDoc(resolved.site)).doc : await getPublishedDoc(resolved.site);

  return { ...resolved, host, theme: resolveTheme(resolved.site.theme), design: resolveDoc(doc), preview };
});

/** Enlace interno del storefront (todo vive bajo el host del cliente). */
export function sfHref(path: string) {
  return path.startsWith("/") ? path : `/${path}`;
}

export function formatMXN(cents: number) {
  return new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN" }).format(cents / 100);
}
