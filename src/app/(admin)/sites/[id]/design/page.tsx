import { eq } from "drizzle-orm";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { requireSiteAccess } from "@/lib/auth";
import { db } from "@/lib/db";
import { sites } from "@/lib/db/schema";
import { listCategories, listProducts } from "@/modules/catalog/queries";
import { demoUrl, storeUrl } from "@/themes/demo";
import { signPreview } from "@/themes/preview";
import { THEME_TEMPLATES } from "@/themes/templates";
import { getDraftDoc, listVersions } from "@/themes/versions";
import type { TemplateSummary, VersionRow } from "./editor-types";
import { ThemeEditor } from "./editor";

export const dynamic = "force-dynamic";

export default async function DesignPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await requireSiteAccess(id, { manage: true });
  const [site] = await db.select().from(sites).where(eq(sites.id, id));
  if (!site) notFound();

  if (site.kind !== "store") {
    return (
      <div className="card p-6">
        <p className="text-sm font-medium text-neutral-900">El editor de diseño es para tiendas.</p>
        <p className="hint mt-1">Las landings se publican subiendo su archivo ZIP en la pestaña Publicación.</p>
      </div>
    );
  }

  const h = await headers();
  const requestHost = h.get("x-forwarded-host") ?? h.get("host");

  const [draft, versions, { all: categories }, products] = await Promise.all([
    getDraftDoc(site),
    listVersions(site.id),
    listCategories(site.id),
    listProducts(site.id, { status: "active", limit: 1 }),
  ]);

  const templates: TemplateSummary[] = THEME_TEMPLATES.map((t) => ({
    key: t.key, name: t.name, description: t.description, tags: t.tags, highlights: t.highlights,
    styles: t.styles, schemes: t.doc.settings.schemes, fonts: t.doc.settings.fonts,
    demoUrl: demoUrl(t.key, requestHost),
  }));

  const versionRows: VersionRow[] = versions.map((v) => ({
    id: v.id, status: v.status, label: v.label, template: v.template,
    updatedAt: v.updatedAt.toISOString(), publishedAt: v.publishedAt?.toISOString() ?? null,
  }));

  return (
    <ThemeEditor
      siteId={site.id}
      initialDoc={draft.doc}
      initialDirty={draft.dirty}
      templates={templates}
      categories={categories.map((c) => ({ slug: c.slug, name: c.name }))}
      productSlug={products.items[0]?.slug ?? null}
      previewBase={storeUrl(site.slug, requestHost)}
      previewToken={signPreview(site.id)}
      versions={versionRows}
    />
  );
}
