/**
 * Estados de pedido: etiquetas y textos. Sin imports de servidor, porque lo
 * usan también componentes del navegador (formularios del panel y la tienda).
 */
import type { Order, OrderStatus } from "./schema";

export const ORDER_STATUSES: OrderStatus[] = ["pending", "paid", "in_production", "ready", "shipped", "delivered", "cancelled"];

export const ORDER_STATUS_LABEL: Record<OrderStatus, string> = {
  pending: "Pendiente de pago",
  paid: "Pagado",
  in_production: "En preparación",
  ready: "Listo para recoger",
  shipped: "En camino",
  delivered: "Entregado",
  cancelled: "Cancelado",
};

/** Lo que le decimos al cliente en cada estado. */
export const ORDER_STATUS_CUSTOMER_TEXT: Record<OrderStatus, string> = {
  pending: "Aún no recibimos tu pago. Puedes completarlo cuando quieras.",
  paid: "Recibimos tu pago. Estamos preparando tu pedido.",
  in_production: "Tu pedido está en preparación.",
  ready: "Tu pedido está listo. Pasa a recogerlo cuando gustes.",
  shipped: "Tu pedido va en camino.",
  delivered: "Tu pedido fue entregado. ¡Gracias por tu compra!",
  cancelled: "Este pedido fue cancelado.",
};

/** Clases del panel por estado (StatusPill no conoce estos estados). */
export const ORDER_STATUS_TONE: Record<OrderStatus, string> = {
  pending: "bg-amber-50 text-amber-700 ring-amber-200",
  paid: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  in_production: "bg-purple-tint text-purple-dark ring-purple/30",
  ready: "bg-cyan-tint text-neutral-800 ring-cyan/40",
  shipped: "bg-purple-tint text-purple-dark ring-purple/30",
  delivered: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  cancelled: "bg-red-50 text-red-700 ring-red-200",
};

export function isOrderStatus(v: unknown): v is OrderStatus {
  return typeof v === "string" && (ORDER_STATUSES as string[]).includes(v);
}

/** Folio legible: #12. */
export function orderRef(o: Pick<Order, "number">) {
  return `#${o.number}`;
}
