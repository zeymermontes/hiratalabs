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
export function injectIntoHtml(html: string, config: PublicSiteConfig): string {
  const withValues = replacePlaceholders(html, config);

  const block =
    `<script id="__site_config__">window.__SITE__=${safeJson(config)};</script>` +
    `<script id="__site_runtime__">${SITE_RUNTIME}</script>`;

  if (/<\/head>/i.test(withValues)) {
    return withValues.replace(/<\/head>/i, `${block}</head>`);
  }
  if (/<body[^>]*>/i.test(withValues)) {
    return withValues.replace(/<body[^>]*>/i, (m) => `${m}${block}`);
  }
  return block + withValues;
}
