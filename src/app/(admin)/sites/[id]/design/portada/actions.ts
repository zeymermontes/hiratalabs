"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { requireSiteAccess } from "@/lib/auth";
import { db } from "@/lib/db";
import { banners } from "@/modules/catalog/schema";

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
