"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import {
  domains, globalSettings, siteFiles, siteSettings, siteVersions, sites,
} from "@/lib/db/schema";
import { env, RESERVED_SLUGS } from "@/lib/env";
import { cacheClear } from "@/lib/filecache";
import { sendTestEmail } from "@/lib/mailer";
import { createCustomDomain, deleteCustomDomain, getCustomDomain, renderConfigured } from "@/lib/render";
import { SOCIAL_KEYS } from "@/lib/settings";
import { hostsForSite, invalidateSiteCache } from "@/lib/sites";
import { removePrefix, storagePrefix, uploadVersionFiles, etagFor } from "@/lib/storage";
import { extractZip } from "@/lib/zip";

export type ActionState = { ok?: boolean; error?: string; message?: string };

async function refreshSite(siteId: string) {
  const [site] = await db.select().from(sites).where(eq(sites.id, siteId));
  if (site) {
    for (const host of await hostsForSite(site.id, site.slug, env.rootDomain)) {
      invalidateSiteCache(host);
    }
  }
  invalidateSiteCache();
  revalidatePath("/", "layout");
}

function slugify(raw: string) {
  return raw
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .toLowerCase().trim()
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
}

function parseList(raw: FormDataEntryValue | null): string[] {
  return String(raw ?? "")
    .split(/[\s,;]+/)
    .map((s) => s.trim().toLowerCase())
    .filter((s) => s.includes("@"));
}

function parseKeyValues(raw: FormDataEntryValue | null): Record<string, string> {
  const out: Record<string, string> = {};
  for (const line of String(raw ?? "").split("\n")) {
    const i = line.indexOf("=");
    if (i < 1) continue;
    const k = line.slice(0, i).trim();
    const v = line.slice(i + 1).trim();
    if (k) out[k] = v;
  }
  return out;
}

/* ------------------------------- sites ---------------------------------- */

export async function createSite(_prev: ActionState, form: FormData): Promise<ActionState> {
  await requireAdmin();
  const name = String(form.get("name") ?? "").trim();
  const slug = slugify(String(form.get("slug") ?? "") || name);

  if (!name) return { error: "Ponle un nombre al sitio." };
  if (!slug) return { error: "El subdominio no puede quedar vacío." };
  if (RESERVED_SLUGS.has(slug)) return { error: `"${slug}" es un subdominio reservado.` };

  const [taken] = await db.select().from(sites).where(eq(sites.slug, slug));
  if (taken) return { error: `El subdominio "${slug}" ya está en uso.` };

  const [site] = await db.insert(sites).values({ name, slug, status: "draft" }).returning();
  await db.insert(siteSettings).values({ siteId: site.id }).onConflictDoNothing();
  await refreshSite(site.id);
  redirect(`/sites/${site.id}`);
}

export async function updateSiteMeta(_prev: ActionState, form: FormData): Promise<ActionState> {
  await requireAdmin();
  const id = String(form.get("siteId"));
  const name = String(form.get("name") ?? "").trim();
  const slug = slugify(String(form.get("slug") ?? ""));

  if (!name || !slug) return { error: "Nombre y subdominio son obligatorios." };
  if (RESERVED_SLUGS.has(slug)) return { error: `"${slug}" es un subdominio reservado.` };

  const [taken] = await db.select().from(sites).where(eq(sites.slug, slug));
  if (taken && taken.id !== id) return { error: `El subdominio "${slug}" ya está en uso.` };

  await db.update(sites).set({
    name, slug,
    maintenanceTitle: String(form.get("maintenanceTitle") ?? "").trim() || null,
    maintenanceMessage: String(form.get("maintenanceMessage") ?? "").trim() || null,
    notes: String(form.get("notes") ?? "").trim() || null,
    updatedAt: new Date(),
  }).where(eq(sites.id, id));

  await refreshSite(id);
  return { ok: true, message: "Guardado." };
}

export async function setSiteStatus(siteId: string, status: "live" | "maintenance" | "blocked" | "draft") {
  await requireAdmin();
  await db.update(sites).set({ status, updatedAt: new Date() }).where(eq(sites.id, siteId));
  await refreshSite(siteId);
}

export async function deleteSite(siteId: string) {
  await requireAdmin();
  const versions = await db.select().from(siteVersions).where(eq(siteVersions.siteId, siteId));
  for (const v of versions) {
    const files = await db.select({ path: siteFiles.path }).from(siteFiles).where(eq(siteFiles.versionId, v.id));
    await removePrefix(v.storagePrefix, files.map((f) => f.path));
    cacheClear(`${v.id}/`);
  }
  const siteDomains = await db.select().from(domains).where(eq(domains.siteId, siteId));
  for (const d of siteDomains) {
    if (d.renderDomainId) await deleteCustomDomain(d.renderDomainId);
  }
  await db.delete(sites).where(eq(sites.id, siteId));
  invalidateSiteCache();
  revalidatePath("/", "layout");
  redirect("/");
}

