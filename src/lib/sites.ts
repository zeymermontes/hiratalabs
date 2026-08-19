import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { domains, siteChat, siteVersions, sites, type Site, type SiteVersion } from "@/lib/db/schema";
import { APEX_SLUG, siteHost, slugFromHost } from "@/lib/host";
import { publicSiteConfig, resolveSettings, type PublicSiteConfig } from "@/lib/settings";

export type ResolvedSite = {
  site: Site;
  version: SiteVersion | null;
  config: PublicSiteConfig;
};

type CacheEntry = { value: ResolvedSite | null; expires: number };

const CACHE = new Map<string, CacheEntry>();
const TTL_MS = 10_000;

/** Called by admin mutations so edits show up immediately on the same instance. */
export function invalidateSiteCache(host?: string) {
  if (host) CACHE.delete(host);
  else CACHE.clear();
}

async function lookup(host: string): Promise<ResolvedSite | null> {
  let site: Site | undefined;

  const slug = slugFromHost(host);
  if (slug) {
    [site] = await db.select().from(sites).where(eq(sites.slug, slug));
  }
  if (!site) {
    const [d] = await db
      .select()
      .from(domains)
      .where(and(eq(domains.hostname, host), eq(domains.status, "verified")));
    if (d) [site] = await db.select().from(sites).where(eq(sites.id, d.siteId));
  }
  if (!site) return null;

  let version: SiteVersion | null = null;
  if (site.activeVersionId) {
    const [v] = await db.select().from(siteVersions).where(eq(siteVersions.id, site.activeVersionId));
    version = v ?? null;
  }

  const settings = await resolveSettings(site.id, site.name);

  const [chatRow] = await db.select().from(siteChat).where(eq(siteChat.siteId, site.id));
  const chat = chatRow?.enabled
    ? {
        enabled: true,
        replacesForm: chatRow.replacesForm,
        launcherLabel: chatRow.launcherLabel ?? "Cotiza con IA",
        welcome: chatRow.welcome ?? "",
        serviceOptions: chatRow.serviceOptions ?? [],
        theme: chatRow.theme ?? null,
      }
    : null;

  const poweredBy = shouldShowPoweredBy(site.showPoweredBy, slug);

  return { site, version, config: publicSiteConfig(site, settings, host, { poweredBy, chat }) };
}

/**
 * El interruptor del panel decide, también en el dominio propio del cliente.
 * Validar un dominio propio lo apaga una sola vez (ver autoHidePoweredBy en las
 * acciones del panel); si el admin lo enciende de nuevo, el chip se muestra.
 * La única excepción fija es la home de la plataforma, que no se anuncia a sí misma.
 *
 * @param slug  label del subdominio, o null cuando es un dominio propio.
 */
export function shouldShowPoweredBy(showPoweredBy: boolean, slug: string | null): boolean {
  return showPoweredBy && slug !== APEX_SLUG;
}

export async function resolveSiteByHost(host: string): Promise<ResolvedSite | null> {
  const hit = CACHE.get(host);
  if (hit && hit.expires > Date.now()) return hit.value;

  const value = await lookup(host);
  CACHE.set(host, { value, expires: Date.now() + TTL_MS });
  return value;
}

/** All hostnames a site answers on — used to clear cache after an edit. */
export async function hostsForSite(siteId: string, slug: string, rootDomain: string) {
  const rows = await db.select({ hostname: domains.hostname }).from(domains).where(eq(domains.siteId, siteId));
  const own = slug === APEX_SLUG
    ? [rootDomain, `www.${rootDomain}`]
    : [siteHost(slug, rootDomain)];
  return [...own, ...rows.map((r) => r.hostname)];
}
