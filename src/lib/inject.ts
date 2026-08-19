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

export function injectIntoHtml(html: string, config: PublicSiteConfig): string {
  const withValues = replacePlaceholders(html, config);

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