/* ------------------------------ versions -------------------------------- */

export async function uploadVersion(_prev: ActionState, form: FormData): Promise<ActionState> {
  const admin = await requireAdmin();
  const siteId = String(form.get("siteId"));
  const label = String(form.get("label") ?? "").trim() || null;
  const publish = form.get("publish") === "on";
  const file = form.get("zip");

  if (!(file instanceof File) || file.size === 0) return { error: "Selecciona un archivo .zip." };
  if (file.size > env.maxZipBytes) {
    return { error: `El ZIP pesa ${(file.size / 1e6).toFixed(1)}MB, el límite es ${(env.maxZipBytes / 1e6).toFixed(0)}MB.` };
  }

  const [site] = await db.select().from(sites).where(eq(sites.id, siteId));
  if (!site) return { error: "El sitio no existe." };

  let extracted;
  try {
    extracted = extractZip(new Uint8Array(await file.arrayBuffer()), env.maxFiles);
  } catch (err) {
    return { error: err instanceof Error ? err.message : "No se pudo leer el ZIP." };
  }

  const [version] = await db.insert(siteVersions).values({
    siteId, label, storagePrefix: "pending", uploadedBy: admin.email,
    fileCount: extracted.files.length, totalBytes: extracted.totalBytes,
  }).returning();

  const prefix = storagePrefix(siteId, version.id);
  await db.update(siteVersions).set({ storagePrefix: prefix }).where(eq(siteVersions.id, version.id));

  try {
    await uploadVersionFiles(prefix, extracted.files);
  } catch (err) {
    await db.delete(siteVersions).where(eq(siteVersions.id, version.id));
    return { error: err instanceof Error ? err.message : "Falló la subida a Storage." };
  }

  await db.insert(siteFiles).values(
    extracted.files.map((f) => ({
      versionId: version.id,
      path: f.path,
      contentType: f.contentType,
      size: f.bytes.byteLength,
      etag: etagFor(f.bytes),
    })),
  );

  if (publish || !site.activeVersionId) {
    await db.update(sites).set({
      activeVersionId: version.id,
      status: site.status === "draft" ? "live" : site.status,
      updatedAt: new Date(),
    }).where(eq(sites.id, siteId));
  }

  await refreshSite(siteId);

  const notes = [
    `${extracted.files.length} archivos subidos (${(extracted.totalBytes / 1e6).toFixed(2)}MB).`,
    extracted.strippedRoot ? `Se quitó la carpeta raíz "${extracted.strippedRoot}".` : "",
    extracted.skipped.length ? `${extracted.skipped.length} archivos ignorados.` : "",
  ].filter(Boolean);

  return { ok: true, message: notes.join(" ") };
}

export async function activateVersion(siteId: string, versionId: string) {
  await requireAdmin();
  await db.update(sites).set({ activeVersionId: versionId, updatedAt: new Date() }).where(eq(sites.id, siteId));
  await refreshSite(siteId);
}

export async function deleteVersion(siteId: string, versionId: string) {
  await requireAdmin();
  const [site] = await db.select().from(sites).where(eq(sites.id, siteId));
  if (site?.activeVersionId === versionId) return;

  const [version] = await db.select().from(siteVersions).where(eq(siteVersions.id, versionId));
  if (!version) return;

  const files = await db.select({ path: siteFiles.path }).from(siteFiles).where(eq(siteFiles.versionId, versionId));
  await removePrefix(version.storagePrefix, files.map((f) => f.path));
  cacheClear(`${versionId}/`);
  await db.delete(siteVersions).where(eq(siteVersions.id, versionId));
  await refreshSite(siteId);
}

/* ------------------------------ settings -------------------------------- */

function settingsFromForm(form: FormData) {
  const socials: Record<string, string> = {};
  for (const key of SOCIAL_KEYS) {
    const v = String(form.get(`social_${key}`) ?? "").trim();
    if (v) socials[key] = v;
  }
  return {
    brandName: String(form.get("brandName") ?? "").trim() || null,
    email: String(form.get("email") ?? "").trim() || null,
    phone: String(form.get("phone") ?? "").trim() || null,
    whatsapp: String(form.get("whatsapp") ?? "").trim() || null,
    address: String(form.get("address") ?? "").trim() || null,
    socials,
    formRecipients: parseList(form.get("formRecipients")),
    formSubject: String(form.get("formSubject") ?? "").trim() || null,
    custom: parseKeyValues(form.get("custom")),
    updatedAt: new Date(),
  };
}

export async function saveSiteSettings(_prev: ActionState, form: FormData): Promise<ActionState> {
  await requireAdmin();
  const siteId = String(form.get("siteId"));
  const values = settingsFromForm(form);

  await db.insert(siteSettings).values({ siteId, ...values })
    .onConflictDoUpdate({ target: siteSettings.siteId, set: values });

  await refreshSite(siteId);
  return { ok: true, message: "Datos de contacto guardados. Ya se ven en la landing." };
}

