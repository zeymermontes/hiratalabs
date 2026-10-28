import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getStorefront } from "@/lib/storefront";
import { getCategoryBySlug, listBanners, listCategories, listProducts } from "@/modules/catalog/queries";
import { ProductCard } from "@/components/storefront/product-card";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ host: string; slug: string }>; searchParams: Promise<{ page?: string }> };

export async function generateMetadata({ params }: Pick<Props, "params">): Promise<Metadata> {
  const { host, slug } = await params;
  const ctx = await getStorefront(host);
  if (!ctx) return {};
  const cat = await getCategoryBySlug(ctx.site.id, slug);
  return cat ? { title: cat.name, description: cat.description ?? undefined } : { title: "Categoría" };
}

const PAGE = 24;

export default async function CategoryPage({ params, searchParams }: Props) {
  const { host, slug } = await params;
  const ctx = await getStorefront(host);
  if (!ctx) return null;
  if (!ctx.modules.has("catalog")) notFound();

  const cat = await getCategoryBySlug(ctx.site.id, slug);
  if (!cat) notFound();
  const page = Math.max(1, Number((await searchParams).page) || 1);

  const [{ all, tree }, list, catBanners] = await Promise.all([
    listCategories(ctx.site.id),
    listProducts(ctx.site.id, { status: "active", categorySlug: slug, limit: PAGE, offset: (page - 1) * PAGE }),
    listBanners(ctx.site.id, "category"),
  ]);
  const parent = cat.parentId ? all.find((c) => c.id === cat.parentId) ?? null : null;
  const children = (tree.find((c) => c.id === cat.id) ?? tree.flatMap((c) => c.children).find((c) => c.id === cat.id))?.children ?? [];
  // Banner de categoría: el que enlaza a esta categoría; si no, su propia imagen.
  const banner = catBanners.find((b) => b.linkUrl === `/categorias/${cat.slug}`) ?? null;
  const cover = banner?.imageUrl ?? cat.imageUrl;
  const pages = Math.max(1, Math.ceil(list.total / PAGE));

  return (
    <div className="sf-wrap sf-section">
      <nav className="sf-crumbs" aria-label="Ruta">
        <Link href="/">Inicio</Link><span>/</span>
        <Link href="/productos">Productos</Link>
        {parent ? <><span>/</span><Link href={`/categorias/${parent.slug}`}>{parent.name}</Link></> : null}
        <span>/</span><span>{cat.name}</span>
      </nav>

      {cover ? (
        <div className="sf-carousel sf-reveal" style={{ marginBottom: 24 }}>
          <div className="sf-slide" data-active="true">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={cover} alt="" />
            <div className="sf-slide-copy">
              <h2>{banner?.title ?? cat.name}</h2>
              {banner?.subtitle ?? cat.description ? <p>{banner?.subtitle ?? cat.description}</p> : null}
            </div>
          </div>
        </div>
      ) : (
        <div className="sf-page-head sf-reveal">
          <div className="sf-eyebrow">Categoría</div>
          <h1>{cat.name}</h1>
          {cat.description ? <p>{cat.description}</p> : null}
        </div>
      )}

      {children.length > 0 ? (
        <nav className="sf-pills" aria-label="Subcategorías" style={{ marginBottom: 22 }}>
          {children.map((ch) => <Link key={ch.id} href={`/categorias/${ch.slug}`} className="sf-pill">{ch.name}</Link>)}
        </nav>
      ) : null}

      {list.items.length === 0 ? (
        <div className="sf-empty">
          <h2>Aún no hay productos aquí</h2>
          <Link href="/productos" className="sf-btn sf-btn-outline">Ver todo el catálogo</Link>
        </div>
      ) : (
        <div className="sf-grid sf-reveal">{list.items.map((p) => <ProductCard key={p.id} product={p} />)}</div>
      )}

      {pages > 1 ? (
        <nav className="sf-pager" aria-label="Paginación">
          <span className="sf-muted">Página {page} de {pages}</span>
          <div className="sf-pager-links">
            {page > 1 ? <Link href={`/categorias/${slug}?page=${page - 1}`} className="sf-btn sf-btn-ghost">← Anterior</Link> : null}
            {page < pages ? <Link href={`/categorias/${slug}?page=${page + 1}`} className="sf-btn sf-btn-ghost">Siguiente →</Link> : null}
          </div>
        </nav>
      ) : null}
    </div>
  );
}
