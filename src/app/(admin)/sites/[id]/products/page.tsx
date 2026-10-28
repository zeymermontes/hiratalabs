import Link from "next/link";
import { requireSiteAccess } from "@/lib/auth";
import { formatMXN } from "@/lib/storefront";
import { categoriesForProducts, listProducts, productCounts, type ProductStatus } from "@/modules/catalog/queries";
import { Empty } from "@/components/ui";
import { FeaturedToggle } from "./featured-toggle";

export const dynamic = "force-dynamic";

const PAGE = 30;
const STATUS_LABEL: Record<ProductStatus, string> = { active: "Publicado", draft: "Borrador", archived: "Archivado" };
const STATUS_CLASS: Record<ProductStatus, string> = {
  active: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  draft: "bg-neutral-100 text-neutral-600 ring-neutral-200",
  archived: "bg-amber-50 text-amber-700 ring-amber-200",
};

export default async function ProductsPage({
  params, searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ q?: string; status?: string; page?: string }>;
}) {
  const { id } = await params;
  await requireSiteAccess(id);
  const sp = await searchParams;
  const q = (sp.q ?? "").trim();
  const status = (["active", "draft", "archived"] as const).find((s) => s === sp.status);
  const page = Math.max(1, Number(sp.page) || 1);

  const [list, counts] = await Promise.all([
    listProducts(id, { q: q || undefined, status, limit: PAGE, offset: (page - 1) * PAGE }),
    productCounts(id),
  ]);
  const cats = await categoriesForProducts(id, list.items.map((p) => p.id));
  const pages = Math.max(1, Math.ceil(list.total / PAGE));

  const filterHref = (s?: string) => {
    const u = new URLSearchParams();
    if (q) u.set("q", q);
    if (s) u.set("status", s);
    const qs = u.toString();
    return `/sites/${id}/products${qs ? `?${qs}` : ""}`;
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-neutral-900">Productos</h2>
          <p className="hint">Lo que vende la tienda. Solo los <strong>publicados</strong> se ven en línea.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href={`/sites/${id}/categories`} className="btn-secondary">Categorías</Link>
          <Link href={`/sites/${id}/products/new`} className="btn-primary">+ Nuevo producto</Link>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="flex flex-wrap gap-1">
          {([["", "Todos", counts.all], ["active", "Publicados", counts.active], ["draft", "Borradores", counts.draft], ["archived", "Archivados", counts.archived]] as const).map(([s, label, n]) => {
            const active = (status ?? "") === s;
            return (
              <Link
                key={s} href={filterHref(s || undefined)}
                className={`pill ring-1 ring-inset ${active ? "bg-neutral-900 text-white ring-neutral-900" : "bg-white text-neutral-600 ring-neutral-200 hover:bg-neutral-50"}`}
              >
                {label} <span className="opacity-60">{n}</span>
              </Link>
            );
          })}
        </div>
        <form className="ml-auto flex w-full gap-2 sm:w-auto" action={`/sites/${id}/products`}>
          {status ? <input type="hidden" name="status" value={status} /> : null}
          <input name="q" defaultValue={q} placeholder="Buscar por nombre o SKU" className="input sm:w-64" aria-label="Buscar" />
          <button type="submit" className="btn-secondary">Buscar</button>
        </form>
      </div>

      {list.items.length === 0 ? (
        <Empty
          title={q || status ? "Nada por aquí" : "Aún no hay productos"}
          body={q || status ? "Cambia el filtro o la búsqueda." : "Crea el primero: nombre, precio y una foto bastan para empezar."}
          action={!q && !status ? <Link href={`/sites/${id}/products/new`} className="btn-primary">+ Nuevo producto</Link> : null}
        />
      ) : (
        <div className="card overflow-x-auto">
          <table className="w-full min-w-[720px] text-sm">
            <thead className="bg-neutral-50 text-left text-xs uppercase tracking-wide text-neutral-500">
              <tr>
                <th className="px-4 py-2.5" />
                <th className="px-2 py-2.5">Producto</th>
                <th className="px-2 py-2.5">Categorías</th>
                <th className="px-2 py-2.5">Precio</th>
                <th className="px-2 py-2.5">Inventario</th>
                <th className="px-2 py-2.5">Estado</th>
                <th className="px-2 py-2.5 text-center">Destacado</th>
                <th className="px-4 py-2.5" />
              </tr>
            </thead>
            <tbody className="stagger divide-y divide-neutral-100">
              {list.items.map((p) => {
                const img = p.images[0]?.url;
                const pcats = cats.get(p.id) ?? [];
                return (
                  <tr key={p.id} className="hover:bg-neutral-50/60">
                    <td className="px-4 py-2">
                      <div className="h-12 w-12 overflow-hidden rounded-md bg-neutral-100">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        {img ? <img src={img} alt="" className="h-full w-full object-cover" /> : null}
                      </div>
                    </td>
                    <td className="px-2 py-2">
                      <Link href={`/sites/${id}/products/${p.id}`} className="font-medium text-neutral-900 hover:underline">{p.name}</Link>
                      <div className="font-mono text-xs text-neutral-500">{p.slug}{p.sku ? ` · ${p.sku}` : ""}</div>
                    </td>
                    <td className="px-2 py-2 text-neutral-600">{pcats.length ? pcats.map((c) => c.name).join(", ") : "—"}</td>
                    <td className="px-2 py-2 font-medium">
                      {formatMXN(p.priceCents)}
                      {p.compareAtCents ? <span className="ml-1 text-xs text-neutral-400 line-through">{formatMXN(p.compareAtCents)}</span> : null}
                    </td>
                    <td className="px-2 py-2 text-neutral-600">
                      {p.stock === null ? <span className="text-neutral-400">Sin control</span> : p.stock === 0 ? <span className="font-medium text-red-600">Agotado</span> : p.stock}
                    </td>
                    <td className="px-2 py-2">
                      <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${STATUS_CLASS[p.status]}`}>{STATUS_LABEL[p.status]}</span>
                    </td>
                    <td className="px-2 py-2 text-center">
                      <FeaturedToggle siteId={id} productId={p.id} featured={p.featured} />
                    </td>
                    <td className="px-4 py-2 text-right">
                      <Link href={`/sites/${id}/products/${p.id}`} className="text-xs font-medium text-purple hover:underline">Editar</Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {pages > 1 ? (
        <div className="flex items-center justify-between text-sm text-neutral-600">
          <span>Página {page} de {pages} · {list.total} productos</span>
          <div className="flex gap-2">
            {page > 1 ? <Link className="btn-secondary" href={`${filterHref(status)}${q || status ? "&" : "?"}page=${page - 1}`}>← Anterior</Link> : null}
            {page < pages ? <Link className="btn-secondary" href={`${filterHref(status)}${q || status ? "&" : "?"}page=${page + 1}`}>Siguiente →</Link> : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}
