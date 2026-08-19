"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import {
  domains, siteFiles, siteSettings, siteVersions, sites,
} from "@/lib/db/schema";
import { env, RESERVED_SLUGS } from "@/lib/env";
import { cacheClear } from "@/lib/filecache";
import { sendTestEmail } from "@/lib/mailer";
import { createCustomDomain, deleteCustomDomain, getCustomDomain, renderConfigured } from "@/lib/render";
import { SOCIAL_KEYS, safeUrl } from "@/lib/settings";
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

/**
 * Applies a landing.json to the site's chat settings. Only fills what is still
 * empty: whatever the admin already configured wins, and the chat is never
 * switched on from a ZIP, since each conversation costs money.
 */
async function applyManifest(siteId: string, raw: string): Promise<string> {
  const { parseManifest, describeApplied } = await import("@/lib/landing-manifest");
  const { siteChat } = await import("@/lib/db/schema");

  const { manifest, error } = parseManifest(raw);
  if (error) return error;
  const chat = manifest?.chat;
  if (!chat) return "";

  const [current] = await db.select().from(siteChat).where(eq(siteChat.siteId, siteId));

  const applied: string[] = [];
  const skipped: string[] = [];
  const values: Record<string, unknown> = {};

  const fill = (label: string, incoming: unknown, existing: unknown, column: string) => {
    if (incoming === undefined) return;
    const isEmpty =
      existing === null || existing === undefined || existing === "" ||
      (Array.isArray(existing) && existing.length === 0);
    if (isEmpty) {
      values[column] = incoming;
      applied.push(label);
    } else {
      skipped.push(label);
    }
  };

  fill("el texto del botón", chat.launcherLabel, current?.launcherLabel, "launcherLabel");
  fill("el mensaje de bienvenida", chat.welcome, current?.welcome, "welcome");
  fill("las opciones de la primera pregunta", chat.serviceOptions, current?.serviceOptions, "serviceOptions");
  fill("los colores del chat", chat.theme, current?.theme, "theme");
  fill(
    "el contexto del negocio",
    chat.scope ? JSON.stringify(chat.scope, null, 2) : undefined,
    current?.businessContext,
    "businessContext",
  );

  // replacesForm solo aplica al crear la configuración: no pisa una decisión previa.
  if (chat.replacesForm !== undefined && !current) {
    values.replacesForm = chat.replacesForm;
    applied.push("si el chat reemplaza el formulario");
  }

  if (Object.keys(values).length === 0) {
    return skipped.length ? describeApplied([], skipped) : "";
  }

  values.updatedAt = new Date();
  await db.insert(siteChat).values({ siteId, ...values })
    .onConflictDoUpdate({ target: siteChat.siteId, set: values });

  return describeApplied(applied, skipped);
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
    showPoweredBy: form.get("showPoweredBy") === "on",
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

  const manifestNote = extracted.manifestJson
    ? await applyManifest(siteId, extracted.manifestJson)
    : "";

  await refreshSite(siteId);

  const notes = [
    `${extracted.files.length} archivos subidos (${(extracted.totalBytes / 1e6).toFixed(2)}MB).`,
    extracted.strippedRoot ? `Se quitó la carpeta raíz "${extracted.strippedRoot}".` : "",
    extracted.skipped.length ? `${extracted.skipped.length} archivos ignorados.` : "",
    manifestNote,
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
    mapsUrl: safeUrl(String(form.get("mapsUrl") ?? "")) || null,
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

/* --------------------------- AI chat + keys ----------------------------- */

export async function addAiKey(_prev: ActionState, form: FormData): Promise<ActionState> {
  await requireAdmin();
  const { encryptSecret, encryptionConfigured, secretHint } = await import("@/lib/crypto");
  const { aiKeys } = await import("@/lib/db/schema");

  if (!encryptionConfigured()) {
    return { error: "Falta ENCRYPTION_KEY (mínimo 32 caracteres) para poder guardar llaves." };
  }

  const provider = String(form.get("provider") ?? "") as "anthropic" | "openai" | "google" | "groq" | "deepseek";
  const label = String(form.get("label") ?? "").trim() || "Sin nombre";
  const secret = String(form.get("secret") ?? "").trim();

  if (!["anthropic", "openai", "google", "groq", "deepseek"].includes(provider)) return { error: "Proveedor inválido." };
  if (secret.length < 12) return { error: "Esa llave se ve incompleta." };

  const existing = await db.select().from(aiKeys).where(eq(aiKeys.provider, provider));
  await db.insert(aiKeys).values({
    provider, label,
    secret: encryptSecret(secret),
    hint: secretHint(secret),
    isDefault: existing.length === 0,
  });

  revalidatePath("/ai");
  return { ok: true, message: "Llave guardada, cifrada." };
}

export async function deleteAiKey(id: string) {
  await requireAdmin();
  const { aiKeys } = await import("@/lib/db/schema");
  await db.delete(aiKeys).where(eq(aiKeys.id, id));
  revalidatePath("/ai");
}

export async function setDefaultAiKey(id: string, provider: string) {
  await requireAdmin();
  const { aiKeys } = await import("@/lib/db/schema");
  await db.update(aiKeys).set({ isDefault: false })
    .where(eq(aiKeys.provider, provider as "anthropic" | "openai" | "google" | "groq" | "deepseek"));
  await db.update(aiKeys).set({ isDefault: true }).where(eq(aiKeys.id, id));
  revalidatePath("/ai");
}

export async function saveSiteChat(_prev: ActionState, form: FormData): Promise<ActionState> {
  await requireAdmin();
  const { encryptSecret, encryptionConfigured, secretHint } = await import("@/lib/crypto");
  const { aiKeys, siteChat } = await import("@/lib/db/schema");

  const siteId = String(form.get("siteId"));
  const enabled = form.get("enabled") === "on";
  const keyMode = (String(form.get("keyMode") ?? "platform") === "own" ? "own" : "platform") as "platform" | "own";
  const provider = String(form.get("provider") ?? "anthropic") as "anthropic" | "openai" | "google" | "groq" | "deepseek";
  const model = String(form.get("model") ?? "").trim() || null;
  const newSecret = String(form.get("ownSecret") ?? "").trim();

  const serviceOptions = String(form.get("serviceOptions") ?? "")
    .split("\n").map((s) => s.trim()).filter(Boolean).slice(0, 8);

  const values = {
    enabled,
    replacesForm: form.get("replacesForm") === "on",
    keyMode,
    provider,
    model,
    launcherLabel: String(form.get("launcherLabel") ?? "").trim() || null,
    welcome: String(form.get("welcome") ?? "").trim() || null,
    businessContext: String(form.get("businessContext") ?? "").trim() || null,
    serviceOptions,
    monthlyLimit: Math.max(0, Number(form.get("monthlyLimit") ?? 500) || 0),
    updatedAt: new Date(),
  };

  const [current] = await db.select().from(siteChat).where(eq(siteChat.siteId, siteId));

  // The stored key is only replaced when a new one is typed in.
  let ownSecret = current?.ownSecret ?? null;
  let ownHint = current?.ownHint ?? null;
  if (newSecret) {
    if (!encryptionConfigured()) {
      return { error: "Falta ENCRYPTION_KEY (mínimo 32 caracteres) para poder guardar llaves." };
    }
    ownSecret = encryptSecret(newSecret);
    ownHint = secretHint(newSecret);
  }

  if (enabled) {
    if (keyMode === "own" && !ownSecret) {
      return { error: "Elegiste usar la llave del cliente pero no capturaste ninguna." };
    }
    if (keyMode === "platform") {
      const rows = await db.select().from(aiKeys).where(eq(aiKeys.provider, provider));
      if (rows.length === 0) {
        return { error: `No hay ninguna llave de plataforma para ese proveedor. Agrégala en "Llaves de IA".` };
      }
    }
    const { aiModels } = await import("@/lib/db/schema");
    const catalogue = await db.select().from(aiModels).where(eq(aiModels.provider, provider));
    if (catalogue.length === 0) {
      return { error: `Ese proveedor no tiene modelos dados de alta. Agrégalos en "Llaves de IA".` };
    }
    if (!model && !catalogue.some((m) => m.isDefault)) {
      return { error: "Ese proveedor no tiene modelo predeterminado. Elige uno para este sitio." };
    }
  }

  const row = { siteId, ...values, ownSecret, ownHint };
  await db.insert(siteChat).values(row)
    .onConflictDoUpdate({ target: siteChat.siteId, set: { ...values, ownSecret, ownHint } });

  await refreshSite(siteId);
  return { ok: true, message: enabled ? "Chat activado y guardado." : "Guardado. El chat está apagado." };
}

/* ------------------------ AI model catalogue ---------------------------- */

export async function addAiModel(_prev: ActionState, form: FormData): Promise<ActionState> {
  await requireAdmin();
  const { aiModels } = await import("@/lib/db/schema");
  const { toMicros } = await import("@/lib/ai/pricing");

  const provider = String(form.get("provider") ?? "") as
    "anthropic" | "openai" | "google" | "groq" | "deepseek";
  const model = String(form.get("model") ?? "").trim();
  const label = String(form.get("label") ?? "").trim() || null;
  const inputPrice = Number(form.get("inputPrice") ?? 0);
  const outputPrice = Number(form.get("outputPrice") ?? 0);
  const makeDefault = form.get("isDefault") === "on";

  if (!model) return { error: "Escribe el identificador exacto del modelo." };
  if (inputPrice < 0 || outputPrice < 0) return { error: "Los precios no pueden ser negativos." };

  const existing = await db.select().from(aiModels).where(eq(aiModels.provider, provider));
  if (existing.some((m) => m.model === model)) {
    return { error: "Ese modelo ya está en la lista." };
  }

  // The first model of a provider becomes its default whether or not it is asked for.
  const isDefault = makeDefault || existing.length === 0;
  if (isDefault) {
    await db.update(aiModels).set({ isDefault: false }).where(eq(aiModels.provider, provider));
  }

  await db.insert(aiModels).values({
    provider, model, label,
    inputPriceMicros: toMicros(inputPrice),
    outputPriceMicros: toMicros(outputPrice),
    isDefault,
  });

  revalidatePath("/ai");
  revalidatePath("/usage");
  return { ok: true, message: "Modelo agregado." };
}

export async function updateAiModelPrice(_prev: ActionState, form: FormData): Promise<ActionState> {
  await requireAdmin();
  const { aiModels } = await import("@/lib/db/schema");
  const { toMicros } = await import("@/lib/ai/pricing");

  const id = String(form.get("id"));
  await db.update(aiModels).set({
    inputPriceMicros: toMicros(Number(form.get("inputPrice") ?? 0)),
    outputPriceMicros: toMicros(Number(form.get("outputPrice") ?? 0)),
  }).where(eq(aiModels.id, id));

  revalidatePath("/ai");
  revalidatePath("/usage");
  return { ok: true, message: "Precio actualizado." };
}

export async function setDefaultAiModel(id: string, provider: string) {
  await requireAdmin();
  const { aiModels } = await import("@/lib/db/schema");
  await db.update(aiModels).set({ isDefault: false })
    .where(eq(aiModels.provider, provider as "anthropic" | "openai" | "google" | "groq" | "deepseek"));
  await db.update(aiModels).set({ isDefault: true }).where(eq(aiModels.id, id));
  invalidateSiteCache();
  revalidatePath("/ai");
}

export async function deleteAiModel(id: string) {
  await requireAdmin();
  const { aiModels } = await import("@/lib/db/schema");
  await db.delete(aiModels).where(eq(aiModels.id, id));
  revalidatePath("/ai");
  revalidatePath("/usage");
}

/**
 * Reads the model list straight from the provider using the stored platform key.
 * Beats typing ids from memory: what comes back is what the account can call.
 */
export async function listProviderModels(
  provider: "anthropic" | "openai" | "google" | "groq" | "deepseek",
): Promise<{ models?: string[]; error?: string }> {
  await requireAdmin();
  const { aiKeys } = await import("@/lib/db/schema");
  const { decryptSecret } = await import("@/lib/crypto");
  const { listModels } = await import("@/lib/ai/providers");

  const rows = await db.select().from(aiKeys).where(eq(aiKeys.provider, provider));
  const chosen = rows.find((r) => r.isDefault) ?? rows[0];
  if (!chosen) return { error: "Agrega primero una llave de ese proveedor." };

  try {
    const models = await listModels(provider, decryptSecret(chosen.secret));
    if (models.length === 0) return { error: "El proveedor no devolvió modelos." };
    return { models: models.sort() };
  } catch (err) {
    return { error: err instanceof Error ? err.message.slice(0, 200) : "No se pudo consultar." };
  }
}
