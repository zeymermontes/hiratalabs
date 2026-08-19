import { and, eq, gte, lt, sql } from "drizzle-orm";
import { NextResponse } from "next/server";
import { costOf, fromMicros } from "@/lib/ai/pricing";
import { getAdminUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { aiModels, aiUsage, sites } from "@/lib/db/schema";
import { monthRange } from "@/lib/reports";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function cell(v: unknown) {
  const s = v == null ? "" : String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export async function GET(req: Request) {
  if (!(await getAdminUser())) return new NextResponse("Unauthorized", { status: 401 });

  const url = new URL(req.url);
  const month = url.searchParams.get("month") ?? "";
  const match = /^(\d{4})-(\d{2})$/.exec(month);
  if (!match) return new NextResponse("Bad month", { status: 400 });

  // El mismo rango que la pantalla: si aquí se cortara en medianoche UTC, el
  // CSV y el panel darían totales distintos para el mismo mes.
  const { from, to } = monthRange(month);

  const [rows, prices] = await Promise.all([
    db
      .select({
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
      .groupBy(sites.id, sites.name, sites.slug, aiUsage.provider, aiUsage.model)
      .orderBy(sites.name),
    db.select().from(aiModels),
  ]);

  const header = [
    "mes", "sitio", "subdominio", "proveedor", "modelo",
    "llamadas", "errores", "tokens_entrada", "tokens_salida",
    "precio_entrada_1m", "precio_salida_1m", "costo_usd",
  ];

  const lines = [header.join(",")];
  for (const r of rows) {
    const priceRow = prices.find((p) => p.provider === r.provider && p.model === r.model);
    // A zero price is missing configuration, not a free model.
    const price = priceRow && (priceRow.inputPriceMicros > 0 || priceRow.outputPriceMicros > 0)
      ? priceRow
      : undefined;
    const cost = price
      ? costOf(r.inputTokens, r.outputTokens, price.inputPriceMicros, price.outputPriceMicros)
      : null;

    lines.push([
      month, r.siteName, r.siteSlug, r.provider, r.model ?? "",
      r.calls, r.failures, r.inputTokens, r.outputTokens,
      price ? fromMicros(price.inputPriceMicros).toFixed(2) : "",
      price ? fromMicros(price.outputPriceMicros).toFixed(2) : "",
      cost === null ? "" : cost.toFixed(6),
    ].map(cell).join(","));
  }

  return new NextResponse("﻿" + lines.join("\n"), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="consumo-ia-${month}.csv"`,
    },
  });
}
