import Link from "next/link";
import { requireSiteAccess } from "@/lib/auth";
import { listBanners } from "@/modules/catalog/queries";
import { BannersManager } from "./banners-manager";

export const dynamic = "force-dynamic";

const toLocal = (d: Date | null) => {
  if (!d) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

export default async function PortadaPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await requireSiteAccess(id, { manage: true });
  const allBanners = await listBanners(id, undefined, { includeInactive: true });
  const now = Date.now();

  return (
    <div className="space-y-8">
      <div>
        <Link href={`/sites/${id}/design`} className="text-xs text-neutral-500 hover:text-neutral-800">← Diseño</Link>
        <h2 className="mt-1 text-sm font-semibold text-neutral-900">Banners</h2>
        <p className="hint">
          Las imágenes grandes que usan las secciones “Portada principal” (diseño Carrusel de banners) y “Banda de banners”.
          El orden y los textos de la portada se editan en <Link href={`/sites/${id}/design`} className="font-semibold text-purple hover:underline">Diseño</Link>.
        </p>
      </div>

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
