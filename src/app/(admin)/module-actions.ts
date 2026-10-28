"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { requireAdmin, requireSiteAccess } from "@/lib/auth";
import { db } from "@/lib/db";
import { modulesCatalog, moduleRequests, siteMembers, sites } from "@/lib/db/schema";
import { env } from "@/lib/env";
import { sendModuleRequestEmail } from "@/lib/mailer";
import { canToggle, invalidateModuleCache, listSiteModules, setSiteModule } from "@/lib/modules";
import { hostsForSite, invalidateSiteCache } from "@/lib/sites";
import { MODULE_BY_KEY } from "@/modules/registry";

export type ActionState = { ok?: boolean; error?: string; message?: string };

async function refreshSite(siteId: string) {
  const [site] = await db.select().from(sites).where(eq(sites.id, siteId));
  if (site) {
    for (const host of await hostsForSite(site.id, site.slug, env.rootDomain)) invalidateSiteCache(host);
  }
  invalidateModuleCache(siteId);
  revalidatePath(`/sites/${siteId}`, "layout");
}

/* ------------------------------ por sitio ------------------------------- */

export async function toggleSiteModule(siteId: string, key: string, enabled: boolean): Promise<ActionState> {
  const access = await requireSiteAccess(siteId, { manage: true });
  const [site] = await db.select().from(sites).where(eq(sites.id, siteId));
  if (!site) return { error: "El sitio no existe." };

  const list = await listSiteModules(site);
  const m = list.find((x) => x.def.key === key);
  if (!m) return { error: "Ese módulo no aplica a este sitio." };
  if (!canToggle(m, access)) return { error: "No puedes cambiar este módulo. Pídelo como extra." };
  if (enabled && m.missing.length > 0) {
    const names = m.missing.map((k) => MODULE_BY_KEY[k]?.name ?? k).join(", ");
    return { error: `Primero activa: ${names}.` };
  }

  await setSiteModule(siteId, key, enabled, access.user.email);
  await refreshSite(siteId);
  return { ok: true, message: enabled ? `${m.def.name} activado.` : `${m.def.name} desactivado.` };
}

/** El dueño pide un extra. Se avisa a la plataforma por correo y queda en Solicitudes. */
export async function requestModule(siteId: string, key: string, message: string): Promise<ActionState> {
  const access = await requireSiteAccess(siteId, { manage: true });
  const def = MODULE_BY_KEY[key];
  if (!def) return { error: "Módulo desconocido." };

  const [pending] = await db.select().from(moduleRequests).where(and(
    eq(moduleRequests.siteId, siteId), eq(moduleRequests.moduleKey, key), eq(moduleRequests.status, "pending"),
  ));
  if (pending) return { ok: true, message: "Ya tenemos tu solicitud. Te avisamos en cuanto esté activo." };

  await db.insert(moduleRequests).values({
    siteId, moduleKey: key, requestedBy: access.user.email, message: message.trim() || null,
  });
  const [site] = await db.select({ name: sites.name }).from(sites).where(eq(sites.id, siteId));
  await sendModuleRequestEmail({
    siteName: site?.name ?? siteId, moduleName: def.name, requestedBy: access.user.email, message,
  }).catch(() => null);

  revalidatePath(`/sites/${siteId}/modules`);
  revalidatePath("/requests");
  return { ok: true, message: "Solicitud enviada. Te contactamos por correo para activarlo." };
}

/* ------------------------------ plataforma ------------------------------ */

export async function saveCatalogEntry(_prev: ActionState, form: FormData): Promise<ActionState> {
  await requireAdmin();
  const key = String(form.get("key"));
  if (!MODULE_BY_KEY[key]) return { error: "Módulo desconocido." };

  const values = {
    available: form.get("available") === "on",
    tier: (form.get("tier") === "paid" ? "paid" : "free") as "free" | "paid",
    priceLabel: String(form.get("priceLabel") ?? "").trim() || null,
    ownerCanToggle: form.get("ownerCanToggle") === "on",
    notes: String(form.get("notes") ?? "").trim() || null,
    updatedAt: new Date(),
  };
  await db.insert(modulesCatalog).values({ key, ...values })
    .onConflictDoUpdate({ target: modulesCatalog.key, set: values });

  invalidateModuleCache();
  invalidateSiteCache();
  revalidatePath("/modules");
  return { ok: true, message: "Guardado." };
}

