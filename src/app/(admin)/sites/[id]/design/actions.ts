"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { requireSiteAccess } from "@/lib/auth";
import { db } from "@/lib/db";
import { sites } from "@/lib/db/schema";
import { env } from "@/lib/env";
import { hostsForSite, invalidateSiteCache } from "@/lib/sites";
import { docFromTemplate } from "@/themes/resolve";
import { TEMPLATE_BY_KEY } from "@/themes/templates";
import type { ThemeDoc } from "@/themes/types";
import { discardDraft, getDraftDoc, publishDraft, restoreToDraft, saveDraft } from "@/themes/versions";

export type EditorResult = { ok: true; doc: ThemeDoc; dirty: boolean } | { ok: false; error: string };

async function loadSite(siteId: string) {
  const [site] = await db.select().from(sites).where(eq(sites.id, siteId));
  return site ?? null;
}

/** La tienda pública lee el sitio de un caché corto: lo limpiamos para que se vea al instante. */
async function refreshStore(siteId: string) {
  const site = await loadSite(siteId);
  if (site) for (const host of await hostsForSite(site.id, site.slug, env.rootDomain)) invalidateSiteCache(host);
  revalidatePath(`/sites/${siteId}/design`);
}

const fail = (e: unknown, msg: string): EditorResult => {
  console.error(msg, e);
  return { ok: false, error: msg };
};

export async function saveDraftAction(siteId: string, doc: unknown): Promise<EditorResult> {
  const access = await requireSiteAccess(siteId, { manage: true });
  try {
    const saved = await saveDraft(siteId, doc, access.user.email);
    return { ok: true, doc: saved, dirty: true };
  } catch (e) {
    return fail(e, "No se pudieron guardar los cambios. Revisa tu conexión e inténtalo de nuevo.");
  }
}

export async function publishAction(siteId: string): Promise<EditorResult> {
  const access = await requireSiteAccess(siteId, { manage: true });
  try {
    const published = await publishDraft(siteId, `Publicado por ${access.user.email}`);
    if (!published) return { ok: false, error: "No hay cambios por publicar." };
    await refreshStore(siteId);
    const site = await loadSite(siteId);
    if (!site) return { ok: false, error: "El sitio no existe." };
    const { doc } = await getDraftDoc(site);
    return { ok: true, doc, dirty: false };
  } catch (e) {
    return fail(e, "No se pudo publicar. Inténtalo de nuevo.");
  }
}

export async function discardAction(siteId: string): Promise<EditorResult> {
  await requireSiteAccess(siteId, { manage: true });
  try {
    await discardDraft(siteId);
    const site = await loadSite(siteId);
    if (!site) return { ok: false, error: "El sitio no existe." };
    const { doc } = await getDraftDoc(site);
    revalidatePath(`/sites/${siteId}/design`);
    return { ok: true, doc, dirty: false };
  } catch (e) {
    return fail(e, "No se pudieron descartar los cambios.");
  }
}

/** Cambia de plantilla en el borrador. Conserva el logo y el texto del anuncio. */
export async function applyTemplateAction(siteId: string, templateKey: string, styleKey?: string): Promise<EditorResult> {
  const access = await requireSiteAccess(siteId, { manage: true });
  if (!TEMPLATE_BY_KEY[templateKey]) return { ok: false, error: "Esa plantilla no existe." };
  try {
    const site = await loadSite(siteId);
    if (!site) return { ok: false, error: "El sitio no existe." };
    const { doc: current } = await getDraftDoc(site);
    const next = docFromTemplate(templateKey, styleKey);

    if (current.settings.logoUrl) next.settings.logoUrl = current.settings.logoUrl;
    const oldAnn = current.groups.header.find((s) => s.type === "announcement");
    const text = typeof oldAnn?.settings.text === "string" ? oldAnn.settings.text.trim() : "";
    if (text) {
      const ann = next.groups.header.find((s) => s.type === "announcement");
      if (ann) ann.settings = { ...ann.settings, text };
      else next.groups.header.unshift({ ...oldAnn!, settings: { ...oldAnn!.settings } });
    }

    const saved = await saveDraft(siteId, next, access.user.email);
    revalidatePath(`/sites/${siteId}/design`);
    return { ok: true, doc: saved, dirty: true };
  } catch (e) {
    return fail(e, "No se pudo aplicar la plantilla.");
  }
}

export async function restoreVersionAction(siteId: string, versionId: string): Promise<EditorResult> {
  const access = await requireSiteAccess(siteId, { manage: true });
  try {
    const ok = await restoreToDraft(siteId, versionId, access.user.email);
    if (!ok) return { ok: false, error: "No encontramos esa versión." };
    const site = await loadSite(siteId);
    if (!site) return { ok: false, error: "El sitio no existe." };
    const { doc } = await getDraftDoc(site);
    revalidatePath(`/sites/${siteId}/design`);
    return { ok: true, doc, dirty: true };
  } catch (e) {
    return fail(e, "No se pudo restaurar esa versión.");
  }
}
