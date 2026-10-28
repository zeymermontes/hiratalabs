"use server";

import { revalidatePath } from "next/cache";
import { PROVIDERS, type ProviderId } from "@/lib/ai/providers";
import { requireSiteAccess } from "@/lib/auth";
import { encryptSecret, encryptionConfigured, secretHint } from "@/lib/crypto";
import { getModuleConfig, isModuleEnabledById, setModuleConfig } from "@/lib/modules";
import { rateLimit } from "@/lib/ratelimit";
import {
  ASSIST_MODULE_KEY, AssistError, DEFAULT_MONTHLY_TOKENS, isAssistTask, runAssist,
  type AssistInput, type AssistTask,
} from "./assist";

export type AssistActionResult =
  | { ok: true; data: Record<string, unknown>; model: string; provider: string; tokens: number }
  | { ok: false; error: string; code?: string };

/**
 * Entrada única del asistente desde el panel. Cualquier miembro del sitio
 * (owner o staff) puede pedir textos; la cuota la pone el módulo.
 */
export async function assistAction(siteId: string, task: AssistTask, input: AssistInput): Promise<AssistActionResult> {
  const access = await requireSiteAccess(siteId);
  if (!isAssistTask(task)) return { ok: false, error: "Tarea desconocida.", code: "bad_task" };
  if (!(await isModuleEnabledById(siteId, ASSIST_MODULE_KEY))) {
    return { ok: false, error: "El Asistente de IA está apagado en este sitio. Actívalo en Módulos.", code: "module_off" };
  }
  // Por persona y por sitio: una ráfaga de clics no debe vaciar la cuota.
  if (!rateLimit(`assist:${siteId}:${access.user.id}`, 20, 60_000).ok) {
    return { ok: false, error: "Demasiadas peticiones seguidas. Espera un minuto.", code: "rate_limited" };
  }
  if (!rateLimit(`assist:${siteId}`, 60, 60_000).ok) {
    return { ok: false, error: "El sitio está haciendo muchas peticiones. Espera un minuto.", code: "rate_limited" };
  }

  try {
    const r = await runAssist(siteId, task, input ?? {}, { by: access.user.email });
    return { ok: true, data: r.data, model: r.model, provider: r.provider, tokens: r.inputTokens + r.outputTokens };
  } catch (err) {
    if (err instanceof AssistError) return { ok: false, error: err.message, code: err.code };
    console.error(`[assist] ${siteId}:`, err);
    return { ok: false, error: "No se pudo generar el texto. Intenta de nuevo.", code: "unknown" };
  }
}

export type ActionState = { ok?: boolean; error?: string; message?: string };

/** Ajustes del módulo (llave, modelo, cuota). Solo owner o super admin. */
export async function saveAssistSettings(_prev: ActionState, form: FormData): Promise<ActionState> {
  const siteId = String(form.get("siteId") ?? "");
  const access = await requireSiteAccess(siteId, { manage: true });

  const current = await getModuleConfig<Record<string, unknown>>(siteId, ASSIST_MODULE_KEY);
  const keyMode = String(form.get("keyMode") ?? "platform") === "own" ? "own" : "platform";
  const providerRaw = String(form.get("provider") ?? "").trim();
  const provider = (providerRaw in PROVIDERS ? providerRaw : "") as ProviderId | "";
  const model = String(form.get("model") ?? "").trim().slice(0, 120);
  const newSecret = String(form.get("ownSecret") ?? "").trim();
  const clearSecret = form.get("clearSecret") === "on";

  let ownSecretEnc = typeof current.ownSecretEnc === "string" ? current.ownSecretEnc : undefined;
  let ownHint = typeof current.ownHint === "string" ? current.ownHint : undefined;
  if (clearSecret) {
    ownSecretEnc = undefined;
    ownHint = undefined;
  }
  if (newSecret) {
    if (!encryptionConfigured()) {
      return { error: "Falta ENCRYPTION_KEY en el servidor (mínimo 32 caracteres); no se pueden guardar llaves." };
    }
    ownSecretEnc = encryptSecret(newSecret);
    ownHint = secretHint(newSecret);
  }

  if (keyMode === "own") {
    if (!provider) return { error: "Elige el proveedor de tu llave." };
    if (!ownSecretEnc) return { error: "Elegiste usar tu propia llave pero no capturaste ninguna." };
  }

  const next: Record<string, unknown> = {
    ...current,
    keyMode,
    provider: provider || undefined,
    model: model || undefined,
    ownSecretEnc,
    ownHint,
  };

  // La cuota solo la ajusta el super admin; el dueño no puede subírsela solo.
  if (access.isSuperAdmin && form.has("monthlyTokens")) {
    const q = Number(String(form.get("monthlyTokens") ?? "").replace(/[^\d]/g, ""));
    next.monthlyTokens = Number.isFinite(q) && q > 0 ? Math.floor(q) : DEFAULT_MONTHLY_TOKENS;
  }

  for (const k of Object.keys(next)) if (next[k] === undefined) delete next[k];

  await setModuleConfig(siteId, ASSIST_MODULE_KEY, next, access.user.email);
  revalidatePath(`/sites/${siteId}/ai`);
  return { ok: true, message: "Ajustes guardados." };
}
