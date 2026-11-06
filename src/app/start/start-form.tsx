"use client";

import { useActionState, useState } from "react";
import { startSignup, type StartState } from "./actions";

type Tpl = {
  key: string; name: string; description: string; tags: string[]; highlights: string[];
  colors: Record<string, string>; display: string; body: string; demoUrl: string;
};

function fontsHref(templates: Tpl[]) {
  const fams = [...new Set(templates.flatMap((t) => [t.display, t.body]))].filter((f) => /^[A-Za-z0-9 ]+$/.test(f));
  return `https://fonts.googleapis.com/css2?${fams.map((f) => `family=${f.replace(/ /g, "+")}`).join("&")}&display=swap`;
}

function slugify(raw: string) {
  return raw.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim()
    .replace(/[^a-z0-9-]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 40);
}

export function StartForm({ open, rootDomain, templates }: { open: boolean; rootDomain: string; templates: Tpl[] }) {
  const [state, action, pending] = useActionState<StartState, FormData>(startSignup, {});
  const [step, setStep] = useState<1 | 2>(1);
  const [storeName, setStoreName] = useState("");
  const [slug, setSlug] = useState("");
  const [slugTouched, setSlugTouched] = useState(false);
  const [template, setTemplate] = useState(templates[0]?.key ?? "lumen");

  if (state.ok) {
    return (
      <div className="card p-6 text-ink">
        <div className="font-display text-3xl">Revisa tu correo</div>
        <p className="mt-2 text-sm text-neutral-600">
          Te mandamos un enlace de acceso. Al abrirlo, tu tienda <span className="font-mono">{state.slug}.{rootDomain}</span> queda creada y entras directo al panel.
        </p>
        <p className="hint mt-3">¿No llega? Revisa spam o vuelve a intentarlo en un minuto.</p>
      </div>
    );
  }

  return (
    <form action={action} className="card min-w-0 p-5 text-ink sm:p-6">
      <input type="hidden" name="template" value={template} />
      <ol className="mb-5 flex gap-2 text-xs font-semibold">
        <li className={`pill ${step === 1 ? "bg-purple text-white" : "bg-lime-tint text-lime-dark"}`}>1 · Tu negocio</li>
        <li className={`pill ${step === 2 ? "bg-purple text-white" : "bg-neutral-100 text-neutral-500"}`}>2 · Plantilla</li>
      </ol>

      <div className={step === 1 ? "space-y-4" : "hidden"}>
        <div>
          <label className="label" htmlFor="storeName">Nombre de la tienda</label>
          <input
            id="storeName" name="storeName" required value={storeName} className="input" placeholder="Verde Vivo"
            onChange={(e) => { setStoreName(e.target.value); if (!slugTouched) setSlug(slugify(e.target.value)); }}
          />
        </div>
        <div>
          <label className="label" htmlFor="slug">Dirección</label>
          <div className="flex items-stretch overflow-hidden rounded-lg border border-neutral-300 focus-within:border-purple focus-within:ring-2 focus-within:ring-purple/30">
            <input
              id="slug" name="slug" required value={slug} className="w-0 min-w-0 flex-1 bg-white px-3 py-2 font-mono text-sm outline-none"
              onChange={(e) => { setSlugTouched(true); setSlug(slugify(e.target.value)); }}
            />
            <span className="flex shrink-0 items-center bg-purple-tint px-2 font-mono text-xs text-purple-dark sm:px-3">.{rootDomain}</span>
          </div>
          <p className="hint mt-1">Después puedes conectar tu propio dominio.</p>
        </div>
        <div>
          <label className="label" htmlFor="email">Tu correo</label>
          <input id="email" name="email" type="email" required autoComplete="email" className="input" placeholder="tu@negocio.com" />
        </div>
        <div>
          <label className="label" htmlFor="business">¿Qué vendes? <span className="font-normal normal-case text-neutral-400">(opcional, la IA lo usa para proponerte textos)</span></label>
          <textarea id="business" name="business" rows={2} className="input" placeholder="Plantas de interior y macetas, envíos en Culiacán" />
        </div>
        <button
          type="button" className="btn-primary w-full"
          disabled={!storeName || slug.length < 3}
          onClick={() => setStep(2)}
        >
          Elegir plantilla →
        </button>
      </div>

      <div className={step === 2 ? "space-y-4" : "hidden"}>
        {/* eslint-disable-next-line @next/next/no-page-custom-font */}
        <link rel="stylesheet" href={fontsHref(templates)} />
        <p className="text-sm text-neutral-600">Elige cómo se verá tu tienda. Después puedes cambiar colores, letras, secciones o la plantilla completa.</p>
        <div
          role="radiogroup" aria-label="Plantilla"
          className="-mx-1 grid max-h-[55vh] min-w-0 gap-2.5 overflow-y-auto overscroll-contain px-1 py-1 sm:max-h-[28rem]"
        >
          {templates.map((t) => {
            const active = t.key === template;
            return (
              <div
                key={t.key}
                className={`min-w-0 overflow-hidden rounded-xl border transition ${active ? "border-purple ring-2 ring-purple/30" : "border-neutral-200 hover:border-neutral-400"}`}
              >
                <button
                  type="button" role="radio" aria-checked={active} onClick={() => setTemplate(t.key)}
                  className="flex w-full min-w-0 gap-3 p-2.5 text-left focus:outline-none focus-visible:bg-purple-tint"
                >
                  <span
                    className="flex h-20 w-24 shrink-0 flex-col justify-between rounded-lg p-2 sm:w-28"
                    style={{ background: t.colors.background, color: t.colors.foreground, border: `1px solid ${t.colors.muted}` }}
                    aria-hidden="true"
                  >
                    <span className="truncate text-base leading-none" style={{ fontFamily: `'${t.display}', serif` }}>{t.name}</span>
                    <span className="block h-1 w-14 rounded-full opacity-40" style={{ background: t.colors.foreground }} />
                    <span className="flex items-center gap-1">
                      <span className="block h-3 w-10 rounded-full" style={{ background: t.colors.primary }} />
                      <span className="block h-3 w-3 rounded-full" style={{ background: t.colors.accent }} />
                    </span>
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center justify-between gap-2">
                      <span className="block truncate text-sm font-semibold">{t.name}</span>
                      {active ? <span className="pill shrink-0 bg-purple text-white">Elegida</span> : null}
                    </span>
                    <span className="block truncate text-xs text-neutral-500">{t.tags.join(" · ")}</span>
                    <span className="mt-1 hidden space-y-0.5 text-xs text-neutral-700 sm:block">
                      {t.highlights.map((h) => (
                        <span key={h} className="flex min-w-0 gap-1"><span className="shrink-0 text-lime-dark">✓</span><span className="truncate">{h}</span></span>
                      ))}
                    </span>
                    {t.highlights[0] ? <span className="mt-1 block truncate text-xs text-neutral-700 sm:hidden">✓ {t.highlights[0]}</span> : null}
                  </span>
                </button>
                <div className="flex items-center justify-between gap-2 border-t border-neutral-100 px-2.5 py-1.5">
                  <span className="min-w-0 truncate text-[11px] text-neutral-500">{t.description}</span>
                  <a
                    href={t.demoUrl} target="_blank" rel="noreferrer"
                    className="shrink-0 text-xs font-semibold text-purple underline-offset-2 hover:underline"
                    aria-label={`Ver demo de ${t.name} (se abre en otra pestaña)`}
                  >
                    Ver demo ↗
                  </a>
                </div>
              </div>
            );
          })}
        </div>
        {state.error ? <p className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{state.error}</p> : null}
        {!open ? <p className="text-sm text-amber-700">El registro está cerrado por ahora.</p> : null}
        <div className="flex gap-2">
          <button type="button" onClick={() => setStep(1)} className="btn-secondary">← Atrás</button>
          <button type="submit" disabled={pending || !open} className="btn-accent flex-1">
            {pending ? "Creando…" : "Crear mi tienda"}
          </button>
        </div>
        <p className="hint">Al continuar aceptas el aviso de privacidad de Hirata Labs. Sin contraseñas: te mandamos un enlace de acceso.</p>
      </div>
    </form>
  );
}
