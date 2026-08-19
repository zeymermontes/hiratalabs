import { and, eq, gte, lt, sql } from "drizzle-orm";
import Link from "next/link";
import { db } from "@/lib/db";
import { aiModels, aiUsage, sites } from "@/lib/db/schema";
import { costOf, formatUsd, fromMicros } from "@/lib/ai/pricing";
import { Empty, PageHeader } from "@/components/ui";
import { MonthPicker } from "./month-picker";

export const dynamic = "force-dynamic";

/** Months are counted in Mexico City, the same clock the emails use. */
const TIMEZONE = "America/Mexico_City";

function monthRange(value: string) {
  const [y, m] = value.split("-").map(Number);
  const from = new Date(Date.UTC(y, m - 1, 1));
  const to = new Date(Date.UTC(m === 12 ? y + 1 : y, m === 12 ? 0 : m, 1));
  return { from, to };
}

function monthOptions(count = 12) {
  const out: { value: string; label: string }[] = [];
  const now = new Date();
  for (let i = 0; i < count; i++) {
    const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - i, 1));
    const value = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
    out.push({
      value,
      label: new Intl.DateTimeFormat("es-MX", { timeZone: TIMEZONE, month: "long", year: "numeric" }).format(d),
    });
  }
  return out;
}

export default async function UsagePage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string }>;
}) {
  const months = monthOptions();
  const { month } = await searchParams;
  const selected = months.some((m) => m.value === month) ? month! : months[0].value;
  const { from, to } = monthRange(selected);

  const [rows, prices] = await Promise.all([
    db
      .select({
        siteId: sites.id,
        siteName: sites.name,
        siteSlug: sites.slug,
        provider: aiUsage.provider,
        model: aiUsage.model,
        calls: sql<number>`count(*) filter (where ${aiUsage.ok})::int`,
        failures: sql<number>`count(*) filter (where not ${aiUsage.ok})::int`,
        inputTokens: sql<number>`coalesce(sum(${aiUsage.inputTokens}), 0)::int`,
        outputTokens: sql<number>`coalesce(sum(${aiUsage.outputTokens}), 0)::int`,
      })
      .from(aiUsage)
      .innerJoin(sites, eq(sites.id, aiUsage.siteId))
      .where(and(gte(aiUsage.createdAt, from), lt(aiUsage.createdAt, to)))
      .groupBy(sites.id, sites.name, sites.slug, aiUsage.provider, aiUsage.model),
    db.select().from(aiModels),
  ]);

  // A model saved without a price would otherwise render as a genuine $0.00.
  const priceOf = (provider: string, model: string | null) => {
    const found = prices.find((p) => p.provider === provider && p.model === model);
    if (!found) return undefined;
    return found.inputPriceMicros > 0 || found.outputPriceMicros > 0 ? found : undefined;
  };

  type Line = {
    siteId: string; siteName: string; siteSlug: string;
    calls: number; failures: number;
    inputTokens: number; outputTokens: number;
    cost: number; priced: boolean;
    breakdown: { provider: string; model: string | null; calls: number; cost: number; priced: boolean }[];
  };

  const bySite = new Map<string, Line>();
  for (const r of rows) {
    const price = priceOf(r.provider, r.model);
    const cost = price
      ? costOf(r.inputTokens, r.outputTokens, price.inputPriceMicros, price.outputPriceMicros)
      : 0;

    const line = bySite.get(r.siteId) ?? {
      siteId: r.siteId, siteName: r.siteName, siteSlug: r.siteSlug,
      calls: 0, failures: 0, inputTokens: 0, outputTokens: 0,
      cost: 0, priced: true, breakdown: [],
    };
    line.calls += r.calls;
    line.failures += r.failures;
    line.inputTokens += r.inputTokens;
    line.outputTokens += r.outputTokens;
    line.cost += cost;
    if (!price && (r.inputTokens > 0 || r.outputTokens > 0)) line.priced = false;
    line.breakdown.push({ provider: r.provider, model: r.model, calls: r.calls, cost, priced: Boolean(price) });
    bySite.set(r.siteId, line);
  }

  const lines = Array.from(bySite.values()).sort((a, b) => b.cost - a.cost || b.calls - a.calls);
  const totals = lines.reduce(
    (acc, l) => ({
      calls: acc.calls + l.calls,
      inputTokens: acc.inputTokens + l.inputTokens,
      outputTokens: acc.outputTokens + l.outputTokens,
      cost: acc.cost + l.cost,
    }),
    { calls: 0, inputTokens: 0, outputTokens: 0, cost: 0 },
  );

  const nf = new Intl.NumberFormat("es-MX");

  return (
    <>
      <PageHeader
        title="Consumo de IA"
        subtitle="Tokens y costo por sitio, para poder cobrarlos. El costo sale de los precios que capturaste en Llaves de IA."
        actions={
          <div className="flex items-center gap-2">
            <MonthPicker months={months} selected={selected} />
            <a href={`/api/export/usage.csv?month=${selected}`} className="btn-secondary">CSV</a>
          </div>
        }
      />

      {lines.length === 0 ? (
        <Empty
          title="Sin consumo este mes"
          body="Cuando un visitante use el chat de cotización, cada llamada al modelo aparece aquí con sus tokens y su costo."
        />
      ) : (
        <>
          <div className="mb-4 grid gap-3 sm:grid-cols-4">
            {[
              { label: "Llamadas", value: nf.format(totals.calls) },
              { label: "Tokens de entrada", value: nf.format(totals.inputTokens) },
              { label: "Tokens de salida", value: nf.format(totals.outputTokens) },
              { label: "Costo estimado", value: formatUsd(totals.cost) },
            ].map((s) => (
              <div key={s.label} className="card p-4">
                <p className="text-xs uppercase tracking-wide text-neutral-500">{s.label}</p>
                <p className="mt-1 text-xl font-semibold tabular-nums text-neutral-900">{s.value}</p>
              </div>
            ))}
          </div>

          <div className="card divide-y divide-neutral-200">
            {lines.map((l) => (
              <details key={l.siteId} className="group">
                <summary className="flex cursor-pointer flex-wrap items-center gap-4 px-5 py-3.5 hover:bg-neutral-50">
                  <div className="min-w-0 flex-1">
                    <Link href={`/sites/${l.siteId}/chat`} className="text-sm font-medium text-neutral-900 hover:underline">
                      {l.siteName}
                    </Link>
                    <p className="mt-0.5 text-xs text-neutral-500">
                      {nf.format(l.calls)} llamadas
                      {l.failures > 0 ? ` · ${nf.format(l.failures)} con error` : ""}
                    </p>
                  </div>
                  <div className="text-right text-xs tabular-nums text-neutral-500">
                    <div>{nf.format(l.inputTokens)} in / {nf.format(l.outputTokens)} out</div>
                  </div>
                  <div className="w-24 text-right text-sm font-semibold tabular-nums text-neutral-900">
                    {l.priced ? formatUsd(l.cost) : "—"}
                  </div>
                </summary>

                <div className="border-t border-neutral-100 bg-neutral-50 px-5 py-3">
                  {l.breakdown.map((b, i) => (
                    <div key={i} className="flex flex-wrap items-center gap-3 py-1 text-xs">
                      <span className="font-mono text-neutral-700">{b.model ?? "(sin modelo)"}</span>
                      <span className="text-neutral-400">{b.provider}</span>
                      <span className="ml-auto tabular-nums text-neutral-500">{nf.format(b.calls)} llamadas</span>
                      <span className="w-20 text-right tabular-nums text-neutral-800">
                        {b.priced ? formatUsd(b.cost) : "sin precio"}
                      </span>
                    </div>
                  ))}
                  {!l.priced ? (
                    <p className="mt-2 text-xs text-amber-700">
                      Falta capturar el precio de algún modelo en{" "}
                      <Link href="/ai" className="underline underline-offset-2">Llaves de IA</Link>, así que el
                      costo de este sitio está incompleto.
                    </p>
                  ) : null}
                </div>
              </details>
            ))}
          </div>
        </>
      )}
    </>
  );
}
