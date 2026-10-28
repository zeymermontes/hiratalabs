import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { formatMXN, getStorefront } from "@/lib/storefront";
import { SfAlert, SfPageHead, SfRow, sfPanel } from "@/components/storefront/checkout-ui";
import { MpBrick } from "@/components/storefront/mp-brick";
import { requireOrderAccess } from "@/modules/orders/access";
import { getMpConfig, getPendingVoucher, isBankTransfer, paymentMessage } from "@/modules/orders/mercadopago";
import { orderRef } from "@/modules/orders/orders";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Pagar" };

type Props = { params: Promise<{ host: string; orderId: string }>; searchParams: Promise<{ nuevo?: string }> };

export default async function PayPage({ params, searchParams }: Props) {
  const { host, orderId } = await params;
  const { nuevo } = await searchParams;
  const ctx = await getStorefront(host);
  if (!ctx) return null;
  if (!ctx.modules.has("orders")) notFound();

  const { order, items } = await requireOrderAccess(ctx, orderId, `/checkout/pagar/${orderId}`);
  if (order.status !== "pending") redirect(`/checkout/success?o=${order.id}`);

  const mp = ctx.modules.has("payments_mercadopago") ? await getMpConfig(ctx.site.id) : null;
  const voucher = mp && !nuevo ? await getPendingVoucher(mp.accessToken, order.paymentId) : null;
  const transfer = isBankTransfer(voucher?.paymentMethodId);
  const lastDetail = order.paymentStatus === "rejected" ? paymentMessage(order.paymentStatus, order.paymentStatusDetail) : null;

  return (
    <div className="sf-wrap sf-section" style={{ maxWidth: 720 }}>
      <SfPageHead eyebrow={`Pedido ${orderRef(order)}`} title="Pagar">
        {order.fullName}, tu pedido quedó apartado. Completa el pago para confirmarlo.
      </SfPageHead>

      <div style={{ ...sfPanel, marginBottom: 20 }}>
        {items.map((i) => (
          <SfRow key={i.id} label={`${i.productName}${i.variantName ? ` · ${i.variantName}` : ""} × ${i.quantity}`} value={formatMXN(i.unitPriceCents * i.quantity)} />
        ))}
        <SfRow label={order.fulfillment === "pickup" ? "Recoger en tienda" : "Envío"} value={order.shippingCents === 0 ? "Gratis" : formatMXN(order.shippingCents)} />
        <div style={{ borderTop: "1px solid var(--sf-muted)", paddingTop: 10 }}>
          <SfRow label="Total a pagar" value={formatMXN(order.totalCents)} strong />
        </div>
      </div>

      {!mp ? (
        <SfAlert tone="info">
          Esta tienda aún no tiene pagos en línea. Tu pedido {orderRef(order)} quedó registrado y te contactaremos a {order.email} para cobrarlo.
        </SfAlert>
      ) : voucher ? (
        <div style={{ ...sfPanel, borderColor: "var(--sf-primary)" }}>
          <h2 style={{ fontSize: 22 }}>{transfer ? "Completa tu transferencia" : "Termina tu pago en efectivo"}</h2>
          <p style={{ margin: 0, fontSize: 15 }}>
            {transfer ? "Usa los datos del comprobante para hacer la transferencia desde tu banca." : "Lleva el comprobante al establecimiento para completar el pago."}
          </p>
          {voucher.ticketUrl ? (
            <a href={voucher.ticketUrl} target="_blank" rel="noopener noreferrer" className="sf-btn sf-btn-primary">
              {transfer ? "Ver datos de transferencia" : "Abrir comprobante de pago"}
            </a>
          ) : null}
          {voucher.barcodeContent ? (
            <div>
              <div className="sf-eyebrow" style={{ marginBottom: 6 }}>Referencia</div>
              <code style={{ display: "block", wordBreak: "break-all", padding: "10px 12px", background: "var(--sf-muted)", borderRadius: "var(--sf-radius)", fontSize: 13 }}>{voucher.barcodeContent}</code>
            </div>
          ) : null}
          {voucher.expirationDate ? (
            <p className="sf-muted" style={{ margin: 0, fontSize: 13 }}>
              Vence: {new Date(voucher.expirationDate).toLocaleString("es-MX", { dateStyle: "long", timeStyle: "short", timeZone: "America/Mexico_City" })}
            </p>
          ) : null}
          <Link href={`/checkout/pagar/${order.id}?nuevo=1`} className="sf-link">¿Cambiaste de opinión? Elige otro método de pago</Link>
        </div>
      ) : (
        <div style={sfPanel}>
          <h2 style={{ fontSize: 22 }}>Datos de pago</h2>
          {lastDetail ? <SfAlert>{lastDetail}</SfAlert> : null}
          <MpBrick
            orderId={order.id}
            amount={order.totalCents / 100}
            publicKey={mp.publicKey}
            email={order.email}
            colors={{ primary: ctx.theme.colors.primary, primaryFg: ctx.theme.colors.primaryForeground, fg: ctx.theme.colors.foreground, bg: ctx.theme.colors.background }}
            radius={ctx.theme.radius === "999px" ? "16px" : ctx.theme.radius}
          />
          {mp.mode === "test" ? <p className="sf-muted" style={{ fontSize: 12, margin: 0 }}>Modo de pruebas: no se hacen cobros reales.</p> : null}
        </div>
      )}

      <p style={{ marginTop: 20 }}>
        <Link href={order.customerId ? `/mi-cuenta/pedidos/${order.id}` : "/productos"} className="sf-link">
          {order.customerId ? "Ver el pedido en mi cuenta" : "Seguir viendo productos"}
        </Link>
      </p>
    </div>
  );
}
