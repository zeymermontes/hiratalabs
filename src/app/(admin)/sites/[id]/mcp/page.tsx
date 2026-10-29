import { desc, eq } from "drizzle-orm";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireSiteAccess } from "@/lib/auth";
import { db } from "@/lib/db";
import { sites } from "@/lib/db/schema";
import { env } from "@/lib/env";
import { isModuleEnabled } from "@/lib/modules";
import { mcpAudit, mcpTokens } from "@/modules/mcp/schema";
import { TOOLS } from "@/modules/mcp/tools";
import { CreateTokenForm, RevokeButton } from "./token-forms";

export const dynamic = "force-dynamic";

const fmt = new Intl.DateTimeFormat("es-MX", { dateStyle: "medium", timeStyle: "short" });
const when = (d: Date | null) => (d ? fmt.format(d) : "—");

export default async function SiteMcpPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await requireSiteAccess(id, { manage: true });
  const [site] = await db.select().from(sites).where(eq(sites.id, id));
  if (!site) notFound();

  const [enabled, tokens, audit] = await Promise.all([
    isModuleEnabled(site, "mcp_access"),
    db.select().from(mcpTokens).where(eq(mcpTokens.siteId, id)).orderBy(desc(mcpTokens.createdAt)),
    db.select({
      id: mcpAudit.id, tool: mcpAudit.tool, ok: mcpAudit.ok, ms: mcpAudit.ms, error: mcpAudit.error,
      createdAt: mcpAudit.createdAt, tokenName: mcpTokens.name, tokenPrefix: mcpTokens.prefix,
    }).from(mcpAudit)
      .leftJoin(mcpTokens, eq(mcpTokens.id, mcpAudit.tokenId))
      .where(eq(mcpAudit.siteId, id))
      .orderBy(desc(mcpAudit.createdAt))
      .limit(20),
  ]);

  const mcpUrl = `${env.appUrl.replace(/\/+$/, "")}/api/mcp`;
  const active = tokens.filter((t) => !t.revokedAt);
  const revoked = tokens.filter((t) => t.revokedAt);

  return (
    <div className="space-y-6">
      <section className="rounded-lg border border-neutral-200 bg-neutral-50 p-4 text-sm text-neutral-700">
        <p>
          Conecta <strong>tu propia IA</strong> (Claude Desktop, Cursor, ChatGPT u otro cliente MCP) a esta tienda.
          Tu IA podrá consultar productos, pedidos, ventas y mensajes, y, si le das permiso de escritura, crear
          productos o cambiar el estado de pedidos. Nunca ve otras tiendas, ni llaves, ni tokens.
        </p>
        <p className="mt-2 font-mono text-xs text-neutral-600">URL del servidor: {mcpUrl}</p>
      </section>

      {!enabled ? (
        <p className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
          El módulo está apagado: los tokens existen pero el servidor rechaza las llamadas. Actívalo en{" "}
          <Link href={`/sites/${id}/modules`} className="font-medium underline">Módulos</Link>.
        </p>
      ) : null}

      <CreateTokenForm siteId={id} mcpUrl={mcpUrl} />

      <section className="card">
        <div className="border-b border-neutral-200 px-5 py-3.5">
          <h3 className="text-sm font-semibold text-neutral-900">Tokens activos ({active.length})</h3>
        </div>
        {active.length === 0 ? (
          <p className="px-5 py-8 text-center text-sm text-neutral-500">Todavía no hay tokens. Crea uno arriba.</p>
        ) : (
          <ul className="divide-y divide-neutral-100">
            {active.map((t) => (
              <li key={t.id} className="flex flex-wrap items-center gap-3 px-5 py-3.5">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-medium text-neutral-900">{t.name}</span>
                    {t.scopes.includes("write") ? (
                      <span className="pill bg-amber-50 text-amber-800 ring-1 ring-inset ring-amber-200">lectura + escritura</span>
                    ) : (
                      <span className="pill bg-lime-tint text-lime-dark">solo lectura</span>
                    )}
                  </div>
                  <p className="mt-0.5 font-mono text-xs text-neutral-500">
                    {t.prefix}… · creado {when(t.createdAt)}{t.createdBy ? ` por ${t.createdBy}` : ""} · último uso {when(t.lastUsedAt)}
                  </p>
                </div>
                <RevokeButton siteId={id} tokenId={t.id} name={t.name} />
              </li>
            ))}
          </ul>
        )}
        {revoked.length > 0 ? (
          <details className="border-t border-neutral-200 px-5 py-3">
            <summary className="cursor-pointer text-xs text-neutral-500">Revocados ({revoked.length})</summary>
            <ul className="mt-2 space-y-1">
              {revoked.map((t) => (
                <li key={t.id} className="font-mono text-xs text-neutral-400 line-through">
                  {t.name} · {t.prefix}… · revocado {when(t.revokedAt)}
                </li>
              ))}
            </ul>
          </details>
        ) : null}
      </section>

      <section className="card">
        <div className="border-b border-neutral-200 px-5 py-3.5">
          <h3 className="text-sm font-semibold text-neutral-900">Últimas llamadas</h3>
          <p className="hint mt-0.5">Cada herramienta que usa tu IA queda registrada aquí, con éxito o error.</p>
        </div>
        {audit.length === 0 ? (
          <p className="px-5 py-8 text-center text-sm text-neutral-500">Sin llamadas todavía.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="text-xs uppercase tracking-wide text-neutral-500">
                <tr>
                  <th className="px-5 py-2 font-medium">Cuándo</th>
                  <th className="px-3 py-2 font-medium">Token</th>
                  <th className="px-3 py-2 font-medium">Herramienta</th>
                  <th className="px-3 py-2 font-medium">Resultado</th>
                  <th className="px-3 py-2 text-right font-medium">ms</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {audit.map((r) => (
                  <tr key={r.id}>
                    <td className="whitespace-nowrap px-5 py-2 text-neutral-600">{when(r.createdAt)}</td>
                    <td className="px-3 py-2 text-neutral-700">{r.tokenName ?? "(borrado)"}</td>
                    <td className="px-3 py-2 font-mono text-xs text-neutral-800">{r.tool}</td>
                    <td className="px-3 py-2">
                      {r.ok ? (
                        <span className="text-emerald-700">ok</span>
                      ) : (
                        <span className="text-red-700" title={r.error ?? ""}>error{r.error ? ` · ${r.error.slice(0, 60)}` : ""}</span>
                      )}
                    </td>
                    <td className="px-3 py-2 text-right text-neutral-500">{r.ms ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="card p-5">
        <h3 className="text-sm font-semibold text-neutral-900">Herramientas disponibles</h3>
        <ul className="mt-2 grid gap-x-6 gap-y-1 text-sm sm:grid-cols-2">
          {TOOLS.map((t) => (
            <li key={t.name} className="flex items-baseline gap-2">
              <code className="font-mono text-xs text-neutral-800">{t.name}</code>
              <span className={`pill ${t.scope === "write" ? "bg-amber-50 text-amber-800" : "bg-neutral-100 text-neutral-600"}`}>
                {t.scope === "write" ? "escritura" : "lectura"}
              </span>
            </li>
          ))}
        </ul>
      </section>

      <section className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
        <p className="font-medium">Seguridad</p>
        <ul className="mt-1 list-disc space-y-1 pl-5">
          <li>Un token es como una contraseña: quien lo tenga puede leer tu tienda. No lo compartas ni lo pegues en chats públicos.</li>
          <li>Si crees que se filtró, revócalo aquí; deja de funcionar al instante y creas otro en segundos.</li>
          <li>Los tokens nacen de solo lectura. Da escritura únicamente a la IA que de verdad va a editar productos o pedidos.</li>
          <li>Cada llamada queda en la bitácora de arriba con el nombre del token: si ves algo raro, revoca.</li>
        </ul>
      </section>
    </div>
  );
}
