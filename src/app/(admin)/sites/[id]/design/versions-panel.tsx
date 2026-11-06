"use client";

import type { TemplateSummary, VersionRow } from "./editor-types";

const STATUS: Record<VersionRow["status"], { label: string; cls: string }> = {
  published: { label: "Publicada", cls: "bg-lime-tint text-lime-dark" },
  draft: { label: "Borrador", cls: "bg-purple-tint text-purple-dark" },
  archived: { label: "Archivada", cls: "bg-neutral-100 text-neutral-600" },
};

const fmt = new Intl.DateTimeFormat("es-MX", { dateStyle: "medium", timeStyle: "short", timeZone: "America/Mexico_City" });

export function VersionsPanel({
  versions, templates, busy, onRestore,
}: {
  versions: VersionRow[];
  templates: TemplateSummary[];
  busy: boolean;
  onRestore: (id: string) => void;
}) {
  if (versions.length === 0) {
    return <p className="hint">Todavía no hay versiones guardadas. Cada vez que publiques, la versión anterior queda aquí para que puedas regresar.</p>;
  }
  return (
    <div className="space-y-3">
      <p className="hint">Restaurar copia esa versión a tu borrador para que la revises; tu tienda no cambia hasta que publiques.</p>
      <ul className="space-y-2">
        {versions.map((v) => {
          const st = STATUS[v.status];
          const tpl = templates.find((t) => t.key === v.template)?.name ?? v.template;
          const when = v.status === "published" && v.publishedAt ? v.publishedAt : v.updatedAt;
          return (
            <li key={v.id} className="card flex items-center gap-3 p-3">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className={`pill ${st.cls}`}>{st.label}</span>
                  <span className="text-xs font-medium text-neutral-700">Plantilla {tpl}</span>
                </div>
                <p className="mt-1 text-xs text-neutral-500">
                  {v.status === "draft" ? "Último cambio: " : v.status === "published" ? "Publicada el " : "Guardada el "}
                  <time dateTime={when}>{fmt.format(new Date(when))}</time>
                </p>
                {v.label ? <p className="truncate text-[11px] text-neutral-400">{v.label}</p> : null}
              </div>
              {v.status !== "draft" ? (
                <button type="button" disabled={busy} onClick={() => onRestore(v.id)} className="btn-secondary min-h-9 shrink-0 py-1 text-xs">
                  Restaurar al borrador
                </button>
              ) : null}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
