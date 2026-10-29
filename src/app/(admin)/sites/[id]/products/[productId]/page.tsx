import { eq } from "drizzle-orm";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireSiteAccess } from "@/lib/auth";
import { db } from "@/lib/db";
import { sites } from "@/lib/db/schema";
import { env } from "@/lib/env";
import { siteHost } from "@/lib/host";
import { isModuleEnabled } from "@/lib/modules";
import { getProductById, listCategories } from "@/modules/catalog/queries";
import { ProductForm } from "../product-form";
import { VariantsEditor } from "../variants-editor";
import { CustomizationEditor } from "../customization-editor";
import { flattenCategories } from "../category-options";

export const dynamic = "force-dynamic";

export default async function EditProductPage({
  params, searchParams,
}: { params: Promise<{ id: string; productId: string }>; searchParams: Promise<{ created?: string }> }) {
  const { id, productId } = await params;
  const { created } = await searchParams;
  const access = await requireSiteAccess(id);
  const [site] = await db.select().from(sites).where(eq(sites.id, id));
  if (!site) notFound();

  const [detail, { tree }, customizationEnabled] = await Promise.all([
    getProductById(id, productId),
    listCategories(id),
    isModuleEnabled(site, "product_customization"),
  ]);
  if (!detail) notFound();
  const { product, variants, fields } = detail;
  const host = siteHost(site.slug, env.rootDomain);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <Link href={`/sites/${id}/products`} className="text-xs text-neutral-500 hover:text-neutral-800">← Productos</Link>
          <h2 className="mt-1 text-sm font-semibold text-neutral-900">{product.name}</h2>
        </div>
        {product.status === "active" ? (
          <a href={`https://${host}/productos/${product.slug}`} target="_blank" rel="noreferrer" className="btn-secondary">Ver en la tienda ↗</a>
        ) : null}
      </div>

      {created ? (
        <p className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700">
          Producto creado como borrador. Agrega opciones si las tiene y cámbialo a <strong>Publicado</strong> cuando esté listo.
        </p>
      ) : null}

      <ProductForm
        siteId={id}
        storeHost={host}
        canManage={access.canManage}
        customizationEnabled={customizationEnabled}
        categories={flattenCategories(tree)}
        values={{
          id: product.id,
          name: product.name,
          slug: product.slug,
          description: product.description ?? "",
          priceCents: product.priceCents,
          compareAtCents: product.compareAtCents,
          status: product.status,
          stock: product.stock,
          sku: product.sku ?? "",
          featured: product.featured,
          isCustomizable: product.isCustomizable,
          requiresFile: product.requiresFile,
          images: product.images.map((i) => i.url),
          categoryIds: detail.categories.map((c) => c.id),
        }}
      />

      <VariantsEditor
        siteId={id} productId={product.id} basePriceCents={product.priceCents}
        variants={variants.map((v) => ({ id: v.id, name: v.name, priceDeltaCents: v.priceDeltaCents, sku: v.sku, stock: v.stock }))}
      />

      {customizationEnabled ? (
        <CustomizationEditor
          siteId={id} productId={product.id}
          variants={variants.map((v) => ({ id: v.id, name: v.name }))}
          fields={fields.map((f) => ({
            id: f.id, type: f.type, name: f.name, label: f.label, required: f.required,
            options: f.options ?? null, variantIds: f.variantIds ?? null,
          }))}
        />
      ) : null}
    </div>
  );
}
