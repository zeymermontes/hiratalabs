import { desc, eq, sql } from "drizzle-orm";
import Link from "next/link";
import { db } from "@/lib/db";
import { sites, submissions } from "@/lib/db/schema";
import { env } from "@/lib/env";
import { APEX_SLUG, siteHost } from "@/lib/host";
import { PageHeader, StatusPill, Empty } from "@/components/ui";
import { NewSiteForm } from "./new-site-form";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const rows = await db
    .select({
      id: sites.id,
      name: sites.name,
      slug: sites.slug,
      status: sites.status,
      activeVersionId: sites.activeVersionId,
      updatedAt: sites.updatedAt,
      submissionCount: sql<number>`(select count(*)::int from ${submissions} where ${submissions.siteId} = ${sites.id})`,
    })
    .from(sites)
    .orderBy(desc(sites.updatedAt));

  return (
    <>
      <PageHeader
        title="Sitios"
        subtitle={`${rows.length} landing${rows.length === 1 ? "" : "s"} en ${env.rootDomain}`}
        actions={<NewSiteForm rootDomain={env.rootDomain} />}
      />

      {rows.length === 0 ? (
        <Empty
          title="Todavía no hay landings"
          body="Crea un sitio, sube el ZIP de la landing y quedará publicada en su subdominio."
        />
      ) : (
        <div className="card divide-y divide-neutral-200">
          {rows.map((s) => (
            <Link key={s.id} href={`/sites/${s.id}`} className="flex items-center gap-4 px-5 py-4 transition hover:bg-neutral-50">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="truncate text-sm font-medium text-neutral-900">{s.name}</span>
                  <StatusPill status={s.status} />
                  {!s.activeVersionId ? (
                    <span className="text-xs text-neutral-400">sin publicar</span>
                  ) : null}
                </div>
                <div className="mt-0.5 flex items-center gap-2 truncate text-xs text-neutral-500">
                  {siteHost(s.slug, env.rootDomain)}
                  {s.slug === APEX_SLUG ? (
                    <span className="rounded bg-neutral-100 px-1.5 py-0.5 text-[10px] font-medium text-neutral-600">
                      home
                    </span>
                  ) : null}
                </div>
              </div>
              <div className="text-right text-xs text-neutral-400">
                <div>{s.submissionCount} mensaje{s.submissionCount === 1 ? "" : "s"}</div>
                <div className="mt-0.5">{new Date(s.updatedAt).toLocaleDateString("es-MX")}</div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </>
  );
}
