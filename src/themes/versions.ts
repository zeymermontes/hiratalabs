import { and, desc, eq, inArray } from "drizzle-orm";
import { db } from "@/lib/db";
import { sites, type Site } from "@/lib/db/schema";
import { listHomeSections } from "@/modules/catalog/queries";
import { legacyToDoc, normalizeDoc } from "./resolve";
import { themeVersions, type ThemeVersion } from "./schema";
import type { ThemeDoc } from "./types";

/** Cuántas versiones archivadas se guardan por tienda para poder regresar. */
const KEEP_ARCHIVED = 15;

async function versionOf(siteId: string, status: "draft" | "published"): Promise<ThemeVersion | null> {
  const [row] = await db.select().from(themeVersions)
    .where(and(eq(themeVersions.siteId, siteId), eq(themeVersions.status, status))).limit(1);
  return row ?? null;
}

/** Lo que ve el público: la versión publicada o, si la tienda es anterior al motor, su tema viejo traducido. */
export async function getPublishedDoc(site: Pick<Site, "id" | "theme">): Promise<ThemeDoc> {
  const pub = await versionOf(site.id, "published");
  if (pub) return normalizeDoc(pub.doc);
  const legacy = await listHomeSections(site.id, { includeInactive: false }).catch(() => []);
  return legacyToDoc(site.theme, legacy);
}

/** El borrador del editor; si no hay, nace de lo publicado. */
export async function getDraftDoc(site: Pick<Site, "id" | "theme">): Promise<{ doc: ThemeDoc; dirty: boolean; updatedAt: Date | null }> {
  const draft = await versionOf(site.id, "draft");
  if (draft) return { doc: normalizeDoc(draft.doc), dirty: true, updatedAt: draft.updatedAt };
  return { doc: await getPublishedDoc(site), dirty: false, updatedAt: null };
}

export async function saveDraft(siteId: string, raw: unknown, by?: string): Promise<ThemeDoc> {
  const doc = normalizeDoc(raw);
  const existing = await versionOf(siteId, "draft");
  if (existing) {
    await db.update(themeVersions).set({ doc, updatedAt: new Date(), createdBy: by ?? existing.createdBy })
      .where(eq(themeVersions.id, existing.id));
  } else {
    await db.insert(themeVersions).values({ siteId, status: "draft", doc, createdBy: by });
  }
  return doc;
}

export async function discardDraft(siteId: string) {
  await db.delete(themeVersions).where(and(eq(themeVersions.siteId, siteId), eq(themeVersions.status, "draft")));
}

/**
 * Publica el borrador: la versión publicada pasa a archivada (para poder
 * regresar) y el borrador se vuelve la publicada. También deja la plantilla
 * en sites.theme para quien todavía lea ese campo (correos, resumen).
 */
export async function publishDraft(siteId: string, label?: string): Promise<boolean> {
  const draft = await versionOf(siteId, "draft");
  if (!draft) return false;
  await db.transaction(async (tx) => {
    await tx.update(themeVersions).set({ status: "archived", updatedAt: new Date() })
      .where(and(eq(themeVersions.siteId, siteId), eq(themeVersions.status, "published")));
    await tx.update(themeVersions).set({ status: "published", publishedAt: new Date(), updatedAt: new Date(), label: label ?? draft.label })
      .where(eq(themeVersions.id, draft.id));
    const d = normalizeDoc(draft.doc);
    const b = d.settings.schemes.base;
    const [site] = await tx.select({ theme: sites.theme }).from(sites).where(eq(sites.id, siteId));
    await tx.update(sites).set({
      theme: {
        ...(site?.theme ?? {}),
        template: d.template,
        colors: { primary: b.primary, primaryForeground: b.primaryFg, accent: b.accent, background: b.bg, foreground: b.fg, muted: b.muted },
        fonts: d.settings.fonts,
        radius: d.settings.radius,
        logoUrl: d.settings.logoUrl,
      },
      updatedAt: new Date(),
    }).where(eq(sites.id, siteId));
  });
  await pruneArchived(siteId);
  return true;
}

async function pruneArchived(siteId: string) {
  const archived = await db.select({ id: themeVersions.id }).from(themeVersions)
    .where(and(eq(themeVersions.siteId, siteId), eq(themeVersions.status, "archived")))
    .orderBy(desc(themeVersions.updatedAt));
  const drop = archived.slice(KEEP_ARCHIVED).map((r) => r.id);
  if (drop.length) await db.delete(themeVersions).where(inArray(themeVersions.id, drop));
}

export async function listVersions(siteId: string) {
  return db.select({
    id: themeVersions.id, status: themeVersions.status, label: themeVersions.label,
    updatedAt: themeVersions.updatedAt, publishedAt: themeVersions.publishedAt, template: themeVersions.doc,
  }).from(themeVersions).where(eq(themeVersions.siteId, siteId)).orderBy(desc(themeVersions.updatedAt)).limit(KEEP_ARCHIVED + 2)
    .then((rows) => rows.map((r) => ({ ...r, template: (r.template as ThemeDoc)?.template ?? "" })));
}

/** Copia una versión archivada (o la publicada) al borrador para revisarla antes de republicar. */
export async function restoreToDraft(siteId: string, versionId: string, by?: string): Promise<boolean> {
  const [row] = await db.select().from(themeVersions)
    .where(and(eq(themeVersions.id, versionId), eq(themeVersions.siteId, siteId))).limit(1);
  if (!row) return false;
  await saveDraft(siteId, row.doc, by);
  return true;
}
