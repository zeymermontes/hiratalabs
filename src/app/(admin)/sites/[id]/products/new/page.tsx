import { eq } from "drizzle-orm";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireSiteAccess } from "@/lib/auth";
import { db } from "@/lib/db";
import { sites } from "@/lib/db/schema";
import { env } from "@/lib/env";
import { siteHost } from "@/lib/host";
import { isModuleEnabled } from "@/lib/modules";
import { listCategories } from "@/modules/catalog/queries";
import { ProductForm } from "../product-form";
import { flattenCategories } from "../category-options";

export const dynamic = "force-dynamic";

export default async function NewProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const access = await requireSiteAccess(id);
  const [site] = await db.select().from(sites).where(eq(sites.id, id));
  if (!site) notFound();
  const [{ tree }, customizationEnabled] = await Promise.all([
    listCategories(id),
    isModuleEnabled(site, "product_customization"),
  ]);

  return (
    <div className="space-y-4">
      <Link href={`/sites/${id}/products`} className="text-xs text-neutral-500 hover:text-neutral-800">← Productos</Link>
      <h2 className="text-sm font-semibold text-neutral-900">Nuevo producto</h2>
      <p className="hint">Se crea como borrador. Después de guardarlo puedes agregar opciones (tallas, colores) y publicarlo.</p>
      <ProductForm
        siteId={id}
        storeHost={siteHost(site.slug, env.rootDomain)}
        canManage={access.canManage}
        customizationEnabled={customizationEnabled}
        categories={flattenCategories(tree)}
        values={{
          name: "", slug: "", description: "", priceCents: 0, compareAtCents: null, status: "draft",
          stock: null, sku: "", featured: false, isCustomizable: false, requiresFile: false, images: [], categoryIds: [],
        }}
      />
    </div>
  );
}
