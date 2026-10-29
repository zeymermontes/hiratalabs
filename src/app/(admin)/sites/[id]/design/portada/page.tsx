import Link from "next/link";
import { requireSiteAccess } from "@/lib/auth";
import { listBanners, listCategories, listHomeSections } from "@/modules/catalog/queries";
import { BannersManager } from "./banners-manager";
import { SectionsManager } from "./sections-manager";

export const dynamic = "force-dynamic";

const toLocal = (d: Date | null) => {
  if (!d) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

export default async function PortadaPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await requireSiteAccess(id, { manage: true });
  const [sections, allBanners, { all: categories }] = await Promise.all([
    listHomeSections(id, { includeInactive: true }),
    listBanners(id, undefined, { includeInactive: true }),
    listCategories(id),
  ]);
  const now = Date.now();

  return (
    <div className="space-y-8">
      <div>
        <Link href={`/sites/${id}/design`} className="text-xs text-neutral-500 hover:text-neutral-800">← Diseño</Link>
        <h2 className="mt-1 text-sm font-semibold text-neutral-900">Portada y banners</h2>
        <p className="hint">La portada se arma con secciones en orden. Los banners son las imágenes grandes que usan algunas de ellas.</p>
      </div>

      <SectionsManager
        siteId={id}
        categories={categories.map((c) => ({ slug: c.slug, name: c.name }))}
        sections={sections.map((s) => ({ id: s.id, type: s.type, title: s.title ?? "", config: s.config, active: s.active }))}
      />

      <BannersManager
        siteId={id}
        banners={allBanners.map((b) => ({
          id: b.id, title: b.title, subtitle: b.subtitle ?? "", imageUrl: b.imageUrl, mobileImageUrl: b.mobileImageUrl ?? "",
          linkUrl: b.linkUrl ?? "", ctaLabel: b.ctaLabel ?? "", position: b.position, sortOrder: b.sortOrder, active: b.active,
          startsAt: toLocal(b.startsAt), endsAt: toLocal(b.endsAt),
          scheduled: Boolean(b.startsAt && b.startsAt.getTime() > now),
          expired: Boolean(b.endsAt && b.endsAt.getTime() < now),
        }))}
      />
    </div>
  );
}
