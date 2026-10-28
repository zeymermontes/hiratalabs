import { createHmac, timingSafeEqual } from "node:crypto";
import { decryptSecret } from "@/lib/crypto";
import { getModuleConfig } from "@/lib/modules";

/**
 * Mercado Pago (Checkout API / Bricks) sin SDK: llamadas directas a la API con
 * las credenciales de CADA tienda. Las credenciales viven cifradas en
 * site_modules.config del módulo `payments_mercadopago`.
 */
export const MP_MODULE = "payments_mercadopago";
const MP_API = "https://api.mercadopago.com";

export type MpStoredConfig = {
  publicKey: string;
  /** Access token cifrado con encryptSecret. */
  accessTokenEnc: string;
  accessTokenHint: string;
  mode: "test" | "live";
  statementDescriptor?: string;
  /** Clave secreta del webhook (panel de MP → Webhooks). Opcional pero recomendada. */
  webhookSecret?: string;
};

export type MpConfig = {
  publicKey: string;
  accessToken: string;
  accessTokenHint: string;
  mode: "test" | "live";
  statementDescriptor: string | null;
  webhookSecret: string | null;
};

export async function getMpStoredConfig(siteId: string): Promise<Partial<MpStoredConfig>> {
  return getModuleConfig<Partial<MpStoredConfig>>(siteId, MP_MODULE);
}

/** Credenciales listas para usar, o null si la tienda no las ha capturado. */
export async function getMpConfig(siteId: string): Promise<MpConfig | null> {
  const raw = await getMpStoredConfig(siteId);
  if (!raw.publicKey || !raw.accessTokenEnc) return null;
  let accessToken: string;
  try {
    accessToken = decryptSecret(raw.accessTokenEnc);
  } catch {
    return null;
  }
  return {
    publicKey: raw.publicKey,
    accessToken,
    accessTokenHint: raw.accessTokenHint ?? "••••",
    mode: raw.mode === "live" ? "live" : "test",
    statementDescriptor: raw.statementDescriptor?.trim() || null,
    webhookSecret: raw.webhookSecret?.trim() || null,
  };
}

/* ------------------------------- API ------------------------------- */

