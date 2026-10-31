import Link from "next/link";
import type { StorefrontContext } from "@/lib/storefront";
import type { ProductDetail } from "@/modules/catalog/queries";
import { AddToCart } from "@/components/storefront/add-to-cart";
import { ProductGallery } from "@/components/storefront/product-gallery";
import { bool, type SectionProps } from "../../types";

function Crumbs({ detail }: { detail: ProductDetail }) {
  const main = detail.categories[0] ?? null;
  return (
    <nav className="sf-crumbs sf-pm-crumbs" aria-label="Ruta">
      <Link href="/">Inicio</Link><span aria-hidden="true">/</span>
      <Link href="/productos">Productos</Link>
      {main ? <><span aria-hidden="true">/</span><Link href={`/categorias/${main.slug}`}>{main.name}</Link></> : null}
    </nav>
  );
}

/** Título, insignias y caja de compra: igual en todas las variantes. */
function BuyInfo({ ctx, detail, withDescription = true }: { ctx: StorefrontContext; detail: ProductDetail; withDescription?: boolean }) {
  const { product, variants, categories, fields } = detail;
  const customizationOn = ctx.modules.has("product_customization") && product.isCustomizable;
  const activeFields = customizationOn ? fields : [];
  const onSale = product.compareAtCents !== null && product.compareAtCents > product.priceCents;
  return (
    <>
      {customizationOn || product.requiresFile || onSale ? (
        <div className="sf-badges">
          {customizationOn ? <span className="sf-badge-soft">Personalizable</span> : null}
          {product.requiresFile ? <span className="sf-badge-soft">Con tu diseño</span> : null}
          {onSale ? <span className="sf-badge-soft sf-pm-sale">Oferta</span> : null}
        </div>
      ) : null}
      <h1 className="sf-pm-title">{product.name}</h1>
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

      {withDescription ? <Details detail={detail} /> : null}
      {!withDescription && categories.length > 0 ? <CategoryPills detail={detail} /> : null}
    </>
  );
}

function CategoryPills({ detail }: { detail: ProductDetail }) {
  return (
    <div className="sf-pills" aria-label="Categorías">
      {detail.categories.map((c) => <Link key={c.id} href={`/categorias/${c.slug}`} className="sf-pill">{c.name}</Link>)}
    </div>
  );
}

function Details({ detail }: { detail: ProductDetail }) {
  return (
    <>
      {detail.product.description ? <p className="sf-desc">{detail.product.description}</p> : null}
      {detail.categories.length > 0 ? <CategoryPills detail={detail} /> : null}
    </>
  );
}

export function ProductMainSection({ ctx, section, product: detail }: SectionProps) {
  if (!detail) return null;
  const variant = section.variant ?? "gallery";
  const sticky = bool(section.settings, "stickyInfo", true);
  const zoom = bool(section.settings, "zoomOnHover", false);
  const { product } = detail;
  const images = product.images;
  const cls = `sf-pm sf-pm--${variant}${zoom ? " sf-pm--zoom" : ""}`;
  const infoCls = `sf-pm-info sf-product-info${sticky ? " sf-pm-sticky" : ""}`;

  if (variant === "wide") {
    return (
      <section className={cls}>
        <div className="sf-wrap">
          <Crumbs detail={detail} />
          <div className="sf-pm-hero" data-count={Math.min(images.length, 3)}>
            {images.length === 0 ? (
              <div className="sf-pm-shot sf-ph">Sin foto</div>
            ) : images.slice(0, 3).map((im, i) => (
              <div key={im.url + i} className="sf-pm-shot">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={im.url} alt={im.alt ?? product.name} loading={i === 0 ? "eager" : "lazy"} />
              </div>
            ))}
          </div>
          <div className="sf-pm-below">
            <div className="sf-pm-story">
              <div className="sf-eyebrow">Detalles</div>
              {product.description ? <p className="sf-desc sf-pm-desc-lg">{product.description}</p> : <p className="sf-desc">{product.name}</p>}
              {images.length > 3 ? (
                <div className="sf-pm-more">
                  {images.slice(3).map((im, i) => (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img key={im.url + i} src={im.thumbUrl ?? im.url} alt={im.alt ?? ""} loading="lazy" />
                  ))}
                </div>
              ) : null}
            </div>
            <div className={infoCls}><BuyInfo ctx={ctx} detail={detail} withDescription={false} /></div>
          </div>
        </div>
      </section>
    );
  }

  if (variant === "stacked") {
    return (
      <section className={cls}>
        <div className="sf-wrap">
          <Crumbs detail={detail} />
          <div className="sf-pm-grid">
            <div className="sf-pm-media">
              <div className="sf-pm-mobile-gallery"><ProductGallery images={images} name={product.name} /></div>
              <div className="sf-pm-stack">
                {images.length === 0 ? <div className="sf-pm-shot sf-ph">Sin foto</div> : images.map((im, i) => (
                  <div key={im.url + i} className="sf-pm-shot">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={im.url} alt={im.alt ?? product.name} loading={i === 0 ? "eager" : "lazy"} />
                  </div>
                ))}
              </div>
            </div>
            <div className={infoCls}><BuyInfo ctx={ctx} detail={detail} /></div>
          </div>
        </div>
      </section>
    );
  }

  if (variant === "minimal") {
    return (
      <section className={cls}>
        <div className="sf-wrap">
          <div className="sf-pm-narrow">
            <Crumbs detail={detail} />
            <div className="sf-pm-media"><ProductGallery images={images} name={product.name} /></div>
            <div className="sf-pm-info sf-product-info"><BuyInfo ctx={ctx} detail={detail} /></div>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className={cls}>
      <div className="sf-wrap">
        <div className="sf-pm-grid">
          <div className="sf-pm-media">
            <Crumbs detail={detail} />
            <ProductGallery images={images} name={product.name} />
          </div>
          <div className={infoCls}><BuyInfo ctx={ctx} detail={detail} /></div>
        </div>
      </div>
    </section>
  );
}
