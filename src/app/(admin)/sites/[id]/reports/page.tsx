import { and, eq, gte } from "drizzle-orm";
import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { aiModels, aiUsage, siteVersions, sites, submissions } from "@/lib/db/schema";
import { formatUsd } from "@/lib/ai/pricing";
import { lastMonths, monthKey, findPrice, rowCost, totalsByModel, REPORT_TIMEZONE } from "@/lib/reports";
import { Empty, StatusPill } from "@/components/ui";
import { MonthlyBars, type Bar } from "./monthly-bars";

export const dynamic = "force-dynamic";

const TIMEZONE = REPORT_TIMEZONE;
const MONTHS_SHOWN = 6;

export default async function ReportsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [site] = await db.select().from(sites).where(eq(sites.id, id));
  if (!site) notFound();

  const months = lastMonths(MONTHS_SHOWN);
  const since = new Date();
  since.setUTCMonth(since.getUTCMonth() - MONTHS_SHOWN);
  since.setUTCDate(1);
  since.setUTCHours(0, 0, 0, 0);

  const [usage, msgs, prices, versions] = await Promise.all([
    db.select().from(aiUsage).where(and(eq(aiUsage.siteId, id), gte(aiUsage.createdAt, since))),
    db.select().from(submissions).where(and(eq(submissions.siteId, id), gte(submissions.createdAt, since))),
    db.select().from(aiModels),
    db.select().from(siteVersions).where(eq(siteVersions.siteId, id)),
  ]);

  // A model saved without a price is missing configuration, not a free model.
  const priceOf = (provider: string, model: string | null) => findPrice(prices, provider, model);
  const costOfRow = (row: (typeof usage)[number]) => rowCost(row, prices);

  const thisMonth = months[months.length - 1].key;
  const inMonth = <T extends { createdAt: Date }>(rows: T[], key: string) =>
    rows.filter((r) => monthKey(r.createdAt) === key);

  const usageNow = inMonth(usage, thisMonth);
  const msgsNow = inMonth(msgs, thisMonth);
  const okNow = usageNow.filter((u) => u.ok);

  const totals = {
    cost: okNow.reduce((n, r) => n + costOfRow(r), 0),
    calls: okNow.length,
    tokens: okNow.reduce((n, r) => n + (r.inputTokens ?? 0) + (r.outputTokens ?? 0), 0),
    messages: msgsNow.length,
  };

  const missingPrice = okNow.some((r) => !priceOf(r.provider, r.model));

  const nf = new Intl.NumberFormat("es-MX");

  const costBars: Bar[] = months.map((m) => {
    const value = inMonth(usage, m.key).filter((u) => u.ok).reduce((n, r) => n + costOfRow(r), 0);
    return { label: m.short, caption: m.long, value, display: formatUsd(value) };
  });

  const messageBars: Bar[] = months.map((m) => {
    const value = inMonth(msgs, m.key).length;
    return { label: m.short, caption: m.long, value, display: nf.format(value) };
  });

  const byModel = totalsByModel(okNow, prices);

  const byForm = new Map<string, number>();
  for (const m of msgsNow) byForm.set(m.formName ?? "contacto", (byForm.get(m.formName ?? "contacto") ?? 0) + 1);

  const delivery = { sent: 0, failed: 0, skipped: 0, pending: 0 };
  for (const m of msgsNow) {
    if (m.emailStatus === "sent") delivery.sent++;
    else if (m.emailStatus === "failed") delivery.failed++;
    else if (m.emailStatus === "skipped") delivery.skipped++;
    else delivery.pending++;
  }

  const failedCalls = usageNow.filter((u) => !u.ok).length;
  const monthLabel = months[months.length - 1].long;

  const tiles = [
    { label: "Costo de IA", value: missingPrice ? "—" : formatUsd(totals.cost), hint: "este mes" },
    { label: "Llamadas al modelo", value: nf.format(totals.calls), hint: failedCalls ? `${failedCalls} con error` : "sin errores" },
    { label: "Tokens", value: nf.format(totals.tokens), hint: "entrada + salida" },
    { label: "Mensajes recibidos", value: nf.format(totals.messages), hint: `${byForm.size} formulario${byForm.size === 1 ? "" : "s"}` },
  ];

  return (
    <div className="space-y-8">
      <p className="text-sm text-neutral-500">
        {monthLabel} · el costo sale de los precios capturados en{" "}
        <Link href="/ai" className="underline underline-offset-2">Llaves de IA</Link>.
      </p>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {tiles.map((t) => (
          <div key={t.label} className="card p-4">
            <p className="text-xs uppercase tracking-wide text-neutral-500">{t.label}</p>
            <p className="mt-1 text-2xl font-semibold tabular-nums text-neutral-900">{t.value}</p>
            <p className="hint mt-0.5">{t.hint}</p>
          </div>
        ))}
      </div>

      {missingPrice ? (
        <p className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
          Falta capturar el precio de algún modelo, así que el costo de este sitio está incompleto.
          Complétalo en <Link href="/ai" className="underline underline-offset-2">Llaves de IA</Link>.
        </p>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="card p-5">
          <h2 className="text-sm font-semibold text-neutral-900">Costo de IA por mes</h2>
          <p className="hint mb-4">Últimos {MONTHS_SHOWN} meses, en dólares.</p>
          <MonthlyBars bars={costBars} empty="Sin consumo registrado todavía." />
        </section>

        <section className="card p-5">
          <h2 className="text-sm font-semibold text-neutral-900">Mensajes recibidos por mes</h2>
          <p className="hint mb-4">Formularios y chat, juntos.</p>
          <MonthlyBars bars={messageBars} empty="Sin mensajes todavía." />
        </section>
      </div>

      <section>
        <h2 className="mb-3 text-sm font-semibold text-neutral-900">Consumo por modelo · {monthLabel}</h2>
        {byModel.length === 0 ? (
          <Empty title="Sin llamadas este mes" body="Cuando alguien use el chat de cotización, el detalle aparece aquí." />
        ) : (
          <div className="card overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-neutral-200 text-xs uppercase tracking-wide text-neutral-500">
                  <th className="px-5 py-3 text-left font-medium">Modelo</th>
                  <th className="px-5 py-3 text-right font-medium">Llamadas</th>
                  <th className="px-5 py-3 text-right font-medium">Tokens</th>
                  <th className="px-5 py-3 text-right font-medium">Costo</th>
                </tr>
              </thead>
              <tbody>
                {byModel.map((m) => (
                  <tr key={`${m.provider}-${m.model}`} className="border-b border-neutral-100 last:border-0">
                    <td className="px-5 py-3">
                      <span className="font-mono text-xs text-neutral-900">{m.model ?? "(sin modelo)"}</span>
                      <span className="ml-2 text-xs text-neutral-400">{m.provider}</span>
                    </td>
                    <td className="px-5 py-3 text-right tabular-nums">{nf.format(m.calls)}</td>
                    <td className="px-5 py-3 text-right tabular-nums">{nf.format(m.tokens)}</td>
                    <td className="px-5 py-3 text-right font-medium tabular-nums">
                      {m.priced ? formatUsd(m.cost) : <span className="text-amber-700">sin precio</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <section>
          <h2 className="mb-3 text-sm font-semibold text-neutral-900">Mensajes por formulario</h2>
          {byForm.size === 0 ? (
            <p className="hint">Sin mensajes este mes.</p>
          ) : (
            <div className="card divide-y divide-neutral-100">
              {Array.from(byForm.entries()).sort((a, b) => b[1] - a[1]).map(([name, count]) => (
                <div key={name} className="flex items-center gap-3 px-5 py-3 text-sm">
                  <span className="flex-1 truncate text-neutral-800">{name}</span>
                  <span className="tabular-nums text-neutral-900">{nf.format(count)}</span>
                </div>
              ))}
            </div>
          )}
        </section>

        <section>
          <h2 className="mb-3 text-sm font-semibold text-neutral-900">Entrega por correo</h2>
          <div className="card divide-y divide-neutral-100">
            {[
              { estado: "sent", label: "Enviados", n: delivery.sent },
              { estado: "failed", label: "Fallaron", n: delivery.failed },
              { estado: "skipped", label: "Sin destinatarios", n: delivery.skipped },
            ].map((row) => (
              <div key={row.estado} className="flex items-center gap-3 px-5 py-3 text-sm">
                <StatusPill status={row.estado} />
                <span className="flex-1 text-neutral-700">{row.label}</span>
                <span className="tabular-nums text-neutral-900">{nf.format(row.n)}</span>
              </div>
            ))}
          </div>
          {delivery.failed > 0 ? (
            <p className="mt-2 text-xs text-red-700">
              Revisa el detalle en <Link href={`/sites/${id}/submissions`} className="underline underline-offset-2">Mensajes</Link>.
            </p>
          ) : null}
          {delivery.skipped > 0 ? (
            <p className="mt-2 text-xs text-amber-700">
              Hay mensajes que nadie recibió por correo: falta capturar destinatarios en{" "}
              <Link href={`/sites/${id}/settings`} className="underline underline-offset-2">Contacto</Link>.
            </p>
          ) : null}
        </section>
      </div>

      <section className="card flex flex-wrap items-center gap-x-8 gap-y-2 p-5 text-sm text-neutral-600">
        <span>Versiones publicadas: <strong className="text-neutral-900">{versions.length}</strong></span>
        <span>
          Última:{" "}
          <strong className="text-neutral-900">
            {versions.length
              ? new Intl.DateTimeFormat("es-MX", { timeZone: TIMEZONE, dateStyle: "medium" })
                  .format(versions.reduce((a, b) => (a.createdAt > b.createdAt ? a : b)).createdAt)
              : "—"}
          </strong>
        </span>
        <a href={`/api/export/${id}/submissions.csv`} className="ml-auto btn-secondary">Mensajes en CSV</a>
      </section>
    </div>
  );
}
