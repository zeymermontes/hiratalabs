import Link from "next/link";
import { formatMXN, type StorefrontContext } from "@/lib/storefront";
import { listCategories, listProducts, type ListProductsOpts } from "@/modules/catalog/queries";
import type { Product } from "@/modules/catalog/schema";
import { ProductCard } from "@/components/storefront/product-card";
import { bool, num, str, type SectionProps } from "../../types";
import { ProductTabs, type ProductTab } from "./product-tabs";
import { ScrollRow } from "./scroll-row";
import { Arrow, SectionHead, colsStyle } from "./shared";

type Source = "featured" | "newest" | "sale" | "category";

/** Productos según el origen elegido. Destacados sin resultados → los más nuevos. */
async function loadProducts(ctx: StorefrontContext, source: Source, category: string, limit: number): Promise<Product[]> {
  const base: ListProductsOpts = { status: "active", limit };
  const opts: ListProductsOpts =
    source === "featured" ? { ...base, featured: true }
    : source === "sale" ? { ...base, onSale: true }
    : source === "category" && category ? { ...base, categorySlug: category }
    : { ...base, sort: "newest" };
  const { items } = await listProducts(ctx.site.id, opts);
  if (items.length === 0 && source === "featured") return (await listProducts(ctx.site.id, base)).items;
  return items;
}

function Grid({ items, cols }: { items: Product[]; cols: string }) {
  return (
    <div className="sf-pg-grid" style={colsStyle(cols)}>
      {items.map((p) => <ProductCard key={p.id} product={p} />)}
    </div>
  );
}

/** Renglón tipo menú: foto chica, nombre, precio y enlace para pedir. */
function ListRow({ p }: { p: Product }) {
  const img = p.images[0];
  const onSale = p.compareAtCents !== null && p.compareAtCents > p.priceCents;
  const soldOut = p.stock !== null && p.stock <= 0;
  return (
    <li className="sf-pg-li">
      <Link href={`/productos/${p.slug}`} className="sf-pg-li-link">
        <span className="sf-pg-li-media">
          {img ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={img.thumbUrl ?? img.url} alt="" loading="lazy" />
          ) : <span className="sf-ph" aria-hidden="true">{p.name.slice(0, 1)}</span>}
        </span>
        <span className="sf-pg-li-copy">
          <span className="sf-pg-li-top">
            <span className="sf-pg-li-name">{p.name}</span>
            <span className="sf-pg-li-dots" aria-hidden="true" />
            <span className="sf-pg-li-price">
              {onSale ? <s className="sf-compare">{formatMXN(p.compareAtCents!)}</s> : null}
              {formatMXN(p.priceCents)}
            </span>
          </span>
          {p.description ? <span className="sf-pg-li-desc">{p.description.replace(/\s+/g, " ").slice(0, 110)}</span> : null}
        </span>
        <span className="sf-pg-li-add" aria-hidden="true">{soldOut ? "Agotado" : <>Pedir <Arrow size={14} /></>}</span>
      </Link>
    </li>
  );
}

export async function ProductGridSection({ ctx, section }: SectionProps) {
  if (!ctx.modules.has("catalog")) return null;
  const c = section.settings;
  const variant = section.variant ?? "grid";
  const source = (["featured", "newest", "sale", "category"].includes(str(c, "source")) ? str(c, "source") : "featured") as Source;
  const category = str(c, "category");
  const limit = Math.min(24, num(c, "limit", 8));
  const cols = str(c, "columns", "4") || "4";
  const title = str(c, "title");
  const subtitle = str(c, "subtitle");
  const showAll = bool(c, "showViewAll", true);
  const allHref = source === "category" && category ? `/categorias/${category}` : "/productos";

  if (variant === "tabs") {
    const [items, { tree }] = await Promise.all([loadProducts(ctx, source, category, limit), listCategories(ctx.site.id)]);
    const cats = tree.slice(0, 6);
    const perCat = await Promise.all(cats.map((cat) => listProducts(ctx.site.id, { status: "active", categorySlug: cat.slug, limit })));
    const tabs: ProductTab[] = [];
    if (items.length > 0) tabs.push({ key: "all", label: "Todo", href: allHref, panel: <Grid items={items} cols={cols} /> });
    cats.forEach((cat, i) => {
      const list = perCat[i].items;
      if (list.length > 0) tabs.push({ key: cat.id, label: cat.name, href: `/categorias/${cat.slug}`, panel: <Grid items={list} cols={cols} /> });
    });
    if (tabs.length === 0) return null;
    return (
      <section className="sf-section sf-pg sf-pg--tabs">
        <div className="sf-wrap">
          <SectionHead title={title} subtitle={subtitle} />
          <ProductTabs tabs={tabs} viewAll={showAll} />
        </div>
      </section>
    );
  }

  const items = await loadProducts(ctx, source, category, limit);
  if (items.length === 0) return null;
  const more = showAll ? { href: allHref, label: "Ver todo" } : null;

  let body: React.ReactNode;
  if (variant === "carousel") {
    body = (
      <ScrollRow label={title || "Productos"}>
        {items.map((p) => <div key={p.id} className="sf-scroller-item" style={colsStyle(cols)}><ProductCard product={p} /></div>)}
      </ScrollRow>
    );
  } else if (variant === "featured") {
    const [hero, ...rest] = items;
    body = (
      <div className="sf-pg-feat" data-count={Math.min(rest.length, 4)}>
        <div className="sf-pg-hero"><ProductCard product={hero} /></div>
        {rest.slice(0, 4).map((p) => <ProductCard key={p.id} product={p} />)}
      </div>
    );
  } else if (variant === "list") {
    body = <ul className="sf-pg-list" data-cols={Number(cols) >= 3 ? "2" : "1"}>{items.map((p) => <ListRow key={p.id} p={p} />)}</ul>;
  } else {
    body = <Grid items={items} cols={cols} />;
  }

  return (
    <section className={`sf-section sf-pg sf-pg--${variant}`}>
      <div className="sf-wrap">
        <SectionHead title={title} subtitle={subtitle} more={more} />
        {body}
      </div>
    </section>
  );
}