export class MpError extends Error {
  status: number;
  code: string | null;
  constructor(message: string, status: number, code: string | null = null) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

async function mpFetch<T>(token: string, path: string, init: RequestInit & { idempotencyKey?: string } = {}): Promise<T> {
  const headers: Record<string, string> = {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  };
  if (init.idempotencyKey) headers["X-Idempotency-Key"] = init.idempotencyKey;
  const res = await fetch(`${MP_API}${path}`, { ...init, headers, cache: "no-store", signal: AbortSignal.timeout(15_000) });
  const text = await res.text();
  let json: unknown = null;
  try { json = text ? JSON.parse(text) : null; } catch { json = null; }
  if (!res.ok) {
    const body = (json ?? {}) as { message?: string; error?: string; cause?: { description?: string; code?: string | number }[] };
    const cause = body.cause?.[0];
    throw new MpError(cause?.description ?? body.message ?? body.error ?? `Mercado Pago respondió ${res.status}`, res.status, body.error ?? (cause?.code != null ? String(cause.code) : null));
  }
  return json as T;
}

export type MpPayment = {
  id: number | string;
  status: string;
  status_detail?: string;
  external_reference?: string;
  payment_method_id?: string;
  payment_type_id?: string;
  date_of_expiration?: string | null;
  transaction_amount?: number;
  point_of_interaction?: { transaction_data?: { ticket_url?: string; barcode?: { content?: string } } };
  transaction_details?: { external_resource_url?: string };
};

export async function mpCreatePayment(token: string, body: Record<string, unknown>, idempotencyKey: string): Promise<MpPayment> {
  return mpFetch<MpPayment>(token, "/v1/payments", { method: "POST", body: JSON.stringify(body), idempotencyKey });
}

export async function mpGetPayment(token: string, id: string): Promise<MpPayment> {
  return mpFetch<MpPayment>(token, `/v1/payments/${encodeURIComponent(id)}`, { method: "GET" });
}

/** "Probar conexión": quién es el dueño del token y si es de pruebas o producción. */
export async function mpWhoAmI(token: string): Promise<{ id: number; nickname?: string; email?: string; site_id?: string }> {
  return mpFetch(token, "/users/me", { method: "GET" });
}

/* ----------------------------- comprobantes ----------------------------- */

export type PendingVoucher = {
  ticketUrl: string | null;
  barcodeContent: string | null;
  expirationDate: string | null;
  paymentMethodId: string | null;
};

/** Ficha de OXXO / datos de SPEI de un pago que sigue pendiente y no ha vencido. */
export async function getPendingVoucher(token: string, paymentId: string | null): Promise<PendingVoucher | null> {
  if (!paymentId) return null;
  try {
    const p = await mpGetPayment(token, paymentId);
    if (p.status !== "pending" && p.status !== "in_process") return null;
    const ticketUrl = p.point_of_interaction?.transaction_data?.ticket_url ?? p.transaction_details?.external_resource_url ?? null;
    const barcodeContent = p.point_of_interaction?.transaction_data?.barcode?.content ?? null;
    if (!ticketUrl && !barcodeContent) return null;
    const expirationDate = p.date_of_expiration ?? null;
    if (expirationDate && new Date(expirationDate) < new Date()) return null;
    return { ticketUrl, barcodeContent, expirationDate, paymentMethodId: p.payment_method_id ?? null };
  } catch {
    return null;
  }
}

export function isBankTransfer(methodId: string | null | undefined) {
  return methodId === "spei" || methodId === "bank_transfer" || methodId === "pse" || methodId === "clabe";
}

/* ------------------------- mensajes para el cliente ------------------------ */

const STATUS_DETAIL_MESSAGES: Record<string, string> = {
  accredited: "Tu pago fue aprobado.",
  pending_contingency: "Estamos procesando tu pago. Te avisamos por correo en cuanto se confirme.",
  pending_review_manual: "Tu pago está en revisión. Te avisamos por correo en cuanto se confirme.",
  pending_waiting_payment: "Tu pedido queda apartado mientras completas el pago.",
  pending_waiting_transfer: "Tu pedido queda apartado mientras completas la transferencia.",
  cc_rejected_bad_filled_security_code: "El código de seguridad es incorrecto.",
  cc_rejected_bad_filled_date: "La fecha de vencimiento es incorrecta.",
  cc_rejected_bad_filled_card_number: "El número de tarjeta es incorrecto.",
  cc_rejected_bad_filled_other: "Revisa los datos de la tarjeta.",
  cc_rejected_insufficient_amount: "Tu tarjeta no tiene fondos suficientes.",
  cc_rejected_call_for_authorize: "Llama a tu banco para autorizar el monto.",
  cc_rejected_max_attempts: "Alcanzaste el límite de intentos. Usa otra tarjeta.",
  cc_rejected_duplicated_payment: "Ya hay un pago igual. Revisa antes de volver a intentar.",
  cc_rejected_card_disabled: "La tarjeta está inactiva. Llama a tu banco para activarla.",
  cc_rejected_high_risk: "El banco no autorizó el pago. Prueba con otra tarjeta o contáctalo.",
  cc_rejected_blacklist: "No pudimos procesar el pago con esta tarjeta.",
  cc_rejected_invalid_installments: "Esa cantidad de mensualidades no está disponible.",
  cc_rejected_other_reason: "El banco rechazó el pago. Prueba con otra tarjeta.",
};

export function paymentMessage(status: string | null | undefined, detail: string | null | undefined): string {
  if (detail && STATUS_DETAIL_MESSAGES[detail]) return STATUS_DETAIL_MESSAGES[detail];
  if (status === "approved") return "Tu pago fue aprobado.";
  if (status === "pending" || status === "in_process") return "Estamos confirmando tu pago.";
  if (status === "rejected") return "El pago no fue aprobado. Intenta con otro método.";
  return "No pudimos confirmar tu pago.";
}

/* -------------------------------- webhook ------------------------------- */

/**
 * Firma del header x-signature: `ts=<timestamp>,v1=<hmac>` sobre el manifiesto
 * `id:<data.id>;request-id:<x-request-id>;ts:<ts>;` con la clave secreta.
 */
export function verifyWebhookSignature(header: string | null, requestId: string, dataId: string, secret: string): boolean {
  if (!header) return false;
  const parts: Record<string, string> = {};
  for (const kv of header.split(",")) {
    const i = kv.indexOf("=");
    if (i > 0) parts[kv.slice(0, i).trim()] = kv.slice(i + 1).trim();
  }
  const { ts, v1 } = parts;
  if (!ts || !v1) return false;
  const manifest = `id:${dataId};request-id:${requestId};ts:${ts};`;
  const expected = createHmac("sha256", secret).update(manifest).digest("hex");
  if (expected.length !== v1.length) return false;
  try {
    return timingSafeEqual(Buffer.from(expected, "hex"), Buffer.from(v1, "hex"));
  } catch {
    return false;
  }
}

/** URL que la tienda registra en el panel de Mercado Pago. */
export function webhookUrlFor(host: string) {
  return `https://${host}/api/store/webhooks/mercadopago`;
}
