"use client";

import { useEffect, useMemo, useRef, useState } from "react";

export type GalleryTemplate = {
  key: string;
  name: string;
  description: string;
  category: string;
  categoryLabel: string;
  tags: string[];
  highlights: string[];
  /** Colores principales de cada estilo, para las muestras. */
  styles: { name: string; colors: string[] }[];
  demoUrl: string;
  startUrl: string;
};

/**
 * Galería de plantillas: filtros por giro, tarjetas con la portada real que se
 * recorre al pasar el cursor y una vista previa con selector celular/escritorio.
 */
export function TemplateGallery({ templates, categories }: { templates: GalleryTemplate[]; categories: [string, string][] }) {
  const [filter, setFilter] = useState("todas");
  const [preview, setPreview] = useState<GalleryTemplate | null>(null);
  // En celular se muestran 6 al inicio para que la página no sea interminable.
  const [expanded, setExpanded] = useState(false);
  const MOBILE_LIMIT = 6;
  const shown = useMemo(() => (filter === "todas" ? templates : templates.filter((t) => t.category === filter)), [filter, templates]);

  return (
    <div>
      <div className="-mx-4 mb-8 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:px-0" role="group" aria-label="Filtrar plantillas por giro">
        {[["todas", `Todas (${templates.length})`] as [string, string], ...categories].map(([key, label]) => (
          <button
            key={key} type="button" aria-pressed={filter === key} onClick={() => setFilter(key)}
            className="ld-chip min-h-11 shrink-0 rounded-full border border-ink/20 bg-white px-4 text-sm font-semibold text-ink transition hover:border-ink"
          >
            {label}
          </button>
        ))}
      </div>

      <ul className="grid gap-x-6 gap-y-12 sm:grid-cols-2 lg:grid-cols-3">
        {shown.map((t, idx) => (
          <li key={t.key} className={`ld-card group relative flex-col rounded-2xl bg-white p-3 ring-1 ring-ink/10 ${!expanded && idx >= MOBILE_LIMIT ? "hidden sm:flex" : "flex"}`}>
            <button type="button" onClick={() => setPreview(t)} className="relative block text-left" aria-label={`Vista previa de ${t.name}`}>
              <div className="relative aspect-[16/10] overflow-hidden rounded-xl bg-neutral-100 ring-1 ring-ink/10">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={`/plantillas/${t.key}-escritorio.webp`} alt="" loading="lazy" className="ld-shot block w-full" />
              </div>
              <div className="ld-phone absolute -bottom-6 right-3 w-[26%] rounded-[14px] border-[3px] border-ink bg-ink shadow-xl">
                <div className="aspect-[390/844] overflow-hidden rounded-[11px] bg-white">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={`/plantillas/${t.key}-celular.webp`} alt="" loading="lazy" className="block h-full w-full object-cover object-top" />
                </div>
              </div>
            </button>

            <div className="mt-4 flex flex-1 flex-col gap-2 px-1 pr-[28%]">
              <span className="font-mono text-[11px] uppercase tracking-wider text-purple">{t.categoryLabel}</span>
              <h3 className="font-display text-4xl leading-none tracking-wide text-ink">{t.name}</h3>
            </div>
            <div className="mt-2 flex flex-1 flex-col gap-3 px-1">
              <p className="text-sm leading-relaxed text-neutral-600">{t.description}</p>
              <div className="flex items-center gap-2" aria-label="Estilos de color">
                {t.styles.map((s) => (
                  <span key={s.name} title={s.name} className="flex overflow-hidden rounded-full ring-1 ring-ink/15">
                    {s.colors.map((c, i) => <span key={i} className="h-4 w-3" style={{ background: c }} />)}
                  </span>
                ))}
                <span className="font-mono text-[11px] text-neutral-500">{t.styles.length} estilos</span>
              </div>
              <div className="mt-auto flex flex-wrap gap-2 pt-1">
                <a href={t.startUrl} className="inline-flex min-h-11 items-center rounded-full bg-ink px-4 text-sm font-semibold text-cream transition hover:bg-purple">Usar esta</a>
                <a href={t.demoUrl} target="_blank" rel="noreferrer" className="inline-flex min-h-11 items-center gap-1 rounded-full border border-ink/20 px-4 text-sm font-semibold text-ink transition hover:border-ink">
                  Ver demo <span aria-hidden="true">↗</span>
                </a>
              </div>
            </div>
          </li>
        ))}
      </ul>
      {!expanded && shown.length > MOBILE_LIMIT ? (
        <button type="button" onClick={() => setExpanded(true)}
          className="mt-10 flex min-h-12 w-full items-center justify-center rounded-full border-2 border-ink font-semibold text-ink sm:hidden">
          Ver las {shown.length} plantillas
        </button>
      ) : null}

      <PreviewDialog template={preview} onClose={() => setPreview(null)} />
    </div>
  );
}

