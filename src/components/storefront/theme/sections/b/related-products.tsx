import { listProducts } from "@/modules/catalog/queries";
import { ProductCard } from "@/components/storefront/product-card";
import { num, str, type SectionProps } from "../../types";
import { ScrollRow } from "./scroll-row";
import { SectionHead } from "./shared";

/** Misma categoría que el producto; si no hay, los destacados. Nunca el producto actual. */
export async function RelatedProductsSection({ ctx, section, product: detail, related }: SectionProps) {
  if (!detail || !ctx.modules.has("catalog")) return null;
  const variant = section.variant ?? "grid";
  const limit = Math.min(12, num(section.settings, "limit", 4));
  const title = str(section.settings, "title") || "También te puede gustar";
  const main = detail.categories[0] ?? null;
  const currentId = detail.product.id;

  let items = (related ?? []).filter((p) => p.id !== currentId);
  if (items.length === 0 && main) {
    items = (await listProducts(ctx.site.id, { status: "active", categorySlug: main.slug, limit: limit + 1 })).items.filter((p) => p.id !== currentId);
  }
  if (items.length === 0) {
    items = (await listProducts(ctx.site.id, { status: "active", featured: true, limit: limit + 1 })).items.filter((p) => p.id !== currentId);
  }
  items = items.slice(0, limit);
  if (items.length === 0) return null;

  const more = { href: main ? `/categorias/${main.slug}` : "/productos", label: "Ver más" };
  const cols = String(Math.min(5, Math.max(2, Math.min(limit, 4))));

  return (
    <section className={`sf-section sf-rel sf-rel--${variant}`}>
      <div className="sf-wrap">
        <SectionHead title={title} more={more} />
        {variant === "carousel" ? (
          <ScrollRow label={title}>
            {items.map((p) => <div key={p.id} className="sf-scroller-item" style={{ "--cols": "4" } as React.CSSProperties}><ProductCard product={p} /></div>)}
          </ScrollRow>
        ) : (
          <div className="sf-pg-grid" style={{ "--cols": cols } as React.CSSProperties}>
            {items.map((p) => <ProductCard key={p.id} product={p} />)}
          </div>
        )}
      </div>
    </section>
  );
}
