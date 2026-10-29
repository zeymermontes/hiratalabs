"use server";

import { revalidatePath } from "next/cache";
import { requireSiteAccess } from "@/lib/auth";
import { encryptionConfigured, encryptSecret, secretHint } from "@/lib/crypto";
import { setModuleConfig } from "@/lib/modules";
import { getMpConfig, getMpStoredConfig, MP_MODULE, mpWhoAmI, type MpStoredConfig } from "@/modules/orders/mercadopago";

export type ActionState = { ok?: boolean; error?: string; message?: string };

/**
 * Guarda las credenciales de Mercado Pago de la tienda. El access token se
 * cifra y nunca se vuelve a mostrar; vacío = conservar el que ya está.
 */
export async function saveMpCredentials(_prev: ActionState, form: FormData): Promise<ActionState> {
  const siteId = String(form.get("siteId"));
  const access = await requireSiteAccess(siteId, { manage: true });
  const current = await getMpStoredConfig(siteId);

  const publicKey = String(form.get("publicKey") ?? "").trim();
  const accessToken = String(form.get("accessToken") ?? "").trim();
  const webhookSecret = String(form.get("webhookSecret") ?? "").trim();
  const statementDescriptor = String(form.get("statementDescriptor") ?? "").trim().replace(/[^A-Za-z0-9 ]/g, "").slice(0, 22);

  if (!publicKey) return { error: "Falta la Public Key." };
  if (!/^(TEST-|APP_USR-)/.test(publicKey)) return { error: "La Public Key empieza con TEST- o APP_USR-." };
  if (!accessToken && !current.accessTokenEnc) return { error: "Falta el Access Token." };
  if (accessToken && !/^(TEST-|APP_USR-)/.test(accessToken)) return { error: "El Access Token empieza con TEST- o APP_USR-." };
  if (accessToken && !encryptionConfigured()) return { error: "La plataforma no tiene ENCRYPTION_KEY configurada; no se pueden guardar credenciales." };

  const next: MpStoredConfig = {
    publicKey,
    accessTokenEnc: accessToken ? encryptSecret(accessToken) : current.accessTokenEnc!,
    accessTokenHint: accessToken ? secretHint(accessToken) : current.accessTokenHint ?? "••••",
    mode: publicKey.startsWith("TEST-") ? "test" : "live",
    statementDescriptor: statementDescriptor || undefined,
    webhookSecret: webhookSecret || (form.get("clearWebhookSecret") === "on" ? undefined : current.webhookSecret),
  };
  if (accessToken && next.mode === "live" && accessToken.startsWith("TEST-")) {
    return { error: "La Public Key es de producción pero el Access Token es de pruebas. Usa el par de credenciales de la misma aplicación." };
  }
  if (accessToken && next.mode === "test" && accessToken.startsWith("APP_USR-")) {
    return { error: "La Public Key es de pruebas pero el Access Token es de producción. Usa el par de credenciales de la misma aplicación." };
  }

  await setModuleConfig(siteId, MP_MODULE, next as unknown as Record<string, unknown>, access.user.email);
  revalidatePath(`/sites/${siteId}/payments`);
  return { ok: true, message: next.mode === "live" ? "Credenciales guardadas. La tienda ya cobra en producción." : "Credenciales de prueba guardadas. Los pagos no son reales hasta que uses las de producción." };
}

/** "Probar conexión": consulta /users/me con el token guardado. */
export async function testMpConnection(siteId: string): Promise<ActionState> {
  await requireSiteAccess(siteId, { manage: true });
  const cfg = await getMpConfig(siteId);
  if (!cfg) return { error: "Primero guarda las credenciales." };
  try {
    const me = await mpWhoAmI(cfg.accessToken);
    const who = me.nickname || me.email || `usuario ${me.id}`;
    return { ok: true, message: `Conectado como ${who}${me.site_id ? ` (${me.site_id})` : ""} · modo ${cfg.mode === "live" ? "producción" : "pruebas"}.` };
  } catch (e) {
    return { error: `Mercado Pago rechazó el token: ${e instanceof Error ? e.message : "error desconocido"}.` };
  }
}

export async function clearMpCredentials(siteId: string): Promise<ActionState> {
  const access = await requireSiteAccess(siteId, { manage: true });
  await setModuleConfig(siteId, MP_MODULE, {}, access.user.email);
  revalidatePath(`/sites/${siteId}/payments`);
  return { ok: true, message: "Credenciales eliminadas." };
}