function PreviewDialog({ template, onClose }: { template: GalleryTemplate | null; onClose: () => void }) {
  const ref = useRef<HTMLDialogElement>(null);
  const [device, setDevice] = useState<"escritorio" | "celular">("escritorio");

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (template && !d.open) { setDevice(window.innerWidth < 640 ? "celular" : "escritorio"); d.showModal(); }
    if (!template && d.open) d.close();
  }, [template]);

  return (
    <dialog ref={ref} className="ld-dialog ld-light" onClose={onClose} onClick={(e) => { if (e.target === ref.current) onClose(); }} aria-labelledby="ld-preview-title">
      {template ? (
        <div className="flex max-h-[calc(100dvh-24px)] flex-col overflow-hidden rounded-2xl bg-cream text-ink">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-ink/10 px-4 py-3 sm:px-6">
            <div className="flex items-baseline gap-3">
              <h2 id="ld-preview-title" className="font-display text-3xl leading-none tracking-wide">{template.name}</h2>
              <span className="font-mono text-[11px] uppercase tracking-wider text-purple">{template.categoryLabel}</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex rounded-full bg-ink/5 p-1" role="group" aria-label="Dispositivo">
                {(["escritorio", "celular"] as const).map((d) => (
                  <button key={d} type="button" aria-pressed={device === d} onClick={() => setDevice(d)}
                    className={`min-h-9 rounded-full px-3 text-sm font-semibold capitalize transition ${device === d ? "bg-ink text-cream" : "text-ink/70 hover:text-ink"}`}>
                    {d}
                  </button>
                ))}
              </div>
              <button type="button" onClick={onClose} aria-label="Cerrar" className="flex h-11 w-11 items-center justify-center rounded-full hover:bg-ink/5">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" /></svg>
              </button>
            </div>
          </div>

          <div className="grid min-h-0 flex-1 gap-0 overflow-y-auto lg:grid-cols-[minmax(0,1fr)_300px]">
            <div className="flex justify-center bg-[#e3e6d8] p-4 sm:p-6">
              {device === "escritorio" ? (
                <div className="w-full max-w-3xl overflow-hidden rounded-lg bg-white shadow-lg ring-1 ring-ink/10">
                  <div className="flex items-center gap-1.5 border-b border-ink/10 px-3 py-2" aria-hidden="true">
                    <span className="h-2.5 w-2.5 rounded-full bg-ink/15" /><span className="h-2.5 w-2.5 rounded-full bg-ink/15" /><span className="h-2.5 w-2.5 rounded-full bg-ink/15" />
                    <span className="ml-2 truncate font-mono text-[11px] text-ink/60">demo-{template.key}.hiratalabs.com</span>
                  </div>
                  <div className="max-h-[60dvh] overflow-y-auto">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={`/plantillas/${template.key}-escritorio.webp`} alt={`Portada de ${template.name} en escritorio`} className="block w-full" />
                  </div>
                </div>
              ) : (
                <div className="w-[260px] rounded-[32px] border-[7px] border-ink bg-ink shadow-xl">
                  <div className="aspect-[390/844] overflow-hidden rounded-[25px] bg-white">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={`/plantillas/${template.key}-celular.webp`} alt={`Portada de ${template.name} en celular`} className="block h-full w-full object-cover object-top" />
                  </div>
                </div>
              )}
            </div>
            <div className="flex flex-col gap-4 p-5 sm:p-6">
              <p className="text-sm leading-relaxed text-neutral-600">{template.description}</p>
              <ul className="space-y-2 text-sm">
                {template.highlights.map((h) => (
                  <li key={h} className="flex gap-2"><span className="text-lime-dark" aria-hidden="true">✓</span>{h}</li>
                ))}
              </ul>
              <div>
                <p className="mb-2 font-mono text-[11px] uppercase tracking-wider text-neutral-500">Ideal para</p>
                <div className="flex flex-wrap gap-1.5">
                  {template.tags.map((tag) => <span key={tag} className="rounded-full bg-ink/5 px-2.5 py-1 text-xs font-semibold">{tag}</span>)}
                </div>
              </div>
              <div className="mt-auto flex flex-col gap-2 pt-2">
                <a href={template.startUrl} className="inline-flex min-h-12 items-center justify-center rounded-full bg-ink px-5 font-semibold text-cream transition hover:bg-purple">Usar esta plantilla</a>
                <a href={template.demoUrl} target="_blank" rel="noreferrer" className="inline-flex min-h-12 items-center justify-center gap-1 rounded-full border border-ink/20 px-5 font-semibold transition hover:border-ink">
                  Abrir la tienda demo <span aria-hidden="true">↗</span>
                </a>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </dialog>
  );
}
