import { and, eq, inArray } from "drizzle-orm";
import { db } from "@/lib/db";
import { modulesCatalog, moduleRequests, siteModules, sites, type Site } from "@/lib/db/schema";
import { MODULE_BY_KEY, MODULES, modulesFor, type ModuleDef, type ModuleTierKey } from "@/modules/registry";

/** Lo que ve el panel: la definición en código + lo que ajustó el super admin + el estado en este sitio. */
export type EffectiveModule = {
  def: ModuleDef;
  /** false = el super admin lo retiró del catálogo; no se muestra al dueño. */
  available: boolean;
  tier: ModuleTierKey;
  priceLabel: string | null;
  ownerCanToggle: boolean;
  enabled: boolean;
  config: Record<string, unknown>;
  /** Hay una solicitud del dueño esperando respuesta. */
  pendingRequest: boolean;
  /** Módulos requeridos que están apagados (bloquean activar este). */
  missing: string[];
};

type CacheEntry = { value: Set<string>; expires: number };
const ENABLED_CACHE = new Map<string, CacheEntry>();
const TTL_MS = 10_000;

export function invalidateModuleCache(siteId?: string) {
  if (siteId) ENABLED_CACHE.delete(siteId);
  else ENABLED_CACHE.clear();
}

async function catalogMap() {
  const rows = await db.select().from(modulesCatalog);
  return new Map(rows.map((r) => [r.key, r]));
}

/**
 * Qué módulos están activos en un sitio, resolviendo defaults + catálogo + filas
 * del sitio. Un módulo retirado del catálogo cuenta como apagado aunque el sitio
 * lo tuviera prendido: así el super admin puede "despublicar" una función.
 */
export async function enabledModuleKeys(site: Pick<Site, "id" | "kind">): Promise<Set<string>> {
  const hit = ENABLED_CACHE.get(site.id);
  if (hit && hit.expires > Date.now()) return hit.value;

  const [catalog, rows] = await Promise.all([
    catalogMap(),
    db.select().from(siteModules).where(eq(siteModules.siteId, site.id)),
  ]);
  const own = new Map(rows.map((r) => [r.moduleKey, r]));

  const out = new Set<string>();
  for (const def of modulesFor(site.kind)) {
    const cat = catalog.get(def.key);
    if (cat && !cat.available) continue;
    const row = own.get(def.key);
    const enabled = row ? row.enabled : def.defaultEnabled;
    if (enabled) out.add(def.key);
  }
  // Un módulo con dependencias apagadas no cuenta como activo.
  for (const key of [...out]) {
    const def = MODULE_BY_KEY[key];
    if (def.requires?.some((r) => !out.has(r))) out.delete(key);
  }

  ENABLED_CACHE.set(site.id, { value: out, expires: Date.now() + TTL_MS });
  return out;
}

export async function isModuleEnabled(site: Pick<Site, "id" | "kind">, key: string): Promise<boolean> {
  return (await enabledModuleKeys(site)).has(key);
}

/** Igual que isModuleEnabled pero partiendo del id, para rutas que solo tienen eso. */
export async function isModuleEnabledById(siteId: string, key: string): Promise<boolean> {
  const [site] = await db.select({ id: sites.id, kind: sites.kind }).from(sites).where(eq(sites.id, siteId));
  if (!site) return false;
  return isModuleEnabled(site, key);
}

/** Lista completa para la página de módulos del sitio. */
export async function listSiteModules(site: Pick<Site, "id" | "kind">): Promise<EffectiveModule[]> {
  const defs = modulesFor(site.kind);
  const [catalog, rows, pending] = await Promise.all([
    catalogMap(),
    db.select().from(siteModules).where(eq(siteModules.siteId, site.id)),
    db.select({ key: moduleRequests.moduleKey }).from(moduleRequests)
      .where(and(eq(moduleRequests.siteId, site.id), eq(moduleRequests.status, "pending"))),
  ]);
  const own = new Map(rows.map((r) => [r.moduleKey, r]));
  const pendingKeys = new Set(pending.map((p) => p.key));
  const enabled = await enabledModuleKeys(site);

  return defs.map((def) => {
    const cat = catalog.get(def.key);
    const row = own.get(def.key);
    return {
      def,
      available: cat ? cat.available : true,
      tier: (cat?.tier ?? def.tier) as ModuleTierKey,
      priceLabel: cat?.priceLabel ?? def.priceLabel ?? null,
      ownerCanToggle: cat?.ownerCanToggle ?? def.ownerCanToggle,
      enabled: row ? row.enabled : def.defaultEnabled,
      config: row?.config ?? {},
      pendingRequest: pendingKeys.has(def.key),
      missing: (def.requires ?? []).filter((r) => !enabled.has(r)),
    };
  });
}

