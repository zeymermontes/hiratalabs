"use client";

import { useTransition } from "react";
import { setSiteStatus } from "../../actions";

const OPTIONS = [
  { value: "live", label: "En línea", hint: "Visible para todos" },
  { value: "maintenance", label: "Mantenimiento", hint: "Muestra aviso, responde 503" },
  { value: "blocked", label: "Bloqueado", hint: "No disponible, responde 403" },
] as const;

export function StatusControls({ siteId, status }: { siteId: string; status: string }) {
  const [pending, start] = useTransition();

  return (
    <div className="flex items-center gap-1 rounded-lg border border-neutral-200 bg-white p-1">
      {OPTIONS.map((o) => (
        <button
          key={o.value}
          title={o.hint}
          disabled={pending}
          onClick={() => start(() => { void setSiteStatus(siteId, o.value); })}
          className={`rounded-md px-2.5 py-1.5 text-xs font-medium transition disabled:opacity-50 ${
            status === o.value ? "bg-neutral-900 text-white" : "text-neutral-600 hover:bg-neutral-100"
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
