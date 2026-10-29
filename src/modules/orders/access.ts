import { notFound, redirect } from "next/navigation";
import type { StorefrontContext } from "@/lib/storefront";
import { getCustomerSession } from "./customers";
import { loadOrder, type OrderDetail } from "./orders";

/**
 * Quién puede ver un pedido en la tienda: su dueño con sesión, o cualquiera
 * que tenga el enlace si fue compra de invitado (el id es un UUID aleatorio;
 * es el mismo nivel de acceso que el correo de confirmación).
 */
export async function requireOrderAccess(ctx: StorefrontContext, orderId: string, nextPath: string): Promise<OrderDetail> {
  const detail = await loadOrder(ctx.site.id, orderId);
  if (!detail) notFound();
  if (detail.order.customerId) {
    const session = ctx.modules.has("customers") ? await getCustomerSession(ctx.site.id) : null;
    if (!session) redirect(`/cuenta/login?next=${encodeURIComponent(nextPath)}`);
    if (session.customer.id !== detail.order.customerId) notFound();
  }
  return detail;
}
