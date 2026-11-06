import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getStorefront } from "@/lib/storefront";
import { getProductBySlug } from "@/modules/catalog/queries";
import { Sections } from "@/components/storefront/theme/render";

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
  const { product, variants } = detail;

  // Datos estructurados para buscadores (precio en MXN, disponibilidad).
  const inStock = variants.length > 0
    ? variants.some((v) => v.stock === null || v.stock > 0)
    : product.stock === null || product.stock > 0;
  const url = `https://${ctx.host}/productos/${product.slug}`;
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    image: product.images.map((i) => i.url),
    description: product.description?.replace(/\s+/g, " ").trim() || undefined,
    sku: product.sku || undefined,
    url,
    offers: {
      "@type": "Offer",
      url,
      priceCurrency: "MXN",
      price: (product.priceCents / 100).toFixed(2),
      availability: inStock ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
    },
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />
      <Sections list={ctx.design.doc.pages.product} ctx={ctx} zone="product" product={detail} />
    </>
  );
}
