import Link from "next/link";
import { requireSiteAccess } from "@/lib/auth";
import { categoryProductCounts, listCategories } from "@/modules/catalog/queries";
import { flattenCategories } from "../products/category-options";
import { CategoriesManager } from "./categories-manager";

export const dynamic = "force-dynamic";

export default async function CategoriesPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const access = await requireSiteAccess(id);
  const [{ all, tree }, counts] = await Promise.all([listCategories(id), categoryProductCounts(id)]);
  const flat = flattenCategories(tree);
  const byId = new Map(all.map((c) => [c.id, c]));

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <Link href={`/sites/${id}/products`} className="text-xs text-neutral-500 hover:text-neutral-800">← Productos</Link>
          <h2 className="mt-1 text-sm font-semibold text-neutral-900">Categorías</h2>
          <p className="hint">Agrupan los productos y arman el menú de la tienda. Pueden tener subcategorías.</p>
        </div>
      </div>
      <CategoriesManager
        siteId={id}
        canManage={access.canManage}
        options={flat}
        rows={flat.map((f) => {
          const c = byId.get(f.id)!;
          return {
            id: c.id, name: c.name, slug: c.slug, description: c.description ?? "", parentId: c.parentId,
            sortOrder: c.sortOrder, imageUrl: c.imageUrl ?? "", showInHeader: c.showInHeader, depth: f.depth,
            products: counts[c.id] ?? 0,
          };
        })}
      />
    </div>
  );
}