export async function saveGlobalSettings(_prev: ActionState, form: FormData): Promise<ActionState> {
  await requireAdmin();
  const values = settingsFromForm(form);

  await db.insert(globalSettings).values({ id: "default", ...values })
    .onConflictDoUpdate({ target: globalSettings.id, set: values });

  invalidateSiteCache();
  revalidatePath("/", "layout");
  return { ok: true, message: "Valores globales guardados." };
}

export async function sendTestMail(_prev: ActionState, form: FormData): Promise<ActionState> {
  await requireAdmin();
  const to = parseList(form.get("to"));
  const siteName = String(form.get("siteName") ?? "Hirata Labs");
  if (to.length === 0) return { error: "Escribe al menos un correo destino." };

  const res = await sendTestEmail(to, siteName);
  return res.ok
    ? { ok: true, message: `Correo de prueba enviado a ${to.join(", ")}.` }
    : { error: res.error ?? "No se pudo enviar." };
}

/* ------------------------------- domains -------------------------------- */

export async function addDomain(_prev: ActionState, form: FormData): Promise<ActionState> {
  await requireAdmin();
  const siteId = String(form.get("siteId"));
  const hostname = String(form.get("hostname") ?? "")
    .trim().toLowerCase().replace(/^https?:\/\//, "").replace(/\/.*$/, "").replace(/\.$/, "");

  if (!/^[a-z0-9.-]+\.[a-z]{2,}$/.test(hostname)) return { error: "Escribe un dominio válido, ej. cliente.com" };
  if (hostname.endsWith(env.rootDomain)) {
    return { error: `Los subdominios de ${env.rootDomain} se manejan con el slug del sitio, no aquí.` };
  }

  const [taken] = await db.select().from(domains).where(eq(domains.hostname, hostname));
  if (taken) return { error: "Ese dominio ya está registrado." };

  let renderDomainId: string | null = null;
  let status: "pending" | "verified" = "pending";
  let warning = "";

  if (renderConfigured()) {
    try {
      const created = await createCustomDomain(hostname);
      renderDomainId = created?.id ?? null;
      if (created?.verificationStatus === "verified") status = "verified";
    } catch (err) {
      warning = ` Aviso de Render: ${err instanceof Error ? err.message : "error desconocido"}`;
    }
  } else {
    warning = " RENDER_API_KEY no está configurada: agrega el dominio manualmente en Render.";
  }

  await db.insert(domains).values({ siteId, hostname, renderDomainId, status });
  await refreshSite(siteId);

  return { ok: true, message: `Dominio agregado.${warning} Falta que el cliente cree el registro DNS.` };
}

export async function refreshDomain(siteId: string, domainId: string) {
  await requireAdmin();
  const [row] = await db.select().from(domains).where(and(eq(domains.id, domainId), eq(domains.siteId, siteId)));
  if (!row) return;

  const remote = await getCustomDomain(row.renderDomainId ?? row.hostname);
  await db.update(domains).set({
    status: remote?.verificationStatus === "verified" ? "verified" : row.status === "verified" ? "verified" : "pending",
    renderDomainId: remote?.id ?? row.renderDomainId,
    lastCheckedAt: new Date(),
  }).where(eq(domains.id, domainId));

  await refreshSite(siteId);
}

/** Escape hatch when DNS is fine but Render's status has not caught up. */
export async function forceVerifyDomain(siteId: string, domainId: string) {
  await requireAdmin();
  await db.update(domains).set({ status: "verified", lastCheckedAt: new Date() }).where(eq(domains.id, domainId));
  await refreshSite(siteId);
}

export async function removeDomain(siteId: string, domainId: string) {
  await requireAdmin();
  const [row] = await db.select().from(domains).where(eq(domains.id, domainId));
  if (!row) return;
  if (row.renderDomainId) await deleteCustomDomain(row.renderDomainId);
  await db.delete(domains).where(eq(domains.id, domainId));
  invalidateSiteCache(row.hostname);
  await refreshSite(siteId);
}

export async function setPrimaryDomain(siteId: string, domainId: string) {
  await requireAdmin();
  await db.update(domains).set({ isPrimary: false }).where(eq(domains.siteId, siteId));
  await db.update(domains).set({ isPrimary: true }).where(eq(domains.id, domainId));
  await refreshSite(siteId);
}

/* ----------------------------- submissions ------------------------------ */

export async function deleteSubmission(siteId: string, id: string) {
  await requireAdmin();
  const { submissions } = await import("@/lib/db/schema");
  await db.delete(submissions).where(eq(submissions.id, id));
  revalidatePath(`/sites/${siteId}/submissions`);
}
