import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { formatMXN } from "@/lib/storefront";
import { SfAccountNav, SfPageHead, SfRow, SfStatusChip, sfPanel, toneFor } from "@/components/storefront/checkout-ui";
import { requireAccountPage } from "@/modules/orders/account";
import type { OrderStatus } from "@/lib/db/schema";
import { ORDER_STATUS_CUSTOMER_TEXT, ORDER_STATUS_LABEL, loadOrder, orderRef } from "@/modules/orders/orders";
import { getTrackingUrl } from "@/modules/orders/shipping-carriers";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Pedido" };

const fmt = new Intl.DateTimeFormat("es-MX", { dateStyle: "medium", timeStyle: "short", timeZone: "America/Mexico_City" });

export default async function OrderDetailPage({ params }: { params: Promise<{ host: string; orderId: string }> }) {
  const { host, orderId } = await params;
  const page = await requireAccountPage(host, `/mi-cuenta/pedidos/${orderId}`);
  if (!page) return null;
  const detail = await loadOrder(page.ctx.site.id, orderId);
  if (!detail || detail.order.customerId !== page.session.customer.id) notFound();
  const { order, items, history } = detail;
  const a = order.addressSnapshot;
  const trackingUrl = getTrackingUrl(order.trackingCarrier, order.trackingNumber);

  // Línea de tiempo: los estados por los que pasa un pedido normal.
  const path = order.fulfillment === "pickup"
    ? ["pending", "paid", "in_production", "ready", "delivered"]
    : ["pending", "paid", "in_production", "shipped", "delivered"];
  const reached = new Set(history.map((h) => h.toStatus));
  reached.add(order.status);
  const cancelled = order.status === "cancelled";

  return (
    <div className="sf-wrap sf-section" style={{ maxWidth: 860 }}>
      <SfPageHead eyebrow="Mi cuenta" title={`Pedido ${orderRef(order)}`}>
        {fmt.format(order.createdAt)}
      </SfPageHead>
      <SfAccountNav current="/mi-cuenta/pedidos" />

      <div style={{ ...sfPanel, marginBottom: 20 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
          <SfStatusChip label={ORDER_STATUS_LABEL[order.status]} tone={toneFor(order.status)} />
          {order.status === "pending" ? <Link href={`/checkout/pagar/${order.id}`} className="sf-btn sf-btn-primary" style={{ minHeight: 40 }}>Pagar ahora</Link> : null}
        </div>
        <p style={{ margin: 0, fontSize: 15 }}>{ORDER_STATUS_CUSTOMER_TEXT[order.status]}</p>

        {!cancelled ? (
          <ol style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", gap: 6, flexWrap: "wrap" }}>
            {path.map((s) => {
              const done = reached.has(s as OrderStatus);
              return (
                <li key={s} style={{ flex: "1 1 100px", fontSize: 12, fontWeight: 700, opacity: done ? 1 : 0.45 }}>
                  <div style={{ height: 6, borderRadius: 999, background: done ? "var(--sf-primary)" : "var(--sf-muted)", marginBottom: 6 }} />
                  {ORDER_STATUS_LABEL[s as OrderStatus]}
                </li>
              );
            })}
          </ol>
        ) : null}

        {order.trackingNumber ? (
          <div style={{ background: "var(--sf-muted)", borderRadius: "var(--sf-radius)", padding: "12px 14px", fontSize: 14 }}>
            <strong>Guía:</strong> {order.trackingCarrier ? `${order.trackingCarrier} · ` : ""}<code>{order.trackingNumber}</code>
            {trackingUrl ? <> · <a href={trackingUrl} target="_blank" rel="noopener noreferrer" className="sf-link" style={{ minHeight: 0 }}>Rastrear</a></> : null}
          </div>
        ) : null}
      </div>

      <div style={{ display: "grid", gap: 20, gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))" }}>
        <section style={sfPanel}>
          <h2 style={{ fontSize: 20 }}>Artículos</h2>
          {items.map((i) => (
            <div key={i.id} style={{ borderTop: "1px solid var(--sf-muted)", paddingTop: 10 }}>
              <SfRow label={<span style={{ opacity: 1, color: "var(--sf-fg)" }}><strong>{i.productName}</strong>{i.variantName ? ` · ${i.variantName}` : ""} × {i.quantity}</span>} value={formatMXN(i.unitPriceCents * i.quantity)} />
              {i.customization ? (
                <div className="sf-muted" style={{ fontSize: 12, marginTop: 4 }}>
                  {Object.entries(i.customization).filter(([k, v]) => !k.startsWith("_") && typeof v !== "object").map(([k, v]) => `${k}: ${String(v)}`).join(" · ")}
                </div>
              ) : null}
              {i.uploadedFileUrl ? <a href={i.uploadedFileUrl} target="_blank" rel="noopener noreferrer" className="sf-link" style={{ minHeight: 0, fontSize: 12 }}>Ver archivo</a> : null}
            </div>
          ))}
          <div style={{ borderTop: "1px solid var(--sf-muted)", paddingTop: 10, display: "flex", flexDirection: "column", gap: 6 }}>
            <SfRow label="Subtotal" value={formatMXN(order.subtotalCents)} />
            {order.discountCents > 0 ? <SfRow label="Descuento" value={`-${formatMXN(order.discountCents)}`} /> : null}
            <SfRow label={order.fulfillment === "pickup" ? "Recoger en tienda" : "Envío"} value={order.shippingCents === 0 ? "Gratis" : formatMXN(order.shippingCents)} />
            <SfRow label="Total" value={formatMXN(order.totalCents)} strong />
          </div>
        </section>

        <section style={sfPanel}>
          <h2 style={{ fontSize: 20 }}>{order.fulfillment === "pickup" ? "Entrega" : "Envío"}</h2>
          {order.fulfillment === "pickup" || !a ? (
            <p style={{ margin: 0, fontSize: 14 }}>Recoger en tienda. Te avisamos por correo cuando esté listo.</p>
          ) : (
            <p style={{ margin: 0, fontSize: 14, lineHeight: 1.5 }}>
              <strong>{a.recipient}</strong><br />
              {a.street} {a.extNumber ?? ""}{a.intNumber ? ` int. ${a.intNumber}` : ""}{a.neighborhood ? `, ${a.neighborhood}` : ""}<br />
              {a.zip} {a.city}, {a.state}{a.phone ? <><br />Tel. {a.phone}</> : null}
            </p>
          )}
          {order.notes ? <p className="sf-muted" style={{ margin: 0, fontSize: 13 }}>Notas: {order.notes}</p> : null}

          <h3 style={{ fontSize: 16, marginTop: 8 }}>Historial</h3>
          <ul style={{ listStyle: "none", margin: 0, padding: 0, fontSize: 13, display: "flex", flexDirection: "column", gap: 6 }}>
            {history.map((h) => (
              <li key={h.id} style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
                <span>{ORDER_STATUS_LABEL[h.toStatus]}{h.note && !h.changedBy?.startsWith("mercadopago") ? <span className="sf-muted"> — {h.note}</span> : null}</span>
                <span className="sf-muted" style={{ whiteSpace: "nowrap" }}>{fmt.format(h.createdAt)}</span>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  );
}
