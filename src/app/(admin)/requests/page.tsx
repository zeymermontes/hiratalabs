import { desc, eq } from "drizzle-orm";
import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { moduleRequests, sites } from "@/lib/db/schema";
import { formatDateTime } from "@/lib/reports";
import { MODULE_BY_KEY } from "@/modules/registry";
import { Empty, PageHeader, StatusPill } from "@/components/ui";
import { RequestActions } from "./request-actions";

export const dynamic = "force-dynamic";

export default async function RequestsPage() {
  await requireAdmin();
  const rows = await db
    .select({
      id: moduleRequests.id,
      siteId: moduleRequests.siteId,
      siteName: sites.name,
      moduleKey: moduleRequests.moduleKey,
      requestedBy: moduleRequests.requestedBy,
      message: moduleRequests.message,
      status: moduleRequests.status,
      createdAt: moduleRequests.createdAt,
    })
    .from(moduleRequests)
    .innerJoin(sites, eq(sites.id, moduleRequests.siteId))
    .orderBy(desc(moduleRequests.createdAt))
    .limit(100);

  const pending = rows.filter((r) => r.status === "pending");

  return (
    <>
      <PageHeader
        title="Solicitudes"
        subtitle={`${pending.length} pendiente${pending.length === 1 ? "" : "s"}. Aprobar activa el módulo en el sitio al instante.`}
      />
      {rows.length === 0 ? (
        <Empty title="Sin solicitudes" body="Cuando un dueño pida un extra desde su panel aparecerá aquí." />
      ) : (
        <div className="card divide-y divide-neutral-200">
          {rows.map((r) => (
            <div key={r.id} className="flex flex-wrap items-center gap-3 px-4 py-3 sm:px-5">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <Link href={`/sites/${r.siteId}/modules`} className="text-sm font-semibold text-neutral-900 hover:underline">
                    {r.siteName}
                  </Link>
                  <span className="text-sm text-neutral-500">pide</span>
                  <span className="text-sm font-semibold text-purple">{MODULE_BY_KEY[r.moduleKey]?.name ?? r.moduleKey}</span>
                  <StatusPill status={r.status} />
                </div>
                <p className="hint mt-0.5">
                  {r.requestedBy} · {formatDateTime(r.createdAt)}
                  {r.message ? <> · “{r.message}”</> : null}
                </p>
              </div>
              {r.status === "pending" ? <RequestActions id={r.id} /> : null}
            </div>
          ))}
        </div>
      )}
    </>
  );
}
