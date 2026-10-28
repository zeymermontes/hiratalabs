import { getStorefront } from "@/lib/storefront";
import { listHomeSections } from "@/modules/catalog/queries";
import {
  CategoryGrid, DefaultTextHero, FeaturedProducts, HeroBanners, HomeSectionView,
} from "@/components/storefront/sections";

export const dynamic = "force-dynamic";

/**
 * Portada de la tienda. Se arma con las secciones que el dueño ordena en
 * Diseño → Portada. Sin secciones (o sin catálogo) cae a una portada básica:
 * hero (banner principal o texto) + destacados + categorías.
 */
export default async function StoreHome({ params }: { params: Promise<{ host: string }> }) {
  const { host } = await params;
  const ctx = await getStorefront(host);
  if (!ctx) return null;

  if (!ctx.modules.has("catalog")) {
    return <div className="sf-wrap"><DefaultTextHero ctx={ctx} /></div>;
  }

  const sections = await listHomeSections(ctx.site.id);

  if (sections.length === 0) {
    return (
      <div className="sf-wrap">
        <HeroBanners ctx={ctx} section={{ config: {} }} />
        <FeaturedProducts ctx={ctx} section={{ config: { limit: 8 }, title: "Destacados" }} />
        <CategoryGrid ctx={ctx} section={{ config: { limit: 6 }, title: "Explora por categoría" }} />
      </div>
    );
  }

  return (
    <div className="sf-wrap">
      {sections.map((s) => <HomeSectionView key={s.id} ctx={ctx} section={s} />)}
    </div>
  );
}
