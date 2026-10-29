"use server";

import { and, asc, desc, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { requireSiteAccess } from "@/lib/auth";
import { db } from "@/lib/db";
import { banners, homeSections } from "@/modules/catalog/schema";
import { SECTION_TYPES, type SectionType } from "./section-types";

export type ActionState = { ok?: boolean; error?: string; message?: string };

const POSITIONS = ["hero", "strip", "category"] as const;

function str(form: FormData, key: string) {
  return String(form.get(key) ?? "").trim();
}
function url(form: FormData, key: string) {
  const v = str(form, key);
  return /^https?:\/\//.test(v) ? v : "";
}
function href(form: FormData, key: string) {
  const v = str(form, key);
  return /^(https?:\/\/|\/|#|mailto:|tel:)/.test(v) ? v : "";
}
function date(form: FormData, key: string): Date | null {
  const v = str(form, key);
  if (!v) return null;
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? null : d;
}
function refresh(siteId: string) {
  revalidatePath(`/sites/${siteId}/design/portada`);
}

/* ------------------------------------------------------------------ banners */

export async function saveBanner(_prev: ActionState, form: FormData): Promise<ActionState> {
  const siteId = str(form, "siteId");
  await requireSiteAccess(siteId, { manage: true });
  const bannerId = str(form, "bannerId");

  const title = str(form, "title");
  if (!title) return { error: "Escribe un título (aunque no se muestre, te sirve para identificarlo)." };
  const imageUrl = url(form, "imageUrl");
  if (!imageUrl) return { error: "Sube la imagen del banner." };
  const posRaw = str(form, "position");
  const position = POSITIONS.find((p) => p === posRaw) ?? "hero";
  const startsAt = date(form, "startsAt");
  const endsAt = date(form, "endsAt");
  if (startsAt && endsAt && endsAt < startsAt) return { error: "La fecha de fin es antes que la de inicio." };
  const sortOrder = Number(str(form, "sortOrder") || 0);

  const values = {
    title,
    subtitle: str(form, "subtitle") || null,
    imageUrl,
    mobileImageUrl: url(form, "mobileImageUrl") || null,
    linkUrl: href(form, "linkUrl") || null,
    ctaLabel: str(form, "ctaLabel") || null,
    position,
    sortOrder: Number.isInteger(sortOrder) ? sortOrder : 0,
    active: form.get("active") === "on",
    startsAt, endsAt,
  };

  if (bannerId) {
    await db.update(banners).set(values).where(and(eq(banners.id, bannerId), eq(banners.siteId, siteId)));
  } else {
    await db.insert(banners).values({ siteId, ...values });
  }
  refresh(siteId);
  return { ok: true, message: bannerId ? "Banner guardado." : "Banner creado." };
}

export async function deleteBanner(siteId: string, bannerId: string) {
  await requireSiteAccess(siteId, { manage: true });
  await db.delete(banners).where(and(eq(banners.id, bannerId), eq(banners.siteId, siteId)));
  refresh(siteId);
}

export async function toggleBanner(siteId: string, bannerId: string, active: boolean) {
  await requireSiteAccess(siteId, { manage: true });
  await db.update(banners).set({ active }).where(and(eq(banners.id, bannerId), eq(banners.siteId, siteId)));
  refresh(siteId);
}

/* ---------------------------------------------------------------- secciones */

function buildConfig(type: SectionType, form: FormData): Record<string, unknown> {
  const num = (key: string, fallback: number, max = 50) => {
    const n = Number(str(form, key));
    return Number.isFinite(n) && n > 0 ? Math.min(n, max) : fallback;
  };
  switch (type) {
    case "hero_banners":
      return {
        autoplayMs: str(form, "autoplayMs") === "0" ? 0 : num("autoplayMs", 6000, 60000),
        title: str(form, "heroTitle") || undefined,
        subtitle: str(form, "heroSubtitle") || undefined,
        imageUrl: url(form, "heroImageUrl") || undefined,
        primaryLabel: str(form, "primaryLabel") || undefined,
        primaryHref: href(form, "primaryHref") || undefined,
        secondaryLabel: str(form, "secondaryLabel") || undefined,
        secondaryHref: href(form, "secondaryHref") || undefined,
      };
    case "featured_products":
      return { limit: num("limit", 8), source: str(form, "source") === "newest" ? "newest" : "featured" };
    case "carousel":
      return { limit: num("limit", 12), source: str(form, "source") === "featured" ? "featured" : "newest", categorySlug: str(form, "categorySlug") || undefined };
    case "category_grid":
      return { limit: num("limit", 6) };
    case "cta_band":
      return {
        title: str(form, "ctaTitle") || undefined,
        subtitle: str(form, "ctaSubtitle") || undefined,
        buttonLabel: str(form, "buttonLabel") || undefined,
        buttonHref: href(form, "buttonHref") || undefined,
      };
    case "custom_html":
      return { html: String(form.get("html") ?? "").slice(0, 20000) };
    case "banner_strip":
    default:
      return {};
  }
}

export async function saveSection(_prev: ActionState, form: FormData): Promise<ActionState> {
  const siteId = str(form, "siteId");
  await requireSiteAccess(siteId, { manage: true });
  const sectionId = str(form, "sectionId");
  const typeRaw = str(form, "type");
  const type = SECTION_TYPES.find((t) => t === typeRaw);
  if (!type) return { error: "Tipo de sección desconocido." };

  const values = { type, title: str(form, "title") || null, config: buildConfig(type, form) };
  if (sectionId) {
    await db.update(homeSections).set(values).where(and(eq(homeSections.id, sectionId), eq(homeSections.siteId, siteId)));
  } else {
    const [last] = await db.select({ sortOrder: homeSections.sortOrder }).from(homeSections)
      .where(eq(homeSections.siteId, siteId)).orderBy(desc(homeSections.sortOrder)).limit(1);
    await db.insert(homeSections).values({ siteId, ...values, active: true, sortOrder: (last?.sortOrder ?? -1) + 1 });
  }
  refresh(siteId);
  return { ok: true, message: sectionId ? "Sección guardada." : "Sección agregada." };
}

export async function deleteSection(siteId: string, sectionId: string) {
  await requireSiteAccess(siteId, { manage: true });
  await db.delete(homeSections).where(and(eq(homeSections.id, sectionId), eq(homeSections.siteId, siteId)));
  refresh(siteId);
}

export async function toggleSection(siteId: string, sectionId: string, active: boolean) {
  await requireSiteAccess(siteId, { manage: true });
  await db.update(homeSections).set({ active }).where(and(eq(homeSections.id, sectionId), eq(homeSections.siteId, siteId)));
  refresh(siteId);
}

export async function moveSection(siteId: string, sectionId: string, dir: -1 | 1) {
  await requireSiteAccess(siteId, { manage: true });
  const rows = await db.select({ id: homeSections.id }).from(homeSections)
    .where(eq(homeSections.siteId, siteId)).orderBy(asc(homeSections.sortOrder));
  const ids = rows.map((r) => r.id);
  const i = ids.indexOf(sectionId);
  const j = i + dir;
  if (i < 0 || j < 0 || j >= ids.length) return;
  [ids[i], ids[j]] = [ids[j], ids[i]];
  await Promise.all(ids.map((id, idx) => db.update(homeSections).set({ sortOrder: idx }).where(eq(homeSections.id, id))));
  refresh(siteId);
}

/** Portada inicial para una tienda sin secciones: hero + destacados + categorías. */
export async function seedDefaultSections(siteId: string) {
  await requireSiteAccess(siteId, { manage: true });
  const existing = await db.select({ id: homeSections.id }).from(homeSections).where(eq(homeSections.siteId, siteId)).limit(1);
  if (existing.length) return;
  await db.insert(homeSections).values([
    { siteId, type: "hero_banners", title: null, config: { autoplayMs: 6000 }, sortOrder: 0, active: true },
    { siteId, type: "featured_products", title: "Destacados", config: { limit: 8, source: "featured" }, sortOrder: 1, active: true },
    { siteId, type: "category_grid", title: "Explora por categoría", config: { limit: 6 }, sortOrder: 2, active: true },
  ]);
  refresh(siteId);
}
