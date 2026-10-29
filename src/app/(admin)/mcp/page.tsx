import { desc, eq, gte, sql } from "drizzle-orm";
import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { sites } from "@/lib/db/schema";
import { env } from "@/lib/env";
import { enabledKeysForSites } from "@/lib/modules";
import { mcpAudit, mcpTokens } from "@/modules/mcp/schema";
import { Empty, KindPill, PageHeader } from "@/components/ui";

export const dynamic = "force-dynamic";

const fmt = new Intl.DateTimeFormat("es-MX", { dateStyle: "medium", timeStyle: "short" });

export default async function PlatformMcpPage() {
  await requireAdmin();
  const since = new Date(Date.now() - 7 * 86_400_000);

  const [allSites, tokenCounts, callCounts] = await Promise.all([
    db.select({ id: sites.id, name: sites.name, slug: sites.slug, kind: sites.kind, status: sites.status }).from(sites).orderBy(sites.name),
    db.select({
      siteId: mcpTokens.siteId,
      active: sql<number>`count(*) filter (where ${mcpTokens.revokedAt} is null)::int`,
      total: sql<number>`count(*)::int`,
      lastUsed: sql<Date | null>`max(${mcpTokens.lastUsedAt})`,
    }).from(mcpTokens).groupBy(mcpTokens.siteId),
    db.select({
      siteId: mcpAudit.siteId,
      calls: sql<number>`count(*)::int`,
      failures: sql<number>`count(*) filter (where not ${mcpAudit.ok})::int`,
    }).from(mcpAudit).where(gte(mcpAudit.createdAt, since)).groupBy(mcpAudit.siteId),
  ]);

  const enabledBySite = await enabledKeysForSites(allSites);
  const tokensBy = new Map(tokenCounts.map((t) => [t.siteId, t]));
  const callsBy = new Map(callCounts.map((c) => [c.siteId, c]));

  const rows = allSites
    .filter((s) => enabledBySite.get(s.id)?.has("mcp_access") || tokensBy.has(s.id))
    .map((s) => ({
      ...s,
      enabled: enabledBySite.get(s.id)?.has("mcp_access") ?? false,
      tokens: tokensBy.get(s.id),
      calls: callsBy.get(s.id),
    }))
    .sort((a, b) => (b.calls?.calls ?? 0) - (a.calls?.calls ?? 0));

  const recent = await db.select({
    id: mcpAudit.id, tool: mcpAudit.tool, ok: mcpAudit.ok, createdAt: mcpAudit.createdAt,
    siteName: sites.name, siteId: sites.id,
  }).from(mcpAudit)
    .innerJoin(sites, eq(sites.id, mcpAudit.siteId))
    .where(gte(mcpAudit.createdAt, since))
    .orderBy(desc(mcpAudit.createdAt))
    .limit(15);

  const totalCalls = callCounts.reduce((n, c) => n + c.calls, 0);
  const totalFailures = callCounts.reduce((n, c) => n + c.failures, 0);
  const activeTokens = tokenCounts.reduce((n, t) => n + t.active, 0);

  return (
    <>
      <PageHeader
        title="Conexiones MCP"
        subtitle={<>Sitios que conectaron su propia IA. Endpoint: <code className="font-mono text-xs">{env.appUrl.replace(/\/+$/, "")}/api/mcp</code></>}
      />

      <div className="mb-6 grid gap-3 sm:grid-cols-3">
        <div className="card p-4">
          <div className="label">Sitios con MCP</div>
          <div className="font-display text-3xl text-neutral-900">{rows.filter((r) => r.enabled).length}</div>
        </div>
        <div className="card p-4">
          <div className="label">Tokens activos</div>
          <div className="font-display text-3xl text-neutral-900">{activeTokens}</div>
        </div>
        <div className="card p-4">
          <div className="label">Llamadas · 7 días</div>
          <div className="font-display text-3xl text-neutral-900">
            {totalCalls.toLocaleString("es-MX")}
            {totalFailures ? <span className="ml-2 text-base text-red-600">{totalFailures} con error</span> : null}
          </div>
        </div>
      </div>

      {rows.length === 0 ? (
        <Empty title="Nadie ha conectado su IA todavía" body="Cuando un sitio active el módulo 'Conectar tu propia IA (MCP)' o cree un token, aparece aquí." />
      ) : (
        <div className="card overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="text-xs uppercase tracking-wide text-neutral-500">
              <tr>
                <th className="px-5 py-3 font-medium">Sitio</th>
                <th className="px-3 py-3 font-medium">Módulo</th>
                <th className="px-3 py-3 text-right font-medium">Tokens activos</th>
                <th className="px-3 py-3 text-right font-medium">Llamadas · 7 días</th>
                <th className="px-3 py-3 text-right font-medium">Errores</th>
                <th className="px-5 py-3 font-medium">Último uso</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {rows.map((r) => (
                <tr key={r.id}>
                  <td className="px-5 py-3">
                    <Link href={`/sites/${r.id}/mcp`} className="font-medium text-neutral-900 underline-offset-2 hover:underline">{r.name}</Link>
                    <span className="ml-2"><KindPill kind={r.kind} /></span>
                  </td>
                  <td className="px-3 py-3">
                    {r.enabled
                      ? <span className="pill bg-lime-tint text-lime-dark">activo</span>
                      : <span className="pill bg-neutral-100 text-neutral-600">apagado</span>}
                  </td>
                  <td className="px-3 py-3 text-right text-neutral-800">{r.tokens?.active ?? 0}<span className="text-neutral-400"> / {r.tokens?.total ?? 0}</span></td>
                  <td className="px-3 py-3 text-right text-neutral-800">{(r.calls?.calls ?? 0).toLocaleString("es-MX")}</td>
                  <td className="px-3 py-3 text-right">{r.calls?.failures ? <span className="text-red-600">{r.calls.failures}</span> : <span className="text-neutral-400">0</span>}</td>
                  <td className="px-5 py-3 text-neutral-600">{r.tokens?.lastUsed ? fmt.format(new Date(r.tokens.lastUsed)) : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {recent.length > 0 ? (
        <section className="card mt-6">
          <div className="border-b border-neutral-200 px-5 py-3.5">
            <h3 className="text-sm font-semibold text-neutral-900">Actividad reciente</h3>
          </div>
          <ul className="divide-y divide-neutral-100">
            {recent.map((r) => (
              <li key={r.id} className="flex flex-wrap items-center gap-3 px-5 py-2 text-sm">
                <span className="w-40 shrink-0 text-xs text-neutral-500">{fmt.format(r.createdAt)}</span>
                <Link href={`/sites/${r.siteId}/mcp`} className="text-neutral-800 underline-offset-2 hover:underline">{r.siteName}</Link>
                <code className="font-mono text-xs text-neutral-700">{r.tool}</code>
                <span className={r.ok ? "text-emerald-700" : "text-red-700"}>{r.ok ? "ok" : "error"}</span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </>
  );
}
