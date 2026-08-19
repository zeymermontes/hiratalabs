import { desc, eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { siteVersions, sites } from "@/lib/db/schema";
import { env } from "@/lib/env";
import { Empty } from "@/components/ui";
import { MetaForm } from "./meta-form";
import { UploadForm } from "./upload-form";
import { VersionActions } from "./version-actions";

export const dynamic = "force-dynamic";

function bytes(n: number) {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(0)} KB`;
  return `${(n / 1024 / 1024).toFixed(2)} MB`;
}

export default async function SitePublishPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [site] = await db.select().from(sites).where(eq(sites.id, id));
  if (!site) notFound();

  const versions = await db
    .select()
    .from(siteVersions)
    .where(eq(siteVersions.siteId, id))
    .orderBy(desc(siteVersions.createdAt))
    .limit(25);

  return (
    <div className="space-y-8">
      <section>
        <h2 className="mb-3 text-sm font-semibold text-neutral-900">Subir landing</h2>
        <UploadForm siteId={site.id} hasVersion={Boolean(site.activeVersionId)} />
      </section>

      <section>
        <h2 className="mb-3 text-sm font-semibold text-neutral-900">Versiones</h2>
        {versions.length === 0 ? (
          <Empty title="Sin versiones" body="Sube un ZIP para crear la primera versión de esta landing." />
        ) : (
          <div className="card divide-y divide-neutral-200">
            {versions.map((v) => (
              <div key={v.id} className="flex flex-wrap items-center gap-3 px-5 py-3.5">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-neutral-900">
                    {v.label || `Versión del ${new Date(v.createdAt).toLocaleString("es-MX")}`}
                  </p>
                  <p className="mt-0.5 text-xs text-neutral-500">
                    {v.fileCount} archivos · {bytes(v.totalBytes)} · {v.uploadedBy ?? "—"} ·{" "}
                    {new Date(v.createdAt).toLocaleString("es-MX")}
                  </p>
                </div>
                <VersionActions siteId={site.id} versionId={v.id} isActive={site.activeVersionId === v.id} />
              </div>
            ))}
          </div>
        )}
      </section>

      <section>
        <h2 className="mb-3 text-sm font-semibold text-neutral-900">Configuración del sitio</h2>
        <MetaForm site={site} rootDomain={env.rootDomain} />
      </section>
    </div>
  );
}
