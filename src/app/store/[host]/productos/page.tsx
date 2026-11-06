import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getStorefront } from "@/lib/storefront";
import { listCategories, listProducts } from "@/modules/catalog/queries";
import { Sections } from "@/components/storefront/theme/render";
import type { CollectionData } from "@/components/storefront/theme/types";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Productos" };

const PAGE = 24;

type Props = {
  params: Promise<{ host: string }>;
  searchParams: Promise<{ categoria?: string; q?: string; page?: string }>;
};

export default async function ProductsPage({ params, searchParams }: Props) {
  const { host } = await params;
  const ctx = await getStorefront(host);
  if (!ctx) return null;
  if (!ctx.modules.has("catalog")) notFound();

  const sp = await searchParams;
  const q = (sp.q ?? "").trim().slice(0, 80);
  const categoria = (sp.categoria ?? "").trim();
  const page = Math.max(1, Number(sp.page) || 1);

  const [{ tree, all }, list] = await Promise.all([
    listCategories(ctx.site.id),
    listProducts(ctx.site.id, { status: "active", q: q || undefined, categorySlug: categoria || undefined, limit: PAGE, offset: (page - 1) * PAGE }),
  ]);
  const data: CollectionData = {
    basePath: "/productos",
    q,
    categoria,
    page,
    pages: Math.max(1, Math.ceil(list.total / PAGE)),
    perPage: PAGE,
    list,
    tree,
    all,
    active: all.find((c) => c.slug === categoria) ?? null,
  };

  return <Sections list={ctx.design.doc.pages.collection} ctx={ctx} zone="collection" collection={data} />;
}