/** Vuelve a los defaults del código. */
export async function resetCatalogEntry(key: string) {
  await requireAdmin();
  await db.delete(modulesCatalog).where(eq(modulesCatalog.key, key));
  invalidateModuleCache();
  invalidateSiteCache();
  revalidatePath("/modules");
}

export async function resolveRequest(id: string, approve: boolean) {
  const admin = await requireAdmin();
  const [r] = await db.select().from(moduleRequests).where(eq(moduleRequests.id, id));
  if (!r || r.status !== "pending") return;

  await db.update(moduleRequests).set({
    status: approve ? "approved" : "rejected", resolvedBy: admin.email, resolvedAt: new Date(),
  }).where(eq(moduleRequests.id, id));

  if (approve) {
    await setSiteModule(r.siteId, r.moduleKey, true, admin.email);
    await refreshSite(r.siteId);
  }
  revalidatePath("/requests");
  revalidatePath(`/sites/${r.siteId}/modules`);
}

/* -------------------------------- equipo -------------------------------- */

export async function addMember(_prev: ActionState, form: FormData): Promise<ActionState> {
  const siteId = String(form.get("siteId"));
  const access = await requireSiteAccess(siteId, { manage: true });
  const email = String(form.get("email") ?? "").trim().toLowerCase();
  const name = String(form.get("name") ?? "").trim() || null;
  const role = form.get("role") === "staff" ? "staff" : "owner";

  if (!/^[^@\s]+@[^@\s.]+\.[^@\s]+$/.test(email)) return { error: "Escribe un correo válido." };

  await db.insert(siteMembers).values({ siteId, email, name, role, invitedBy: access.user.email })
    .onConflictDoUpdate({ target: [siteMembers.siteId, siteMembers.email], set: { role, name } });

  revalidatePath(`/sites/${siteId}/team`);
  return { ok: true, message: `${email} ya puede entrar con su correo (magic link).` };
}

export async function removeMember(siteId: string, memberId: string) {
  const access = await requireSiteAccess(siteId, { manage: true });
  const [m] = await db.select().from(siteMembers).where(eq(siteMembers.id, memberId));
  if (!m || m.siteId !== siteId) return;
  // Un dueño no se quita a sí mismo por accidente; el super admin sí puede.
  if (!access.isSuperAdmin && m.email === access.user.email) return;
  await db.delete(siteMembers).where(eq(siteMembers.id, memberId));
  revalidatePath(`/sites/${siteId}/team`);
}

/* -------------------------------- diseño -------------------------------- */

const HEX = /^#[0-9a-f]{6}$/i;

export async function saveSiteTheme(_prev: ActionState, form: FormData): Promise<ActionState> {
  const siteId = String(form.get("siteId"));
  await requireSiteAccess(siteId, { manage: true });
  const { TEMPLATE_BY_KEY } = await import("@/lib/theme");

  const template = String(form.get("template") ?? "lumen");
  if (!TEMPLATE_BY_KEY[template]) return { error: "Plantilla desconocida." };

  const colors: Record<string, string> = {};
  for (const k of ["primary", "primaryForeground", "accent", "background", "foreground", "muted"]) {
    const v = String(form.get(`color_${k}`) ?? "").trim();
    if (v && HEX.test(v)) colors[k] = v.toLowerCase();
  }
  const fonts: Record<string, string> = {};
  for (const k of ["display", "body"]) {
    const v = String(form.get(`font_${k}`) ?? "").trim().replace(/[^A-Za-z0-9 ]/g, "");
    if (v) fonts[k] = v;
  }
  const radiusRaw = String(form.get("radius") ?? "");
  const radius = (["none", "sm", "md", "lg", "full"] as const).find((r) => r === radiusRaw);
  const logoUrl = String(form.get("logoUrl") ?? "").trim();
  const announcement = String(form.get("announcement") ?? "").trim();

  await db.update(sites).set({
    theme: {
      template,
      colors: Object.keys(colors).length ? colors : undefined,
      fonts: Object.keys(fonts).length ? fonts : undefined,
      radius,
      logoUrl: /^https?:\/\//.test(logoUrl) ? logoUrl : undefined,
      announcement: announcement || undefined,
    },
    updatedAt: new Date(),
  }).where(eq(sites.id, siteId));

  await refreshSite(siteId);
  return { ok: true, message: "Diseño guardado. Se ve al instante en la tienda." };
}
