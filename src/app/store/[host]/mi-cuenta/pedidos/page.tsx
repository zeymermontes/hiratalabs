import type { Metadata } from "next";
import Link from "next/link";
import { formatMXN } from "@/lib/storefront";
import { SfAccountNav, SfPageHead, SfStatusChip, toneFor } from "@/components/storefront/checkout-ui";
import { requireAccountPage } from "@/modules/orders/account";
import { ORDER_STATUS_LABEL, listCustomerOrders, orderRef } from "@/modules/orders/orders";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Mis pedidos" };

const fmt = new Intl.DateTimeFormat("es-MX", { dateStyle: "medium", timeZone: "America/Mexico_City" });

export default async function OrdersPage({ params }: { params: Promise<{ host: string }> }) {
  const { host } = await params;
  const page = await requireAccountPage(host, "/mi-cuenta/pedidos");
  if (!page) return null;
  const list = await listCustomerOrders(page.ctx.site.id, page.session.customer.id);

  return (
    <div className="sf-wrap sf-section" style={{ maxWidth: 860 }}>
      <SfPageHead eyebrow="Mi cuenta" title="Mis pedidos" />
      <SfAccountNav current="/mi-cuenta/pedidos" />
      {list.length === 0 ? (
        <p className="sf-muted">Aún no tienes pedidos. <Link href="/productos" className="sf-link" style={{ minHeight: 0 }}>Ver productos</Link></p>
      ) : (
        <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column" }}>
          {list.map((o) => (
            <li key={o.id} style={{ borderTop: "1px solid var(--sf-muted)" }}>
              <Link href={`/mi-cuenta/pedidos/${o.id}`} style={{ display: "flex", flexWrap: "wrap", gap: 10, alignItems: "center", padding: "16px 0", minHeight: 44 }}>
                <div style={{ flex: "1 1 200px" }}>
                  <strong style={{ fontSize: 16 }}>Pedido {orderRef(o)}</strong>
                  <div className="sf-muted" style={{ fontSize: 13 }}>{fmt.format(o.createdAt)} · {o.fulfillment === "pickup" ? "Recoger en tienda" : "Envío"}</div>
                </div>
                <SfStatusChip label={ORDER_STATUS_LABEL[o.status]} tone={toneFor(o.status)} />
                <span className="sf-price" style={{ minWidth: 90, textAlign: "right" }}>{formatMXN(o.totalCents)}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
