import { costOf } from "@/lib/ai/pricing";

/** Reports bucket by month in Mexico City, the same clock the emails use. */
export const REPORT_TIMEZONE = "America/Mexico_City";

export function monthKey(date: Date, timeZone = REPORT_TIMEZONE): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone, year: "numeric", month: "2-digit",
  }).formatToParts(date);
  const y = parts.find((p) => p.type === "year")!.value;
  const m = parts.find((p) => p.type === "month")!.value;
  return `${y}-${m}`;
}

export type MonthSlot = { key: string; short: string; long: string };

export function lastMonths(count: number, now = new Date()): MonthSlot[] {
  const out: MonthSlot[] = [];
  for (let i = count - 1; i >= 0; i--) {
    // Day 15 keeps the label on the intended month whatever the offset.
    const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - i, 15));
    out.push({
      key: monthKey(d),
      short: new Intl.DateTimeFormat("es-MX", { timeZone: REPORT_TIMEZONE, month: "short" })
        .format(d).replace(".", ""),
      long: new Intl.DateTimeFormat("es-MX", { timeZone: REPORT_TIMEZONE, month: "long", year: "numeric" })
        .format(d),
    });
  }
  return out;
}

export type PriceRow = { provider: string; model: string | null; inputPriceMicros: number; outputPriceMicros: number };
export type UsageRow = {
  provider: string; model: string | null; ok: boolean;
  inputTokens: number | null; outputTokens: number | null; createdAt: Date;
};

/** A price of zero is missing configuration, not a free model. */
export function findPrice(prices: PriceRow[], provider: string, model: string | null): PriceRow | null {
  const p = prices.find((x) => x.provider === provider && x.model === model);
  return p && (p.inputPriceMicros > 0 || p.outputPriceMicros > 0) ? p : null;
}

export function rowCost(row: UsageRow, prices: PriceRow[]): number {
  const p = findPrice(prices, row.provider, row.model);
  return p ? costOf(row.inputTokens ?? 0, row.outputTokens ?? 0, p.inputPriceMicros, p.outputPriceMicros) : 0;
}

export type ModelTotals = {
  provider: string; model: string | null;
  calls: number; tokens: number; cost: number; priced: boolean;
};

export function totalsByModel(rows: UsageRow[], prices: PriceRow[]): ModelTotals[] {
  const map = new Map<string, ModelTotals>();
  for (const r of rows) {
    if (!r.ok) continue;
    const key = `${r.provider}|${r.model ?? ""}`;
    const entry = map.get(key) ?? {
      provider: r.provider, model: r.model, calls: 0, tokens: 0, cost: 0,
      priced: Boolean(findPrice(prices, r.provider, r.model)),
    };
    entry.calls += 1;
    entry.tokens += (r.inputTokens ?? 0) + (r.outputTokens ?? 0);
    entry.cost += rowCost(r, prices);
    map.set(key, entry);
  }
  return Array.from(map.values()).sort((a, b) => b.cost - a.cost || b.calls - a.calls);
}
