import { eq } from "drizzle-orm";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireSiteAccess } from "@/lib/auth";
import { db } from "@/lib/db";
import { sites } from "@/lib/db/schema";
import { resolveTheme, TEMPLATES } from "@/lib/theme";
import { DesignForm } from "./design-form";

export const dynamic = "force-dynamic";

export default async function DesignPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await requireSiteAccess(id, { manage: true });
  const [site] = await db.select().from(sites).where(eq(sites.id, id));
  if (!site) notFound();
  const theme = resolveTheme(site.theme);

  return (
    <div className="space-y-6">
      <div className="card flex flex-wrap items-center justify-between gap-3 p-4">
        <div>
          <p className="text-sm font-medium text-neutral-900">Portada y banners</p>
          <p className="hint">Secciones de la página de inicio, carrusel principal y banners programables.</p>
        </div>
        <Link href={`/sites/${site.id}/design/portada`} className="btn-primary">Editar portada →</Link>
      </div>
      <DesignForm
      siteId={site.id}
      templates={TEMPLATES.map((t) => ({
        key: t.key, name: t.name, description: t.description, tags: t.tags, colors: t.defaults.colors, fonts: t.defaults.fonts,
      }))}
      current={{
        template: theme.template.key,
        colors: theme.colors,
        fonts: theme.fonts,
        radius: site.theme?.radius ?? theme.template.defaults.radius,
        logoUrl: theme.logoUrl ?? "",
        announcement: theme.announcement ?? "",
      }}
    />
    </div>
  );
}
