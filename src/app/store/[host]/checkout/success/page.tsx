import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { formatMXN, getStorefront } from "@/lib/storefront";
import { SfPageHead, SfRow, SfStatusChip, sfPanel, toneFor } from "@/components/storefront/checkout-ui";
import { requireOrderAccess } from "@/modules/orders/access";
import { getMpConfig, isBankTransfer, mpGetPayment, paymentMessage } from "@/modules/orders/mercadopago";
import { ORDER_STATUS_LABEL, applyPaymentResult, orderRef } from "@/modules/orders/orders";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Pedido" };

type Props = { params: Promise<{ host: string }>; searchParams: Promise<{ o?: string; p?: string }> };

/**
 * Después de pagar. Si viene un id de pago se consulta directo en Mercado Pago
 * (no se confía en la URL) y se actualiza el pedido por si el webhook no ha
 * llegado. También sirve como "estado de mi pedido" para compras de invitado.
 */
export default async function SuccessPage({ params, searchParams }: Props) {
  const { host } = await params;
  const { o, p } = await searchParams;
  const ctx = await getStorefront(host);
  if (!ctx) return null;
  if (!ctx.modules.has("orders")) notFound();
  if (!o) redirect("/");

  const detail = await requireOrderAccess(ctx, o, `/checkout/success?o=${o}`);
  const { items } = detail;
  let order = detail.order;

  let ticketUrl: string | null = null;
  let barcode: string | null = null;
  let methodId: string | null = null;
  let expires: string | null = null;
  const paymentId = p || order.paymentId;
  const mp = ctx.modules.has("payments_mercadopago") ? await getMpConfig(ctx.site.id) : null;
  if (mp && paymentId && order.status === "pending") {
    try {
      const payment = await mpGetPayment(mp.accessToken, paymentId);
      if (payment.external_reference === order.id) {
        const res = await applyPaymentResult(ctx.site.id, order.id, payment, "success");
        if (res) order = res.order;
        ticketUrl = payment.point_of_interaction?.transaction_data?.ticket_url ?? payment.transaction_details?.external_resource_url ?? null;
        barcode = payment.point_of_interaction?.transaction_data?.barcode?.content ?? null;
        methodId = payment.payment_method_id ?? null;
        expires = payment.date_of_expiration ?? null;
      }
    } catch (e) {
      console.error("[checkout/success] no se pudo verificar el pago:", e);
    }
  }

  const paid = order.status !== "pending" && order.status !== "cancelled";
  const pendingPay = order.status === "pending";
  const voucher = pendingPay && Boolean(ticketUrl || barcode);
  const transfer = isBankTransfer(methodId);
  const rejected = pendingPay && order.paymentStatus === "rejected";

  const title = paid ? "¡Gracias por tu compra!"
    : voucher ? (transfer ? "Completa tu transferencia" : "Termina tu pago en efectivo")
    : rejected ? "No pudimos cobrar tu pago"
    : order.status === "cancelled" ? "Pedido cancelado"
    : "Estamos confirmando tu pago";

  const text = paid ? `Recibimos tu pago. Te enviamos la confirmación a ${order.email}.`
    : voucher ? "Tu pedido queda apartado mientras pagas. Confirmamos automáticamente al recibir el pago."
    : rejected ? paymentMessage(order.paymentStatus, order.paymentStatusDetail)
    : order.status === "cancelled" ? "Si crees que es un error, escríbenos."
    : "Mercado Pago sigue procesando el pago. Te avisamos por correo en cuanto se confirme.";

  return (
    <div className="sf-wrap sf-section" style={{ maxWidth: 680 }}>
      <SfPageHead eyebrow={`Pedido ${orderRef(order)}`} title={title}>{text}</SfPageHead>

      {voucher ? (
        <div style={{ ...sfPanel, borderColor: "var(--sf-primary)", marginBottom: 20 }}>
          {ticketUrl ? <a href={ticketUrl} target="_blank" rel="noopener noreferrer" className="sf-btn sf-btn-primary">{transfer ? "Ver datos de transferencia" : "Abrir comprobante de pago"}</a> : null}
          {barcode ? <code style={{ display: "block", wordBreak: "break-all", padding: "10px 12px", background: "var(--sf-muted)", borderRadius: "var(--sf-radius)", fontSize: 13 }}>{barcode}</code> : null}
          {expires ? <p className="sf-muted" style={{ margin: 0, fontSize: 13 }}>Vence: {new Date(expires).toLocaleString("es-MX", { dateStyle: "long", timeStyle: "short", timeZone: "America/Mexico_City" })}</p> : null}
          <p className="sf-muted" style={{ margin: 0, fontSize: 13 }}>Guarda el comprobante o tómale una captura.</p>
        </div>
      ) : null}

      <div style={{ ...sfPanel, marginBottom: 20 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10 }}>
          <strong>Estado</strong>
          <SfStatusChip label={ORDER_STATUS_LABEL[order.status]} tone={toneFor(order.status)} />
        </div>
        {items.map((i) => (
          <SfRow key={i.id} label={`${i.productName}${i.variantName ? ` · ${i.variantName}` : ""} × ${i.quantity}`} value={formatMXN(i.unitPriceCents * i.quantity)} />
        ))}
        <SfRow label={order.fulfillment === "pickup" ? "Recoger en tienda" : "Envío"} value={order.shippingCents === 0 ? "Gratis" : formatMXN(order.shippingCents)} />
        <div style={{ borderTop: "1px solid var(--sf-muted)", paddingTop: 10 }}>
          <SfRow label="Total" value={formatMXN(order.totalCents)} strong />
        </div>
        {order.fulfillment === "ship" && order.addressSnapshot ? (
          <p className="sf-muted" style={{ margin: 0, fontSize: 13 }}>
            Envío a: {order.addressSnapshot.recipient}, {order.addressSnapshot.street} {order.addressSnapshot.extNumber ?? ""}, {order.addressSnapshot.zip} {order.addressSnapshot.city}, {order.addressSnapshot.state}
          </p>
        ) : null}
      </div>

      <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
        {rejected || (pendingPay && !voucher) ? <Link href={`/checkout/pagar/${order.id}?nuevo=1`} className="sf-btn sf-btn-primary">{rejected ? "Intentar con otro método" : "Pagar ahora"}</Link> : null}
        {order.customerId ? <Link href={`/mi-cuenta/pedidos/${order.id}`} className="sf-btn sf-btn-outline">Ver en mi cuenta</Link> : null}
        <Link href="/productos" className="sf-btn sf-btn-ghost">Seguir comprando</Link>
      </div>
    </div>
  );
}
