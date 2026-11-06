import { getStorefront } from "@/lib/storefront";
import { Sections } from "@/components/storefront/theme/render";

export const dynamic = "force-dynamic";

/** Portada de la tienda: las secciones de la página "home" del tema. */
export default async function StoreHome({ params }: { params: Promise<{ host: string }> }) {
  const { host } = await params;
  const ctx = await getStorefront(host);
  if (!ctx) return null;
  return <Sections list={ctx.design.doc.pages.home} ctx={ctx} zone="home" />;
}
