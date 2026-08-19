import { CHAT_RUNTIME } from "@/lib/chat-widget";
import { SITE_RUNTIME } from "@/lib/runtime";
import type { PublicSiteConfig } from "@/lib/settings";

/** Prevent an inline </script> in the data from terminating the tag early. */
function safeJson(value: unknown): string {
  return JSON.stringify(value)
    .replace(/</g, "\\u003c")
    .replace(/>/g, "\\u003e")
    .replace(/\u2028/g, "\\u2028")
    .replace(/\u2029/g, "\\u2029");
}

function lookup(config: PublicSiteConfig, path: string): string | null {
  const parts = path.split(".");
  let cur: unknown = config;
  for (const p of parts) {
    if (cur && typeof cur === "object" && p in (cur as Record<string, unknown>)) {
      cur = (cur as Record<string, unknown>)[p];
    } else {
      return null;
    }
  }
  return cur == null || typeof cur === "object" ? null : String(cur);
}

function escapeHtml(s: string) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

/**
 * Replaces {{site.email}} / {{ site.socials.instagram }} style placeholders.
 * Unknown keys collapse to an empty string so nothing leaks to visitors.
 */
export function replacePlaceholders(html: string, config: PublicSiteConfig): string {
  return html.replace(/\{\{\s*site\.([a-zA-Z0-9_.]+)\s*\}\}/g, (_m, path: string) => {
    const v = lookup(config, path);
    return v === null ? "" : escapeHtml(v);
  });
}

/** Injects window.__SITE__ plus the runtime into a page's <head>. */
/**
 * Datos estructurados de Organización, armados con lo que hay en el panel.
 * Es la señal con la que Google reconoce la marca como entidad; sin ella un
 * dominio nuevo compite solo por texto contra homónimos ya establecidos.
 * Solo se emiten los campos con valor, igual que el resto del runtime.
 */
export function organizationJsonLd(config: PublicSiteConfig): string {
  const redes = Object.values(config.socials || {}).filter(Boolean);
  const data: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: config.brandName,
    url: `https://${config.host}/`,
  };
  if (config.email) data.email = config.email;
  if (config.phone) data.telephone = config.phone;
  if (config.address) data.address = config.address;
  if (config.mapsUrl) data.hasMap = config.mapsUrl;
  if (redes.length) data.sameAs = redes;

  return `<script type="application/ld+json" id="__site_jsonld__">${safeJson(data)}</script>`;
}

/**
 * Metadatos para compartir. Dos cosas que las landings casi nunca traen bien:
 *
 * og:image tiene que ser absoluta. WhatsApp, Facebook, X, LinkedIn e iMessage
 * descartan una ruta relativa y el enlace se comparte sin imagen. Aquí se
 * reescribe con el host que está sirviendo la página, que además es el correcto
 * cuando el mismo ZIP responde en el subdominio y en el dominio del cliente.
 *
 * Y se completa lo que falte —tarjeta de X, nombre del sitio, url— sin pisar
 * nada de lo que la landing ya declare.
 */
export function shareTags(html: string, config: PublicSiteConfig): string {
  const base = `https://${config.host}`;
  const absoluta = (url: string) =>
    /^(https?:)?\/\//i.test(url) || url.startsWith("data:")
      ? url
      : `${base}/${url.replace(/^\.?\/*/, "")}`;

  let out = html.replace(
    /(<meta\s+(?:property|name)="(?:og:image|twitter:image)"\s+content=")([^"]*)(")/gi,
    (_m, pre: string, url: string, post: string) => pre + escapeHtml(absoluta(url)) + post,
  );

  const tiene = (clave: string) => new RegExp(`(?:property|name)="${clave}"`, "i").test(out);

  const faltantes: string[] = [];
  if (/og:image/i.test(out) && !tiene("twitter:card")) {
    // Sin esto X muestra una miniatura cuadrada en vez de la imagen completa.
    faltantes.push('<meta name="twitter:card" content="summary_large_image">');
  }
  if (config.brandName && !tiene("og:site_name")) {
    faltantes.push(`<meta property="og:site_name" content="${escapeHtml(config.brandName)}">`);
  }
  if (!tiene("og:url")) {
    faltantes.push(`<meta property="og:url" content="${escapeHtml(base + "/")}">`);
  }

  if (faltantes.length === 0) return out;
  const bloque = faltantes.join("");
  if (/<\/head>/i.test(out)) return out.replace(/<\/head>/i, `${bloque}</head>`);
  return bloque + out;
}

export function injectIntoHtml(html: string, config: PublicSiteConfig): string {
  const withValues = shareTags(replacePlaceholders(html, config), config);

  // The chat script is only shipped to pages that actually use it.
  const chatBlock = config.chat?.enabled
    ? `<script id="__site_chat_runtime__">${CHAT_RUNTIME}</script>`
    : "";

  // Solo se omite si la landing ya declara la organización. Un FAQPage o un
  // BreadcrumbList propios conviven sin problema con el bloque del panel.
  const yaDeclaraOrg = /"@type"\s*:\s*"(Organization|LocalBusiness|Corporation|ProfessionalService)"/i.test(withValues);
  const jsonLd = yaDeclaraOrg ? "" : organizationJsonLd(config);

  const block =
    jsonLd +
    `<script id="__site_config__">window.__SITE__=${safeJson(config)};</script>` +
    `<script id="__site_runtime__">${SITE_RUNTIME}</script>` +
    chatBlock;

  if (/<\/head>/i.test(withValues)) {
    return withValues.replace(/<\/head>/i, `${block}</head>`);
  }
  if (/<body[^>]*>/i.test(withValues)) {
    return withValues.replace(/<body[^>]*>/i, (m) => `${m}${block}`);
  }
  return block + withValues;
}
