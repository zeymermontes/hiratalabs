import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getStorefront } from "@/lib/storefront";
import { getCategoryBySlug, listCategories, listProducts } from "@/modules/catalog/queries";
import { Sections } from "@/components/storefront/theme/render";
import type { CollectionData } from "@/components/storefront/theme/types";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ host: string; slug: string }>; searchParams: Promise<{ page?: string }> };

export async function generateMetadata({ params }: Pick<Props, "params">): Promise<Metadata> {
  const { host, slug } = await params;
  const ctx = await getStorefront(host);
  if (!ctx) return {};
  const cat = await getCategoryBySlug(ctx.site.id, slug);
  return cat ? { title: cat.name, description: cat.description ?? undefined } : { title: "Categoría" };
}

const PAGE = 24;

export default async function CategoryPage({ params, searchParams }: Props) {
  const { host, slug } = await params;
  const ctx = await getStorefront(host);
  if (!ctx) return null;
  if (!ctx.modules.has("catalog")) notFound();

  const cat = await getCategoryBySlug(ctx.site.id, slug);
  if (!cat) notFound();
  const page = Math.max(1, Number((await searchParams).page) || 1);

  const [{ all, tree }, list] = await Promise.all([
    listCategories(ctx.site.id),
    listProducts(ctx.site.id, { status: "active", categorySlug: slug, limit: PAGE, offset: (page - 1) * PAGE }),
  ]);
  const data: CollectionData = {
    basePath: `/categorias/${cat.slug}`,
    q: "",
    categoria: cat.slug,
    page,
    pages: Math.max(1, Math.ceil(list.total / PAGE)),
    perPage: PAGE,
    list,
    tree,
    all,
    active: cat,
  };

  return <Sections list={ctx.design.doc.pages.collection} ctx={ctx} zone="collection" collection={data} />;
}
