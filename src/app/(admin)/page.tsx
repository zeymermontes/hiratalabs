import { formatDate } from "@/lib/reports";
import { desc, inArray, sql } from "drizzle-orm";
import Link from "next/link";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { sites, submissions } from "@/lib/db/schema";
import { env } from "@/lib/env";
import { APEX_SLUG, siteHost } from "@/lib/host";
import { PageHeader, StatusPill, Empty, KindPill } from "@/components/ui";
import { NewSiteForm } from "./new-site-form";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const user = await requireUser();
  // Un dueño con una sola tienda entra directo a ella.
  if (!user.isSuperAdmin && user.memberships.length === 1) redirect(`/sites/${user.memberships[0].siteId}`);

  const base = db
    .select({
      id: sites.id,
      name: sites.name,
      slug: sites.slug,
      kind: sites.kind,
      status: sites.status,
      activeVersionId: sites.activeVersionId,
      updatedAt: sites.updatedAt,
      submissionCount: sql<number>`(select count(*)::int from ${submissions} where ${submissions.siteId} = ${sites.id})`,
    })
    .from(sites);

  const ids = user.memberships.map((m) => m.siteId);
  const rows = user.isSuperAdmin
    ? await base.orderBy(desc(sites.updatedAt))
    : ids.length === 0
      ? []
      : await base.where(inArray(sites.id, ids)).orderBy(desc(sites.updatedAt));

  const landings = rows.filter((r) => r.kind === "landing").length;
  const stores = rows.length - landings;

  return (
    <>
      <PageHeader
        title={user.isSuperAdmin ? "Sitios" : "Mis sitios"}
        subtitle={
          <span>
            {stores} tienda{stores === 1 ? "" : "s"} · {landings} landing{landings === 1 ? "" : "s"} en{" "}
            <span className="font-mono text-xs">{env.rootDomain}</span>
          </span>
        }
        actions={user.isSuperAdmin ? <NewSiteForm rootDomain={env.rootDomain} /> : null}
      />

      {rows.length === 0 ? (
        <Empty
          title={user.isSuperAdmin ? "Todavía no hay sitios" : "Aún no te han invitado a ningún sitio"}
          body={
            user.isSuperAdmin
              ? "Crea una landing (ZIP) o una tienda y quedará publicada en su subdominio."
              : "Pide al equipo de Hirata Labs que te agregue como dueño o staff de tu sitio."
          }
        />
      ) : (
        <div className="card stagger divide-y divide-neutral-200">
          {rows.map((s) => (
            <Link
              key={s.id}
              href={`/sites/${s.id}`}
              className="flex min-h-16 items-center gap-4 px-4 py-3 transition hover:bg-neutral-50 sm:px-5"
            >
              <span
                aria-hidden="true"
                className={`font-display flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-lg ${
                  s.kind === "store" ? "bg-purple text-white" : "bg-neutral-100 text-neutral-700"
                }`}
              >
                {s.name.trim().charAt(0).toUpperCase() || "·"}
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="truncate text-sm font-semibold text-neutral-900">{s.name}</span>
                  <KindPill kind={s.kind} />
                  <StatusPill status={s.status} />
                  {!s.activeVersionId && s.kind === "landing" ? (
                    <span className="text-xs text-neutral-400">sin publicar</span>
                  ) : null}
                </div>
                <div className="mt-0.5 flex items-center gap-2 truncate font-mono text-xs text-neutral-500">
                  {siteHost(s.slug, env.rootDomain)}
                  {s.slug === APEX_SLUG ? (
                    <span className="rounded bg-neutral-100 px-1.5 py-0.5 font-sans text-[10px] font-semibold text-neutral-600">
                      home
                    </span>
                  ) : null}
                </div>
              </div>
              <div className="hidden text-right text-xs text-neutral-400 sm:block">
                <div>{s.submissionCount} mensaje{s.submissionCount === 1 ? "" : "s"}</div>
                <div className="mt-0.5">{formatDate(s.updatedAt)}</div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </>
  );
}
