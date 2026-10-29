import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getStorefront } from "@/lib/storefront";
import { listCategories, listProducts } from "@/modules/catalog/queries";
import { ProductCard } from "@/components/storefront/product-card";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Productos" };

const PAGE = 24;

type Props = {
  params: Promise<{ host: string }>;
  searchParams: Promise<{ categoria?: string; q?: string; page?: string }>;
};

export default async function ProductsPage({ params, searchParams }: Props) {
  const { host } = await params;
  const ctx = await getStorefront(host);
  if (!ctx) return null;
  if (!ctx.modules.has("catalog")) notFound();

  const sp = await searchParams;
  const q = (sp.q ?? "").trim().slice(0, 80);
  const categoria = (sp.categoria ?? "").trim();
  const page = Math.max(1, Number(sp.page) || 1);

  const [{ tree, all }, list] = await Promise.all([
    listCategories(ctx.site.id),
    listProducts(ctx.site.id, { status: "active", q: q || undefined, categorySlug: categoria || undefined, limit: PAGE, offset: (page - 1) * PAGE }),
  ]);
  const active = all.find((c) => c.slug === categoria) ?? null;
  const pages = Math.max(1, Math.ceil(list.total / PAGE));

  const link = (over: { categoria?: string; page?: number }) => {
    const u = new URLSearchParams();
    const cat = over.categoria ?? categoria;
    if (cat) u.set("categoria", cat);
    if (q) u.set("q", q);
    if (over.page && over.page > 1) u.set("page", String(over.page));
    const qs = u.toString();
    return `/productos${qs ? `?${qs}` : ""}`;
  };

  return (
    <div className="sf-wrap sf-section">
      <div className="sf-page-head sf-reveal">
        <div className="sf-eyebrow">Catálogo</div>
        <h1>{active ? active.name : q ? `Resultados para “${q}”` : "Productos"}</h1>
        {active?.description ? <p>{active.description}</p> : null}
      </div>

      <div className="sf-filters">
        {tree.length > 0 ? (
          <nav className="sf-pills" aria-label="Categorías">
            <Link href={link({ categoria: "", page: 1 })} className="sf-pill" aria-current={!categoria}>Todo</Link>
            {tree.map((c) => (
              <Link key={c.id} href={link({ categoria: c.slug, page: 1 })} className="sf-pill" aria-current={categoria === c.slug || c.children.some((ch) => ch.slug === categoria)}>
                {c.name}
              </Link>
            ))}
          </nav>
        ) : <span />}
        <form className="sf-search" action="/productos" role="search">
          {categoria ? <input type="hidden" name="categoria" value={categoria} /> : null}
          <input className="sf-input" type="search" name="q" defaultValue={q} placeholder="Buscar…" aria-label="Buscar productos" />
          <button type="submit" className="sf-btn sf-btn-ghost">Buscar</button>
        </form>
      </div>

      {active && active.parentId === null && tree.find((c) => c.id === active.id)?.children.length ? (
        <nav className="sf-pills" aria-label="Subcategorías" style={{ marginBottom: 18 }}>
          {tree.find((c) => c.id === active.id)!.children.map((ch) => (
            <Link key={ch.id} href={link({ categoria: ch.slug, page: 1 })} className="sf-pill">{ch.name}</Link>
          ))}
        </nav>
      ) : null}

      {list.items.length === 0 ? (
        <div className="sf-empty">
          <h2>No encontramos productos</h2>
          <p>{q ? "Prueba con otra palabra." : "Muy pronto habrá novedades aquí."}</p>
          {q || categoria ? <Link href="/productos" className="sf-btn sf-btn-outline">Ver todo el catálogo</Link> : null}
        </div>
      ) : (
        <div className="sf-grid sf-reveal">
          {list.items.map((p) => <ProductCard key={p.id} product={p} />)}
        </div>
      )}

      {pages > 1 ? (
        <nav className="sf-pager" aria-label="Paginación">
          <span className="sf-muted">Página {page} de {pages}</span>
          <div className="sf-pager-links">
            {page > 1 ? <Link href={link({ page: page - 1 })} className="sf-btn sf-btn-ghost">← Anterior</Link> : null}
            {page < pages ? <Link href={link({ page: page + 1 })} className="sf-btn sf-btn-ghost">Siguiente →</Link> : null}
          </div>
        </nav>
      ) : null}
    </div>
  );
}
