import { and, asc, desc, eq, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  orderItems, orderStatusHistory, orders, productVariants, products,
  type Order, type OrderItem, type OrderStatus, type OrderStatusHistoryRow,
} from "@/lib/db/schema";
import type { MpPayment } from "./mercadopago";

export * from "./status";

export type OrderDetail = {
  order: Order;
  items: OrderItem[];
  history: OrderStatusHistoryRow[];
};

/** Un pedido de ESTA tienda con sus renglones e historial; null si no es de aquí. */
export async function loadOrder(siteId: string, orderId: string): Promise<OrderDetail | null> {
  if (!/^[0-9a-f-]{36}$/i.test(orderId)) return null;
  const [order] = await db.select().from(orders).where(and(eq(orders.id, orderId), eq(orders.siteId, siteId)));
  if (!order) return null;
  const [items, history] = await Promise.all([
    db.select().from(orderItems).where(eq(orderItems.orderId, order.id)),
    db.select().from(orderStatusHistory).where(eq(orderStatusHistory.orderId, order.id)).orderBy(asc(orderStatusHistory.createdAt)),
  ]);
  return { order, items, history };
}

/** Pedidos de un cliente, del más nuevo al más viejo. */
export async function listCustomerOrders(siteId: string, customerId: string) {
  return db.select().from(orders)
    .where(and(eq(orders.siteId, siteId), eq(orders.customerId, customerId)))
    .orderBy(desc(orders.createdAt)).limit(100);
}

/* ------------------------------ folio ------------------------------ */

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

/** Siguiente folio de la tienda. Se bloquea por tienda para que dos compras al mismo tiempo no choquen. */
export async function nextOrderNumber(tx: Tx, siteId: string): Promise<number> {
  await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${`orders:${siteId}`}))`);
  const [row] = await tx.select({ n: sql<number>`coalesce(max(${orders.number}), 0)::int` })
    .from(orders).where(eq(orders.siteId, siteId));
  return (row?.n ?? 0) + 1;
}

/* --------------------------- cambios de estado --------------------------- */

export async function recordStatusChange(orderId: string, from: OrderStatus | null, to: OrderStatus, changedBy: string, note?: string | null) {
  await db.insert(orderStatusHistory).values({ orderId, fromStatus: from, toStatus: to, changedBy, note: note?.trim() || null });
}

/** Devuelve existencias al catálogo cuando un pedido se cancela. */
export async function restoreStock(items: Pick<OrderItem, "productId" | "quantity">[], variantIds: (string | null)[] = []) {
  for (let i = 0; i < items.length; i++) {
    const it = items[i];
    if (!it.productId) continue;
    const variantId = variantIds[i] ?? null;
    if (variantId) {
      await db.update(productVariants).set({ stock: sql`${productVariants.stock} + ${it.quantity}` })
        .where(and(eq(productVariants.id, variantId), sql`${productVariants.stock} is not null`));
    }
    await db.update(products).set({ stock: sql`${products.stock} + ${it.quantity}` })
      .where(and(eq(products.id, it.productId), sql`${products.stock} is not null`));
  }
}

export type StatusChangeInput = {
  to: OrderStatus;
  changedBy: string;
  note?: string | null;
  trackingCarrier?: string | null;
  trackingNumber?: string | null;
  /** No mandar correo al cliente (p. ej. cambios internos). */
  silent?: boolean;
};

/**
 * Cambia el estado de un pedido, deja historial, repone inventario si se
 * cancela y avisa al cliente por correo. Si el estado no cambia, solo guarda
 * los datos de rastreo (si vinieron).
 */
export async function setOrderStatus(siteId: string, orderId: string, input: StatusChangeInput): Promise<{ order: Order; changed: boolean } | null> {
  const detail = await loadOrder(siteId, orderId);
  if (!detail) return null;
  const { order } = detail;
  const changed = order.status !== input.to;

  const patch: Partial<typeof orders.$inferInsert> = { updatedAt: new Date() };
  if (changed) patch.status = input.to;
  if (input.to === "paid" && !order.paidAt) patch.paidAt = new Date();
  if (input.trackingCarrier !== undefined) patch.trackingCarrier = input.trackingCarrier?.trim() || null;
  if (input.trackingNumber !== undefined) patch.trackingNumber = input.trackingNumber?.trim() || null;

  const [updated] = await db.update(orders).set(patch).where(eq(orders.id, order.id)).returning();

  if (changed) {
    await recordStatusChange(order.id, order.status, input.to, input.changedBy, input.note);
    if (input.to === "cancelled") {
      const meta = detail.items.map((i) => (i.meta?.variantId as string | undefined) ?? null);
      await restoreStock(detail.items, meta);
    }
    if (!input.silent) {
      const { notifyStatusChange } = await import("./emails");
      notifyStatusChange(siteId, order.id, input.to).catch((e) => console.error("[orders] status email failed:", e));
    }
  }
  return { order: updated, changed };
}

/* ------------------------------ pagos ------------------------------ */

/**
 * Registra en el pedido el resultado de un pago de Mercado Pago (desde el
 * checkout, el webhook o la página de éxito). Idempotente: si ya estaba en ese
 * estado no duplica historial ni correos.
 */
export async function applyPaymentResult(siteId: string, orderId: string, payment: MpPayment, source: "checkout" | "webhook" | "success") {
  const detail = await loadOrder(siteId, orderId);
  if (!detail) return null;
  const { order } = detail;

  await db.update(orders).set({
    paymentProvider: "mercadopago",
    paymentId: String(payment.id),
    paymentStatus: payment.status ?? "unknown",
    paymentStatusDetail: payment.status_detail ?? null,
    updatedAt: new Date(),
  }).where(eq(orders.id, order.id));

  const by = `mercadopago:${source}`;
  if (payment.status === "approved" && order.status === "pending") {
    const res = await setOrderStatus(siteId, order.id, { to: "paid", changedBy: by, silent: true });
    const { notifyOrderPaid } = await import("./emails");
    notifyOrderPaid(siteId, order.id).catch((e) => console.error("[orders] paid email failed:", e));
    return res;
  }
  // Ficha vencida o pago cancelado desde MP: el pedido se libera y vuelve el inventario.
  if ((payment.status === "cancelled" || payment.status === "expired") && order.status === "pending") {
    return setOrderStatus(siteId, order.id, { to: "cancelled", changedBy: by, note: "Pago cancelado o vencido en Mercado Pago." });
  }
  const [fresh] = await db.select().from(orders).where(eq(orders.id, order.id));
  return { order: fresh, changed: false };
}
