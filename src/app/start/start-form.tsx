"use client";

import { useActionState, useState } from "react";
import { startSignup, type StartState } from "./actions";

type Tpl = { key: string; name: string; description: string; tags: string[]; colors: Record<string, string>; display: string };

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
        <div className="grid gap-2" role="radiogroup" aria-label="Plantilla">
          {templates.map((t) => {
            const active = t.key === template;
            return (
              <button
                type="button" key={t.key} role="radio" aria-checked={active} onClick={() => setTemplate(t.key)}
                className={`flex items-center gap-3 rounded-lg border p-2.5 text-left transition ${active ? "border-purple bg-purple-tint" : "border-neutral-200 hover:border-neutral-400"}`}
              >
                <span
                  className="flex h-12 w-16 shrink-0 flex-col justify-between rounded-md p-1.5"
                  style={{ background: t.colors.background, color: t.colors.foreground, fontFamily: `'${t.display}', serif` }}
                  aria-hidden="true"
                >
                  <span className="text-[11px] leading-none">{t.name}</span>
                  <span className="block h-2 w-8 rounded-full" style={{ background: t.colors.primary }} />
                </span>
                <span className="min-w-0">
                  <span className="block text-sm font-semibold">{t.name}</span>
                  <span className="block truncate text-xs text-neutral-500">{t.tags.join(" · ")}</span>
                </span>
              </button>
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
