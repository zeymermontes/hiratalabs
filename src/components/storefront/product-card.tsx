import Link from "next/link";
import { formatMXN } from "@/lib/storefront";
import type { Product } from "@/modules/catalog/schema";

/** Tarjeta de producto para rejillas y carruseles. Solo clases sf-*. */
export function ProductCard({ product }: { product: Product }) {
  const img = product.images[0];
  const soldOut = product.stock !== null && product.stock <= 0;
  const onSale = product.compareAtCents !== null && product.compareAtCents > product.priceCents;
  const off = onSale ? Math.round((1 - product.priceCents / product.compareAtCents!) * 100) : 0;

  return (
    <Link href={`/productos/${product.slug}`} className={`sf-card${soldOut ? " sf-soldout" : ""}`}>
      <div className="sf-card-media">
        {img ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={img.url} alt={img.alt ?? product.name} loading="lazy" />
        ) : (
          <div className="sf-card-media-empty" style={{ position: "absolute", inset: 0 }}>Sin foto</div>
        )}
        {soldOut ? <span className="sf-tag">Agotado</span> : onSale && off > 0 ? <span className="sf-tag sf-tag-primary">-{off}%</span> : product.featured ? <span className="sf-tag">Destacado</span> : null}
      </div>
      <div className="sf-card-body">
        <div className="sf-card-title">{product.name}</div>
        <div className="sf-price-row">
          <span className="sf-price">{formatMXN(product.priceCents)}</span>
          {onSale ? <span className="sf-compare">{formatMXN(product.compareAtCents!)}</span> : null}
        </div>
      </div>
    </Link>
  );
}
