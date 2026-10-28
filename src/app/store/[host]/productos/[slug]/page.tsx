import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getStorefront } from "@/lib/storefront";
import { getProductBySlug, listProducts } from "@/modules/catalog/queries";
import { AddToCart } from "@/components/storefront/add-to-cart";
import { ProductCard } from "@/components/storefront/product-card";
import { ProductGallery } from "@/components/storefront/product-gallery";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ host: string; slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { host, slug } = await params;
  const ctx = await getStorefront(host);
  if (!ctx) return {};
  const detail = await getProductBySlug(ctx.site.id, slug);
  if (!detail) return { title: "Producto" };
  const { product } = detail;
  const description = product.description?.replace(/\s+/g, " ").trim().slice(0, 160) || undefined;
  const image = product.images[0]?.url;
  return {
    title: product.name,
    description,
    openGraph: { title: product.name, description, images: image ? [{ url: image }] : undefined, type: "website" },
  };
}

export default async function ProductPage({ params }: Props) {
  const { host, slug } = await params;
  const ctx = await getStorefront(host);
  if (!ctx) return null;
  if (!ctx.modules.has("catalog")) notFound();

  const detail = await getProductBySlug(ctx.site.id, slug);
  if (!detail) notFound();
  const { product, variants, categories, fields } = detail;

  const customizationOn = ctx.modules.has("product_customization") && product.isCustomizable;
  const activeFields = customizationOn ? fields : [];
  const mainCategory = categories[0] ?? null;

  // Relacionados: misma categoría; si no, los destacados.
  const related = (
    mainCategory
      ? await listProducts(ctx.site.id, { status: "active", categorySlug: mainCategory.slug, limit: 5 })
      : await listProducts(ctx.site.id, { status: "active", featured: true, limit: 5 })
  ).items.filter((p) => p.id !== product.id).slice(0, 4);

  return (
    <div className="sf-wrap">
      <div className="sf-product">
        <div>
          <nav className="sf-crumbs" aria-label="Ruta">
            <Link href="/">Inicio</Link><span>/</span>
            <Link href="/productos">Productos</Link>
            {mainCategory ? <><span>/</span><Link href={`/categorias/${mainCategory.slug}`}>{mainCategory.name}</Link></> : null}
          </nav>
          <div className="sf-reveal">
            <ProductGallery images={product.images} name={product.name} />
          </div>
        </div>

        <div className="sf-product-info sf-sticky sf-reveal">
          {customizationOn || product.requiresFile || product.compareAtCents ? (
            <div className="sf-badges">
              {customizationOn ? <span className="sf-badge-soft">Personalizable</span> : null}
              {product.requiresFile ? <span className="sf-badge-soft">Con tu diseño</span> : null}
              {product.compareAtCents && product.compareAtCents > product.priceCents ? <span className="sf-badge-soft">Oferta</span> : null}
            </div>
          ) : null}
          <h1>{product.name}</h1>
          {product.sku ? <span className="sf-note">SKU {product.sku}</span> : null}

          <AddToCart
            productId={product.id}
            productName={product.name}
            priceCents={product.priceCents}
            compareAtCents={product.compareAtCents}
            stock={product.stock}
            variants={variants.map((v) => ({ id: v.id, name: v.name, priceDeltaCents: v.priceDeltaCents, stock: v.stock }))}
            fields={activeFields.map((f) => ({
              id: f.id, type: f.type, name: f.name, label: f.label, required: f.required,
              options: f.options ?? null, variantIds: f.variantIds ?? null,
            }))}
            requiresFile={product.requiresFile}
            ordersEnabled={ctx.modules.has("orders")}
            whatsappHref={ctx.config.whatsappHref}
            productUrl={`https://${ctx.host}/productos/${product.slug}`}
          />

          {product.description ? <p className="sf-desc">{product.description}</p> : null}

          {categories.length > 0 ? (
            <div className="sf-pills" aria-label="Categorías">
              {categories.map((c) => <Link key={c.id} href={`/categorias/${c.slug}`} className="sf-pill">{c.name}</Link>)}
            </div>
          ) : null}
        </div>
      </div>

      {related.length > 0 ? (
        <section className="sf-section sf-reveal">
          <div className="sf-section-head">
            <h2>También te puede gustar</h2>
            <Link href={mainCategory ? `/categorias/${mainCategory.slug}` : "/productos"} className="sf-link">Ver más →</Link>
          </div>
          <div className="sf-grid">{related.map((p) => <ProductCard key={p.id} product={p} />)}</div>
        </section>
      ) : null}
    </div>
  );
}
