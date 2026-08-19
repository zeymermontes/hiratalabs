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

/**
 * Desfase de la zona del reporte, en minutos, para un instante dado. Se calcula
 * con Intl en vez de asumir -6: si algún día vuelve el horario de verano, esto
 * sigue siendo correcto.
 */
function tzOffsetMinutes(date: Date, timeZone = REPORT_TIMEZONE): number {
  const partes = new Intl.DateTimeFormat("en-US", {
    timeZone, hour12: false,
    year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", second: "2-digit",
  }).formatToParts(date);
  const v = (t: string) => Number(partes.find((p) => p.type === t)!.value);
  // hour puede venir como 24 a medianoche en algunos entornos.
  const comoUTC = Date.UTC(v("year"), v("month") - 1, v("day"), v("hour") % 24, v("minute"), v("second"));
  return (comoUTC - date.getTime()) / 60000;
}

/**
 * Instante UTC de la medianoche local del primer día del mes "YYYY-MM".
 * Sin esto los rangos cortaban en medianoche UTC —las 6pm del día anterior en
 * CDMX— y las filas de esa franja caían en el mes equivocado respecto a monthKey.
 */
export function monthStart(value: string): Date {
  const [y, m] = value.split("-").map(Number);
  const tentativo = new Date(Date.UTC(y, m - 1, 1));
  return new Date(tentativo.getTime() - tzOffsetMinutes(tentativo) * 60000);
}

/** Rango [desde, hasta) del mes, en instantes UTC pero con cortes locales. */
export function monthRange(value: string): { from: Date; to: Date } {
  const [y, m] = value.split("-").map(Number);
  const siguiente = m === 12 ? `${y + 1}-01` : `${y}-${String(m + 1).padStart(2, "0")}`;
  return { from: monthStart(value), to: monthStart(siguiente) };
}

/** Fecha y hora en la zona del reporte. El servidor corre en UTC. */
export function formatDateTime(date: Date | string): string {
  return new Intl.DateTimeFormat("es-MX", {
    timeZone: REPORT_TIMEZONE, dateStyle: "medium", timeStyle: "short",
  }).format(new Date(date));
}

/** Solo la fecha, en la zona del reporte. */
export function formatDate(date: Date | string): string {
  return new Intl.DateTimeFormat("es-MX", {
    timeZone: REPORT_TIMEZONE, dateStyle: "medium",
  }).format(new Date(date));
}

/** Meses seleccionables, del más reciente hacia atrás. */
export function monthOptions(count = 12, now = new Date()): { value: string; label: string }[] {
  const out: { value: string; label: string }[] = [];
  for (let i = 0; i < count; i++) {
    // Día 15, no día 1: con día 1 el valor se arma en UTC y la etiqueta en la
    // zona del reporte (UTC-6), así que el 1 de agosto se rotulaba "julio".
    const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - i, 15));
    out.push({
      value: `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`,
      label: new Intl.DateTimeFormat("es-MX", { timeZone: REPORT_TIMEZONE, month: "long", year: "numeric" })
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
