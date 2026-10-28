import { and, desc, eq, ilike, or, sql } from "drizzle-orm";
import Link from "next/link";
import { requireSiteAccess } from "@/lib/auth";
import { db } from "@/lib/db";
import { orders } from "@/lib/db/schema";
import { formatDateTime } from "@/lib/reports";
import { formatMXN } from "@/lib/storefront";
import { Empty } from "@/components/ui";
import { ORDER_STATUSES, ORDER_STATUS_LABEL, isOrderStatus } from "@/modules/orders/orders";
import { OrderStatusPill } from "./order-status-pill";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ id: string }>; searchParams: Promise<{ status?: string; q?: string }> };

export default async function OrdersPage({ params, searchParams }: Props) {
  const { id } = await params;
  const { status, q } = await searchParams;
  await requireSiteAccess(id);

  const filters = [eq(orders.siteId, id)];
  if (isOrderStatus(status)) filters.push(eq(orders.status, status));
  const term = (q ?? "").trim();
  if (term) {
    const asNumber = Number(term.replace(/^#/, ""));
    const cond = Number.isInteger(asNumber) && asNumber > 0
      ? or(eq(orders.number, asNumber), ilike(orders.email, `%${term}%`), ilike(orders.fullName, `%${term}%`))
      : or(ilike(orders.email, `%${term}%`), ilike(orders.fullName, `%${term}%`));
    if (cond) filters.push(cond);
  }

  const [rows, counts] = await Promise.all([
    db.select().from(orders).where(and(...filters)).orderBy(desc(orders.createdAt)).limit(200),
    db.select({ status: orders.status, n: sql<number>`count(*)::int`, total: sql<number>`coalesce(sum(${orders.totalCents}), 0)::int` })
      .from(orders).where(eq(orders.siteId, id)).groupBy(orders.status),
  ]);
  const byStatus = new Map(counts.map((c) => [c.status, c]));
  const paidTotal = counts.filter((c) => c.status !== "pending" && c.status !== "cancelled").reduce((s, c) => s + c.total, 0);
  const totalOrders = counts.reduce((s, c) => s + c.n, 0);

  return (
    <div className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="card p-4"><p className="label">Pedidos</p><p className="kpi">{totalOrders}</p></div>
        <div className="card p-4"><p className="label">Vendido (pagados)</p><p className="kpi">{formatMXN(paidTotal)}</p></div>
        <div className="card p-4"><p className="label">Por atender</p><p className="kpi">{(byStatus.get("paid")?.n ?? 0) + (byStatus.get("in_production")?.n ?? 0)}</p></div>
      </div>

      <form className="flex flex-wrap items-end gap-3" method="get">
        <div className="flex flex-wrap gap-1.5">
          <Link href={`/sites/${id}/orders`} className={`pill ${!isOrderStatus(status) ? "bg-ink text-white" : "bg-neutral-100 text-neutral-600"}`}>Todos</Link>
          {ORDER_STATUSES.map((s) => (
            <Link key={s} href={`/sites/${id}/orders?status=${s}${term ? `&q=${encodeURIComponent(term)}` : ""}`} className={`pill ${status === s ? "bg-ink text-white" : "bg-neutral-100 text-neutral-600"}`}>
              {ORDER_STATUS_LABEL[s]}{byStatus.get(s)?.n ? ` · ${byStatus.get(s)?.n}` : ""}
            </Link>
          ))}
        </div>
        <div className="ml-auto flex gap-2">
          {isOrderStatus(status) ? <input type="hidden" name="status" value={status} /> : null}
          <input name="q" defaultValue={term} placeholder="Folio, correo o nombre" className="input w-56" />
          <button className="btn-secondary" type="submit">Buscar</button>
        </div>
        <Link href={`/sites/${id}/orders/settings`} className="btn-secondary">Envío y entrega</Link>
      </form>

      {rows.length === 0 ? (
        <Empty title={term || status ? "Nada con ese filtro" : "Aún no hay pedidos"} body={term || status ? "Prueba con otro folio, correo o estado." : "Cuando alguien compre en la tienda, el pedido aparece aquí y te llega un correo."} />
      ) : (
        <div className="card overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-neutral-50 text-left text-xs uppercase tracking-wide text-neutral-500">
              <tr>
                <th className="px-4 py-2.5">Folio</th>
                <th className="px-4 py-2.5">Cliente</th>
                <th className="px-4 py-2.5">Estado</th>
                <th className="px-4 py-2.5">Entrega</th>
                <th className="px-4 py-2.5 text-right">Total</th>
                <th className="px-4 py-2.5">Fecha</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-200 stagger">
              {rows.map((o) => (
                <tr key={o.id} className="hover:bg-neutral-50">
                  <td className="px-4 py-3 font-mono font-semibold"><Link href={`/sites/${id}/orders/${o.id}`} className="text-purple hover:underline">#{o.number}</Link></td>
                  <td className="px-4 py-3"><div className="font-medium text-neutral-900">{o.fullName}</div><div className="text-xs text-neutral-500">{o.email}</div></td>
                  <td className="px-4 py-3"><OrderStatusPill status={o.status} /></td>
                  <td className="px-4 py-3 text-neutral-600">{o.fulfillment === "pickup" ? "Recoger" : "Envío"}</td>
                  <td className="px-4 py-3 text-right font-semibold">{formatMXN(o.totalCents)}</td>
                  <td className="px-4 py-3 text-xs text-neutral-500">{formatDateTime(o.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
