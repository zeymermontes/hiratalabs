import { and, desc, eq, ilike, or, sql } from "drizzle-orm";
import Link from "next/link";
import { requireSiteAccess } from "@/lib/auth";
import { db } from "@/lib/db";
import { customers, orders } from "@/lib/db/schema";
import { formatDate } from "@/lib/reports";
import { formatMXN } from "@/lib/storefront";
import { Empty } from "@/components/ui";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ id: string }>; searchParams: Promise<{ q?: string }> };

export default async function CustomersPage({ params, searchParams }: Props) {
  const { id } = await params;
  const { q } = await searchParams;
  await requireSiteAccess(id);
  const term = (q ?? "").trim();

  const filters = [eq(customers.siteId, id)];
  if (term) {
    const cond = or(ilike(customers.email, `%${term}%`), ilike(customers.fullName, `%${term}%`), ilike(customers.phone, `%${term}%`));
    if (cond) filters.push(cond);
  }

  // Cuenta y suma solo pedidos pagados (no pendientes ni cancelados).
  const paid = sql`${orders.status} not in ('pending', 'cancelled')`;
  const rows = await db.select({
    customer: customers,
    orderCount: sql<number>`count(${orders.id}) filter (where ${paid})::int`,
    totalCents: sql<number>`coalesce(sum(${orders.totalCents}) filter (where ${paid}), 0)::int`,
    lastOrderAt: sql<Date | null>`max(${orders.createdAt})`,
  }).from(customers)
    .leftJoin(orders, and(eq(orders.customerId, customers.id), eq(orders.siteId, customers.siteId)))
    .where(and(...filters))
    .groupBy(customers.id)
    .orderBy(desc(customers.createdAt))
    .limit(300);

  return (
    <div className="space-y-4">
      <form method="get" className="flex items-center justify-between gap-3">
        <p className="text-sm text-neutral-500">{rows.length === 0 ? "Sin clientes registrados." : `${rows.length} cliente${rows.length === 1 ? "" : "s"}${term ? ` para “${term}”` : ""}`}</p>
        <div className="flex gap-2">
          <input name="q" defaultValue={term} placeholder="Correo, nombre o teléfono" className="input w-56" />
          <button type="submit" className="btn-secondary">Buscar</button>
        </div>
      </form>

      {rows.length === 0 ? (
        <Empty title={term ? "Nadie con esos datos" : "Aún no hay clientes"} body={term ? "Prueba con otro correo o nombre." : "Cuando alguien cree su cuenta en la tienda aparece aquí. Las compras como invitado se ven solo en Pedidos."} />
      ) : (
        <div className="card overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-neutral-50 text-left text-xs uppercase tracking-wide text-neutral-500">
              <tr>
                <th className="px-4 py-2.5">Cliente</th>
                <th className="px-4 py-2.5">Teléfono</th>
                <th className="px-4 py-2.5 text-right">Pedidos</th>
                <th className="px-4 py-2.5 text-right">Comprado</th>
                <th className="px-4 py-2.5">Último pedido</th>
                <th className="px-4 py-2.5">Alta</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-200 stagger">
              {rows.map(({ customer: c, orderCount, totalCents, lastOrderAt }) => (
                <tr key={c.id} className="hover:bg-neutral-50">
                  <td className="px-4 py-3">
                    <div className="font-medium text-neutral-900">{c.fullName || "—"}</div>
                    <Link href={`/sites/${id}/orders?q=${encodeURIComponent(c.email)}`} className="text-xs text-purple hover:underline">{c.email}</Link>
                  </td>
                  <td className="px-4 py-3 text-neutral-600">{c.phone ?? "—"}</td>
                  <td className="px-4 py-3 text-right">{orderCount}</td>
                  <td className="px-4 py-3 text-right font-semibold">{formatMXN(totalCents)}</td>
                  <td className="px-4 py-3 text-xs text-neutral-500">{lastOrderAt ? formatDate(lastOrderAt) : "—"}</td>
                  <td className="px-4 py-3 text-xs text-neutral-500">{formatDate(c.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
