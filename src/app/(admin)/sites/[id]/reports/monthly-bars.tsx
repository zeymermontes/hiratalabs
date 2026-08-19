"use client";

import { useState } from "react";

export type Bar = { label: string; value: number; caption: string };

/**
 * One series, so no legend: the heading names it. Bars are thin, anchored to the
 * baseline with rounded data-ends, separated by a surface gap.
 */
export function MonthlyBars({
  bars, format, empty,
}: {
  bars: Bar[];
  format: (value: number) => string;
  empty: string;
}) {
  const [hover, setHover] = useState<number | null>(null);

  const max = Math.max(...bars.map((b) => b.value), 0);
  if (max === 0) return <p className="hint py-8 text-center">{empty}</p>;

  // Una sola etiqueta directa, en el mes más alto: el resto se lee al pasar el cursor.
  const peak = bars.reduce((best, b, i) => (b.value > bars[best].value ? i : best), 0);

  return (
    <div className="relative">
      <div className="flex h-40 items-end gap-2">
        {bars.map((b, i) => {
          const height = max === 0 ? 0 : Math.max(2, (b.value / max) * 100);
          const active = hover === i;
          return (
            <button
              key={b.label}
              type="button"
              // El área sensible es toda la columna, aunque la barra sea delgada.
              className="relative flex h-full flex-1 cursor-default flex-col items-center justify-end"
              onMouseEnter={() => setHover(i)}
              onMouseLeave={() => setHover(null)}
              onFocus={() => setHover(i)}
              onBlur={() => setHover(null)}
              aria-label={`${b.caption}: ${format(b.value)}`}
            >
              {i === peak && b.value > 0 ? (
                <span className="mb-1 text-[11px] font-medium tabular-nums text-neutral-600">
                  {format(b.value)}
                </span>
              ) : null}
              <span
                className="w-full max-w-9 rounded-t transition-opacity"
                style={{
                  height: `${height}%`,
                  background: "#6641E0",
                  opacity: hover === null || active ? 1 : 0.4,
                }}
              />
            </button>
          );
        })}
      </div>

      <div className="mt-2 flex gap-2">
        {bars.map((b, i) => (
          <span
            key={b.label}
            className={`flex-1 text-center text-[11px] tabular-nums ${
              i === peak || hover === i ? "text-neutral-700" : "text-neutral-400"
            }`}
          >
            {b.label}
          </span>
        ))}
      </div>

      {hover !== null ? (
        <div className="pointer-events-none absolute -top-1 left-0 right-0 flex justify-center">
          <span className="rounded-md bg-neutral-900 px-2 py-1 text-xs text-white shadow-sm">
            {bars[hover].caption} · <strong className="tabular-nums">{format(bars[hover].value)}</strong>
          </span>
        </div>
      ) : null}
    </div>
  );
}
