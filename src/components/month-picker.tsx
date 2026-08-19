"use client";

import { useRouter, useSearchParams } from "next/navigation";

/**
 * Cambia el mes conservando el resto de la query. `basePath` existe porque el
 * mismo selector se usa en Consumo global y en los reportes de cada sitio.
 */
export function MonthPicker({
  months, selected, basePath,
}: {
  months: { value: string; label: string }[];
  selected: string;
  basePath: string;
}) {
  const router = useRouter();
  const params = useSearchParams();

  return (
    <select
      className="input"
      style={{ width: "auto" }}
      value={selected}
      onChange={(e) => {
        const next = new URLSearchParams(params.toString());
        next.set("month", e.target.value);
        router.push(`${basePath}?${next.toString()}`);
      }}
      aria-label="Mes"
    >
      {months.map((m) => (
        <option key={m.value} value={m.value}>{m.label}</option>
      ))}
    </select>
  );
}