/** Catálogo completo para el super admin, con los ajustes guardados encima del código. */
export async function listCatalog() {
  const catalog = await catalogMap();
  return MODULES.map((def) => {
    const cat = catalog.get(def.key);
    return {
      def,
      available: cat ? cat.available : true,
      tier: (cat?.tier ?? def.tier) as ModuleTierKey,
      priceLabel: cat?.priceLabel ?? def.priceLabel ?? null,
      ownerCanToggle: cat?.ownerCanToggle ?? def.ownerCanToggle,
      notes: cat?.notes ?? null,
      customized: Boolean(cat),
    };
  });
}

/**
 * ¿Puede este usuario prender/apagar el módulo? El super admin siempre (salvo
 * módulos core, que nunca se apagan). El dueño solo si el catálogo lo permite y
 * es gratis; el staff nunca.
 */
export function canToggle(
  m: Pick<EffectiveModule, "def" | "tier" | "ownerCanToggle" | "available">,
  who: { isSuperAdmin: boolean; role: "owner" | "staff" | null },
): boolean {
  if (m.def.core) return false;
  if (!m.available) return who.isSuperAdmin;
  if (who.isSuperAdmin) return true;
  if (who.role !== "owner") return false;
  return m.ownerCanToggle && m.tier === "free";
}

export async function setSiteModule(siteId: string, key: string, enabled: boolean, by: string) {
  if (!MODULE_BY_KEY[key]) throw new Error(`Módulo desconocido: ${key}`);
  await db
    .insert(siteModules)
    .values({ siteId, moduleKey: key, enabled, enabledBy: by, updatedAt: new Date() })
    .onConflictDoUpdate({
      target: [siteModules.siteId, siteModules.moduleKey],
      set: { enabled, enabledBy: by, updatedAt: new Date() },
    });
  invalidateModuleCache(siteId);
}

export async function getModuleConfig<T extends Record<string, unknown>>(siteId: string, key: string): Promise<T> {
  const [row] = await db.select({ config: siteModules.config }).from(siteModules)
    .where(and(eq(siteModules.siteId, siteId), eq(siteModules.moduleKey, key)));
  return ((row?.config ?? {}) as T);
}

export async function setModuleConfig(siteId: string, key: string, config: Record<string, unknown>, by: string) {
  const def = MODULE_BY_KEY[key];
  if (!def) throw new Error(`Módulo desconocido: ${key}`);
  await db
    .insert(siteModules)
    .values({ siteId, moduleKey: key, enabled: def.defaultEnabled, config, enabledBy: by, updatedAt: new Date() })
    .onConflictDoUpdate({
      target: [siteModules.siteId, siteModules.moduleKey],
      set: { config, updatedAt: new Date() },
    });
  invalidateModuleCache(siteId);
}

/** Para listados: los módulos activos de varios sitios de un jalón. */
export async function enabledKeysForSites(list: Pick<Site, "id" | "kind">[]): Promise<Map<string, Set<string>>> {
  const out = new Map<string, Set<string>>();
  if (list.length === 0) return out;
  const ids = list.map((s) => s.id);
  const [catalog, rows] = await Promise.all([
    catalogMap(),
    db.select().from(siteModules).where(inArray(siteModules.siteId, ids)),
  ]);
  const bySite = new Map<string, Map<string, boolean>>();
  for (const r of rows) {
    if (!bySite.has(r.siteId)) bySite.set(r.siteId, new Map());
    bySite.get(r.siteId)!.set(r.moduleKey, r.enabled);
  }
  for (const site of list) {
    const own = bySite.get(site.id) ?? new Map<string, boolean>();
    const set = new Set<string>();
    for (const def of modulesFor(site.kind)) {
      const cat = catalog.get(def.key);
      if (cat && !cat.available) continue;
      if (own.has(def.key) ? own.get(def.key) : def.defaultEnabled) set.add(def.key);
    }
    for (const key of [...set]) {
      if (MODULE_BY_KEY[key].requires?.some((r) => !set.has(r))) set.delete(key);
    }
    out.set(site.id, set);
  }
  return out;
}
