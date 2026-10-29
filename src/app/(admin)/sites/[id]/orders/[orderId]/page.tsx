import { desc, eq } from "drizzle-orm";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireSiteAccess } from "@/lib/auth";
import { db } from "@/lib/db";
import { customers, orderEmailLog } from "@/lib/db/schema";
import { formatDateTime } from "@/lib/reports";
import { formatMXN } from "@/lib/storefront";
import { PageHeader } from "@/components/ui";
import { ORDER_STATUS_LABEL, loadOrder } from "@/modules/orders/orders";
import { getTrackingUrl } from "@/modules/orders/shipping-carriers";
import { OrderStatusPill } from "../order-status-pill";
import { NotesForm, ResendButton, StatusForm } from "./order-forms";

export const dynamic = "force-dynamic";

export default async function OrderDetailPage({ params }: { params: Promise<{ id: string; orderId: string }> }) {
  const { id, orderId } = await params;
  await requireSiteAccess(id);
  const detail = await loadOrder(id, orderId);
  if (!detail) notFound();
  const { order, items, history } = detail;
  const [customer] = order.customerId ? await db.select().from(customers).where(eq(customers.id, order.customerId)) : [];
  const emails = await db.select().from(orderEmailLog).where(eq(orderEmailLog.orderId, order.id)).orderBy(desc(orderEmailLog.createdAt)).limit(20);
  const a = order.addressSnapshot;
  const trackingUrl = getTrackingUrl(order.trackingCarrier, order.trackingNumber);

  return (
    <div className="space-y-6">
      <Link href={`/sites/${id}/orders`} className="text-xs text-neutral-500 hover:text-neutral-800">← Pedidos</Link>
      <PageHeader
        title={`Pedido #${order.number}`}
        subtitle={<span className="flex flex-wrap items-center gap-2"><OrderStatusPill status={order.status} /><span>{formatDateTime(order.createdAt)}</span>{order.paidAt ? <span>· pagado {formatDateTime(order.paidAt)}</span> : null}</span>}
        actions={<ResendButton siteId={id} orderId={order.id} />}
      />

      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <div className="space-y-6">
          <section className="card overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-neutral-50 text-left text-xs uppercase tracking-wide text-neutral-500">
                <tr><th className="px-4 py-2.5">Artículo</th><th className="px-4 py-2.5 text-right">Cant.</th><th className="px-4 py-2.5 text-right">Precio</th><th className="px-4 py-2.5 text-right">Importe</th></tr>
              </thead>
              <tbody className="divide-y divide-neutral-200">
                {items.map((i) => (
                  <tr key={i.id}>
                    <td className="px-4 py-3">
                      <div className="font-medium text-neutral-900">{i.productName}</div>
                      {i.variantName ? <div className="text-xs text-neutral-500">{i.variantName}</div> : null}
                      {i.customization ? (
                        <dl className="mt-1 text-xs text-neutral-600">
                          {Object.entries(i.customization).filter(([k]) => !k.startsWith("_")).map(([k, v]) => (
                            <div key={k}><dt className="inline font-semibold">{k}:</dt> <dd className="inline">{typeof v === "object" ? JSON.stringify(v) : String(v)}</dd></div>
                          ))}
                        </dl>
                      ) : null}
                      {i.uploadedFileUrl ? <a href={i.uploadedFileUrl} target="_blank" rel="noreferrer" className="text-xs text-purple hover:underline">Archivo del cliente ↗</a> : null}
                    </td>
                    <td className="px-4 py-3 text-right">{i.quantity}</td>
                    <td className="px-4 py-3 text-right">{formatMXN(i.unitPriceCents)}</td>
                    <td className="px-4 py-3 text-right font-semibold">{formatMXN(i.unitPriceCents * i.quantity)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="text-sm">
                <tr><td colSpan={3} className="px-4 pt-3 text-right text-neutral-500">Subtotal</td><td className="px-4 pt-3 text-right">{formatMXN(order.subtotalCents)}</td></tr>
                {order.discountCents > 0 ? <tr><td colSpan={3} className="px-4 text-right text-neutral-500">Descuento</td><td className="px-4 text-right">-{formatMXN(order.discountCents)}</td></tr> : null}
                <tr><td colSpan={3} className="px-4 text-right text-neutral-500">{order.fulfillment === "pickup" ? "Recoger en tienda" : "Envío"}</td><td className="px-4 text-right">{order.shippingCents === 0 ? "Gratis" : formatMXN(order.shippingCents)}</td></tr>
                <tr><td colSpan={3} className="px-4 pb-3 text-right font-semibold text-neutral-900">Total</td><td className="px-4 pb-3 text-right font-display text-xl">{formatMXN(order.totalCents)}</td></tr>
              </tfoot>
            </table>
          </section>

          <section className="card p-5">
            <h3 className="mb-3 text-sm font-semibold text-neutral-900">Cambiar estado</h3>
            <StatusForm siteId={id} orderId={order.id} status={order.status} fulfillment={order.fulfillment} trackingCarrier={order.trackingCarrier} trackingNumber={order.trackingNumber} />
          </section>

          <section className="card p-5">
            <h3 className="mb-3 text-sm font-semibold text-neutral-900">Historial</h3>
            <ol className="space-y-2 text-sm">
              {history.map((h) => (
                <li key={h.id} className="flex flex-wrap items-baseline gap-x-3 gap-y-0.5">
                  <span className="text-xs text-neutral-400">{formatDateTime(h.createdAt)}</span>
                  <span className="font-medium text-neutral-900">{h.fromStatus ? `${ORDER_STATUS_LABEL[h.fromStatus]} → ` : ""}{ORDER_STATUS_LABEL[h.toStatus]}</span>
                  <span className="text-xs text-neutral-500">{h.changedBy}</span>
                  {h.note ? <span className="w-full text-neutral-600">{h.note}</span> : null}
                </li>
              ))}
            </ol>
          </section>
        </div>

        <aside className="space-y-6">
          <section className="card p-5 text-sm">
            <h3 className="mb-2 text-sm font-semibold text-neutral-900">Cliente</h3>
            <p className="font-medium text-neutral-900">{order.fullName}</p>
            <p><a href={`mailto:${order.email}`} className="text-purple hover:underline">{order.email}</a></p>
            {order.phone ? <p><a href={`https://wa.me/${order.phone.replace(/\D/g, "")}`} target="_blank" rel="noreferrer" className="text-purple hover:underline">{order.phone}</a></p> : null}
            <p className="mt-2 text-xs text-neutral-500">{customer ? <Link href={`/sites/${id}/customers?q=${encodeURIComponent(customer.email)}`} className="hover:underline">Cliente registrado ↗</Link> : "Compra como invitado"}</p>
          </section>

          <section className="card p-5 text-sm">
            <h3 className="mb-2 text-sm font-semibold text-neutral-900">{order.fulfillment === "pickup" ? "Recoger en tienda" : "Envío"}</h3>
            {order.fulfillment === "ship" && a ? (
              <p className="leading-relaxed text-neutral-700">
                {a.recipient}<br />{a.street} {a.extNumber ?? ""}{a.intNumber ? ` int. ${a.intNumber}` : ""}{a.neighborhood ? `, ${a.neighborhood}` : ""}<br />{a.zip} {a.city}, {a.state}{a.phone ? <><br />Tel. {a.phone}</> : null}
              </p>
            ) : <p className="text-neutral-600">El cliente pasa por su pedido.</p>}
            {order.trackingNumber ? (
              <p className="mt-2 text-xs text-neutral-600">Guía: {order.trackingCarrier ? `${order.trackingCarrier} ` : ""}<code>{order.trackingNumber}</code>{trackingUrl ? <> · <a href={trackingUrl} target="_blank" rel="noreferrer" className="text-purple hover:underline">rastrear</a></> : null}</p>
            ) : null}
          </section>

          <section className="card p-5 text-sm">
            <h3 className="mb-2 text-sm font-semibold text-neutral-900">Pago</h3>
            <dl className="grid grid-cols-[max-content_1fr] gap-x-3 gap-y-1 text-xs">
              <dt className="text-neutral-500">Proveedor</dt><dd>{order.paymentProvider ?? "—"}</dd>
              <dt className="text-neutral-500">Estado MP</dt><dd>{order.paymentStatus ?? "—"}{order.paymentStatusDetail ? <span className="text-neutral-400"> · {order.paymentStatusDetail}</span> : null}</dd>
              <dt className="text-neutral-500">ID de pago</dt><dd className="font-mono">{order.paymentId ?? "—"}</dd>
            </dl>
          </section>

          <section className="card p-5">
            <h3 className="mb-2 text-sm font-semibold text-neutral-900">Notas</h3>
            <NotesForm siteId={id} orderId={order.id} notes={order.notes} />
          </section>

          {emails.length ? (
            <section className="card p-5 text-xs">
              <h3 className="mb-2 text-sm font-semibold text-neutral-900">Correos</h3>
              <ul className="space-y-1">
                {emails.map((e) => (
                  <li key={e.id} className="flex flex-wrap gap-x-2 text-neutral-600">
                    <span className={e.ok ? "text-emerald-700" : "text-red-600"}>{e.ok ? "✓" : "✗"}</span>
                    <span>{e.kind}</span><span className="text-neutral-400">{e.toEmail}</span><span className="text-neutral-400">{formatDateTime(e.createdAt)}</span>
                    {e.error ? <span className="w-full text-red-600">{e.error}</span> : null}
                  </li>
                ))}
              </ul>
            </section>
          ) : null}
        </aside>
      </div>
    </div>
  );
}
