"use client";

import { useRouter, useSearchParams } from "next/navigation";

export function MonthPicker({ months, selected }: { months: { value: string; label: string }[]; selected: string }) {
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
        router.push(`/usage?${next.toString()}`);
      }}
      aria-label="Mes"
    >
      {months.map((m) => (
        <option key={m.value} value={m.value}>{m.label}</option>
      ))}
    </select>
  );
}
