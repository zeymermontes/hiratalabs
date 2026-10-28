"use client";

import { useActionState, useState } from "react";
import { saveSiteTheme, type ActionState } from "@/app/(admin)/module-actions";

type TemplateOpt = {
  key: string; name: string; description: string; tags: string[];
  colors: Record<string, string>; fonts: Record<string, string>;
};
type Current = {
  template: string;
  colors: Record<string, string>;
  fonts: Record<string, string>;
  radius: string;
  logoUrl: string;
  announcement: string;
};

const COLOR_FIELDS: [string, string][] = [
  ["primary", "Color principal"], ["primaryForeground", "Texto sobre el principal"],
  ["accent", "Acento"], ["background", "Fondo"], ["foreground", "Texto"], ["muted", "Fondo suave"],
];

export function DesignForm({ siteId, templates, current }: { siteId: string; templates: TemplateOpt[]; current: Current }) {
  const [state, action, pending] = useActionState<ActionState, FormData>(saveSiteTheme, {});
  const [template, setTemplate] = useState(current.template);
  const [colors, setColors] = useState(current.colors);
  const [fonts, setFonts] = useState(current.fonts);

  function pick(t: TemplateOpt) {
    setTemplate(t.key);
    setColors(t.colors);
    setFonts(t.fonts);
  }

  return (
    <form action={action} className="space-y-8">
      <input type="hidden" name="siteId" value={siteId} />
      <input type="hidden" name="template" value={template} />

      <section>
        <h2 className="mb-1 text-sm font-semibold text-neutral-900">Plantilla</h2>
        <p className="hint mb-3">Elegir una plantilla carga sus colores y tipografías; después ajusta lo que quieras. Puedes cambiarla cuando sea sin perder productos ni pedidos.</p>
        <div className="stagger grid gap-3 sm:grid-cols-2 lg:grid-cols-3" role="radiogroup" aria-label="Plantilla">
          {templates.map((t) => {
            const active = t.key === template;
            return (
              <button
                type="button" key={t.key} role="radio" aria-checked={active} onClick={() => pick(t)}
                className={`card flex flex-col gap-2 p-3 text-left transition ${active ? "border-purple ring-2 ring-purple/30" : "hover:border-neutral-400"}`}
              >
                <div
                  className="flex h-24 flex-col justify-between rounded-lg p-3"
                  style={{ background: t.colors.background, color: t.colors.foreground, fontFamily: `'${t.fonts.display}', serif` }}
                >
                  <span className="text-lg leading-none">{t.name}</span>
                  <span className="inline-block h-5 w-20 rounded-full" style={{ background: t.colors.primary }} />
                </div>
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-semibold text-neutral-900">{t.name}</span>
                  {active ? <span className="pill bg-purple text-white">Elegida</span> : null}
                </div>
                <p className="hint">{t.description}</p>
                <p className="text-[11px] text-neutral-400">{t.tags.join(" · ")}</p>
              </button>
            );
          })}
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <div className="card space-y-3 p-5">
          <h2 className="text-sm font-semibold text-neutral-900">Colores</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {COLOR_FIELDS.map(([k, label]) => (
              <label key={k} className="flex items-center gap-3 text-sm">
                <input
                  type="color" name={`color_${k}`} value={colors[k] ?? "#000000"}
                  onChange={(e) => setColors({ ...colors, [k]: e.target.value })}
                  className="h-10 w-12 cursor-pointer rounded border border-neutral-300 bg-white p-0.5"
                  aria-label={label}
                />
                <span className="flex flex-col"><span className="font-medium text-neutral-800">{label}</span><span className="font-mono text-xs text-neutral-500">{colors[k]}</span></span>
              </label>
            ))}
          </div>
        </div>

        <div className="card space-y-3 p-5">
          <h2 className="text-sm font-semibold text-neutral-900">Tipografía y forma</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="label" htmlFor="font_display">Títulos (Google Fonts)</label>
              <input id="font_display" name="font_display" value={fonts.display ?? ""} onChange={(e) => setFonts({ ...fonts, display: e.target.value })} className="input" />
            </div>
            <div>
              <label className="label" htmlFor="font_body">Texto (Google Fonts)</label>
              <input id="font_body" name="font_body" value={fonts.body ?? ""} onChange={(e) => setFonts({ ...fonts, body: e.target.value })} className="input" />
            </div>
            <div>
              <label className="label" htmlFor="radius">Esquinas</label>
              <select id="radius" name="radius" defaultValue={current.radius} className="input">
                <option value="none">Rectas</option>
                <option value="sm">Apenas redondeadas</option>
                <option value="md">Redondeadas</option>
                <option value="lg">Muy redondeadas</option>
                <option value="full">Píldora</option>
              </select>
            </div>
            <div>
              <label className="label" htmlFor="logoUrl">Logo (URL)</label>
              <input id="logoUrl" name="logoUrl" defaultValue={current.logoUrl} placeholder="https://…/logo.png" className="input" />
            </div>
            <div className="sm:col-span-2">
              <label className="label" htmlFor="announcement">Barra de anuncio</label>
              <input id="announcement" name="announcement" defaultValue={current.announcement} placeholder="Envío gratis en pedidos de $600 o más" className="input" />
            </div>
          </div>
        </div>
      </section>

      <section className="card p-5">
        <h2 className="mb-3 text-sm font-semibold text-neutral-900">Vista previa</h2>
        <div
          className="overflow-hidden rounded-xl border border-neutral-200"
          style={{ background: colors.background, color: colors.foreground, fontFamily: `'${fonts.body}', sans-serif` }}
        >
          <link rel="stylesheet" href={`https://fonts.googleapis.com/css2?family=${encodeURIComponent(fonts.display ?? "")}&family=${encodeURIComponent(fonts.body ?? "")}&display=swap`} />
          <div className="flex items-center justify-between px-5 py-3" style={{ borderBottom: `1px solid ${colors.muted}` }}>
            <span style={{ fontFamily: `'${fonts.display}', serif`, fontSize: 20, fontWeight: 700 }}>Tu tienda</span>
            <span className="text-xs font-semibold">Productos · Contacto</span>
          </div>
          <div className="flex flex-wrap items-center gap-6 p-6">
            <div className="flex-1 basis-60">
              <div style={{ fontFamily: `'${fonts.display}', serif`, fontSize: 36, lineHeight: 1 }}>Así se verá tu portada.</div>
              <p className="mt-3 text-sm opacity-80">Cambia los colores y verás el resultado aquí antes de guardar.</p>
              <span className="mt-4 inline-flex min-h-11 items-center rounded-full px-5 text-sm font-bold" style={{ background: colors.primary, color: colors.primaryForeground }}>
                Ver productos
              </span>
            </div>
            <div className="h-32 flex-1 basis-40 rounded-xl" style={{ background: colors.accent }} />
          </div>
        </div>
      </section>

      {state.error ? <p className="text-xs text-red-600">{state.error}</p> : null}
      {state.message ? <p className="text-xs text-emerald-700">{state.message}</p> : null}
      <button type="submit" disabled={pending} className="btn-primary">{pending ? "Guardando…" : "Guardar diseño"}</button>
    </form>
  );
}
