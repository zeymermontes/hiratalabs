"use client";

import { useEffect, useId, useRef, useState } from "react";
import type { TemplateSummary } from "./editor-types";
import { Icon } from "./icons";

export function TemplatesPanel({
  templates, current, busy, onApply,
}: {
  templates: TemplateSummary[];
  current: string;
  busy: boolean;
  onApply: (key: string, style?: string) => Promise<boolean>;
}) {
  const [styleFor, setStyleFor] = useState<Record<string, string>>({});
  const [confirm, setConfirm] = useState<TemplateSummary | null>(null);

  return (
    <div className="space-y-3">
      <p className="hint">Cambiar de plantilla cambia el diseño completo. Tus productos, pedidos y clientes no se tocan.</p>
      {/* eslint-disable-next-line @next/next/no-page-custom-font */}
      <link rel="stylesheet" href={`https://fonts.googleapis.com/css2?${[...new Set(templates.map((t) => t.fonts.display))].map((f) => `family=${f.replace(/ /g, "+")}`).join("&")}&display=swap`} />
      <ul className="space-y-3">
        {templates.map((t) => {
          const styleKey = styleFor[t.key] ?? t.styles[0]?.key;
          const style = t.styles.find((s) => s.key === styleKey);
          const base = { ...t.schemes.base, ...(style?.schemes?.base ?? {}) };
          const display = style?.fonts?.display ?? t.fonts.display;
          const isCurrent = t.key === current;
          return (
            <li key={t.key} className={`card overflow-hidden ${isCurrent ? "border-purple ring-2 ring-purple/30" : ""}`}>
              <div className="flex h-24 flex-col justify-between p-3" style={{ background: base.bg, color: base.fg }} aria-hidden="true">
                <span className="text-2xl leading-none" style={{ fontFamily: `'${display}', serif` }}>{t.name}</span>
                <span className="flex items-center gap-1.5">
                  <span className="inline-block h-5 w-16 rounded-full" style={{ background: base.primary }} />
                  {(["alt", "invert", "accent"] as const).map((k) => (
                    <span key={k} className="h-4 w-4 rounded-full border border-black/10" style={{ background: { ...t.schemes[k], ...(style?.schemes?.[k] ?? {}) }.bg }} />
                  ))}
                </span>
              </div>
              <div className="space-y-2 p-3">
                <div className="flex items-center justify-between gap-2">
                  <h3 className="text-sm font-semibold text-neutral-900">{t.name}</h3>
                  {isCurrent ? <span className="pill bg-purple text-white">En uso</span> : null}
                </div>
                <p className="hint">{t.description}</p>
                {t.tags.length ? <p className="text-[11px] text-neutral-500">Ideal para: {t.tags.join(" · ")}</p> : null}
                {t.highlights.length ? (
                  <ul className="space-y-0.5 text-xs text-neutral-700">
                    {t.highlights.slice(0, 3).map((h) => <li key={h} className="flex gap-1.5"><span className="text-lime-dark">✓</span>{h}</li>)}
                  </ul>
                ) : null}
                {t.styles.length > 1 ? (
                  <div className="flex flex-wrap gap-1" role="radiogroup" aria-label={`Estilo de ${t.name}`}>
                    {t.styles.map((s) => {
                      const active = s.key === styleKey;
                      return (
                        <button
                          key={s.key} type="button" role="radio" aria-checked={active}
                          onClick={() => setStyleFor((m) => ({ ...m, [t.key]: s.key }))}
                          className={`pill border transition focus:outline-none focus-visible:ring-2 focus-visible:ring-purple/40 ${
                            active ? "border-purple bg-purple-tint text-purple-dark" : "border-neutral-200 bg-white text-neutral-600 hover:border-neutral-400"
                          }`}
                        >
                          {s.name}
                        </button>
                      );
                    })}
                  </div>
                ) : null}
                <div className="flex flex-wrap gap-2 pt-1">
                  <a href={t.demoUrl} target="_blank" rel="noreferrer" className="btn-secondary min-h-9 py-1 text-xs">
                    Ver demo <Icon name="external" className="h-3.5 w-3.5" />
                  </a>
                  <button type="button" disabled={busy} onClick={() => setConfirm(t)} className="btn-primary min-h-9 py-1 text-xs">
                    Usar esta plantilla
                  </button>
                </div>
              </div>
            </li>
          );
        })}
      </ul>

      <ConfirmDialog
        open={confirm !== null}
        title={confirm ? `¿Usar ${confirm.name}?` : ""}
        confirmLabel={busy ? "Aplicando…" : "Sí, usar esta plantilla"}
        busy={busy}
        onCancel={() => setConfirm(null)}
        onConfirm={async () => {
          if (!confirm) return;
          const ok = await onApply(confirm.key, styleFor[confirm.key] ?? confirm.styles[0]?.key);
          if (ok) setConfirm(null);
        }}
      >
        <p>Se reemplaza el diseño de tu borrador (secciones, colores y letras) por el de esta plantilla. Tu logo y el texto del anuncio se conservan.</p>
        <p className="mt-2">Tus productos, pedidos y clientes no cambian, y tu tienda pública sigue igual hasta que publiques.</p>
        <p className="mt-2">Si te arrepientes, usa <strong>Deshacer</strong> o recupera la versión anterior en <strong>Versiones</strong>.</p>
      </ConfirmDialog>
    </div>
  );
}

/** Diálogo modal accesible (usa <dialog> nativo: atrapa el foco y cierra con Esc). */
export function ConfirmDialog({
  open, title, children, confirmLabel, busy, danger, onCancel, onConfirm,
}: {
  open: boolean;
  title: string;
  children: React.ReactNode;
  confirmLabel: string;
  busy?: boolean;
  danger?: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);

  return (
    <dialog
      ref={ref} onCancel={(e) => { e.preventDefault(); if (!busy) onCancel(); }}
      aria-labelledby={titleId}
      className="m-auto w-[calc(100%-2rem)] max-w-md rounded-xl border border-neutral-200 bg-white p-0 text-neutral-900 shadow-xl backdrop:bg-ink/50"
    >
      <div className="p-5">
        <h2 id={titleId} className="text-base font-semibold">{title}</h2>
        <div className="mt-2 text-sm leading-relaxed text-neutral-600">{children}</div>
        <div className="mt-5 flex flex-wrap justify-end gap-2">
          <button type="button" onClick={onCancel} disabled={busy} className="btn-secondary">Cancelar</button>
          <button type="button" onClick={onConfirm} disabled={busy} className={danger ? "btn-danger" : "btn-primary"} autoFocus>
            {confirmLabel}
          </button>
        </div>
      </div>
    </dialog>
  );
}
