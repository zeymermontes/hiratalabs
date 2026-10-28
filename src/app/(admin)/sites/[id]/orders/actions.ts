"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { requireSiteAccess } from "@/lib/auth";
import { db } from "@/lib/db";
import { orders } from "@/lib/db/schema";
import { setModuleConfig } from "@/lib/modules";
import { resendConfirmation } from "@/modules/orders/emails";
import { isOrderStatus, setOrderStatus } from "@/modules/orders/orders";
import { normalizeShipping } from "@/modules/orders/shipping";

export type ActionState = { ok?: boolean; error?: string; message?: string };

/** Cambio de estado desde el panel, con nota y datos de rastreo. */
export async function updateOrderStatus(_prev: ActionState, form: FormData): Promise<ActionState> {
  const siteId = String(form.get("siteId"));
  const orderId = String(form.get("orderId"));
  const access = await requireSiteAccess(siteId);

  const status = form.get("status");
  if (!isOrderStatus(status)) return { error: "Estado desconocido." };
  const note = String(form.get("note") ?? "").trim().slice(0, 500);
  const trackingCarrier = String(form.get("trackingCarrier") ?? "").trim().slice(0, 80);
  const trackingNumber = String(form.get("trackingNumber") ?? "").trim().slice(0, 80);
  if (status === "shipped" && !trackingNumber) {
    return { error: "Para marcar \"En camino\" escribe el número de guía (así el cliente lo recibe en su correo)." };
  }

  const res = await setOrderStatus(siteId, orderId, {
    to: status, changedBy: access.user.email, note, trackingCarrier, trackingNumber,
  });
  if (!res) return { error: "El pedido no existe." };
  revalidatePath(`/sites/${siteId}/orders`);
  revalidatePath(`/sites/${siteId}/orders/${orderId}`);
  return { ok: true, message: res.changed ? "Estado actualizado. Se avisó al cliente por correo." : "Datos guardados." };
}

export async function saveOrderNotes(_prev: ActionState, form: FormData): Promise<ActionState> {
  const siteId = String(form.get("siteId"));
  const orderId = String(form.get("orderId"));
  await requireSiteAccess(siteId);
  const notes = String(form.get("notes") ?? "").trim().slice(0, 2000);
  const [row] = await db.select({ id: orders.id, siteId: orders.siteId }).from(orders).where(eq(orders.id, orderId));
  if (!row || row.siteId !== siteId) return { error: "El pedido no existe." };
  await db.update(orders).set({ notes: notes || null, updatedAt: new Date() }).where(eq(orders.id, orderId));
  revalidatePath(`/sites/${siteId}/orders/${orderId}`);
  return { ok: true, message: "Notas guardadas." };
}

export async function resendOrderEmail(siteId: string, orderId: string): Promise<ActionState> {
  await requireSiteAccess(siteId);
  await resendConfirmation(siteId, orderId);
  revalidatePath(`/sites/${siteId}/orders/${orderId}`);
  return { ok: true, message: "Correo reenviado." };
}

/** Ajustes de envío (módulo orders). */
export async function saveShippingSettings(_prev: ActionState, form: FormData): Promise<ActionState> {
  const siteId = String(form.get("siteId"));
  const access = await requireSiteAccess(siteId, { manage: true });

  const toCents = (v: FormDataEntryValue | null) => {
    const n = Number(String(v ?? "").replace(/[^0-9.]/g, ""));
    return Number.isFinite(n) ? Math.round(n * 100) : NaN;
  };
  const flatCents = toCents(form.get("flat"));
  if (!Number.isFinite(flatCents) || flatCents < 0) return { error: "El costo de envío debe ser un número." };
  const freeRaw = String(form.get("freeOver") ?? "").trim();
  const freeOverCents = freeRaw ? toCents(freeRaw) : null;
  if (freeOverCents !== null && (!Number.isFinite(freeOverCents) || freeOverCents <= 0)) return { error: "El mínimo para envío gratis debe ser un número mayor a cero." };

  const config = normalizeShipping({
    flatCents, freeOverCents,
    pickupEnabled: form.get("pickupEnabled") === "on",
    pickupNote: String(form.get("pickupNote") ?? "").trim().slice(0, 300),
    estimatedDays: String(form.get("estimatedDays") ?? "").trim().slice(0, 60),
  });
  await setModuleConfig(siteId, "orders", config, access.user.email);
  revalidatePath(`/sites/${siteId}/orders/settings`);
  return { ok: true, message: "Ajustes de envío guardados." };
}
