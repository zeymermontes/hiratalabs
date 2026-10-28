"use client";

import { useActionState, useState } from "react";
import { createSite, type ActionState } from "./actions";

export function NewSiteForm({ rootDomain }: { rootDomain: string }) {
  const [open, setOpen] = useState(false);
  const [state, action, pending] = useActionState<ActionState, FormData>(createSite, {});
  const [slug, setSlug] = useState("");
  const [kind, setKind] = useState<"landing" | "store">("landing");

  if (!open) {
    return (
      <button onClick={() => setOpen(true)} className="btn-primary">
        Nuevo sitio
      </button>
    );
  }

  return (
    <form action={action} className="card w-full max-w-md space-y-3 p-4 sm:w-96">
      <div>
        <span className="label">Tipo de sitio</span>
        <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label="Tipo de sitio">
          {([
            ["landing", "Landing", "Subes un ZIP estático"],
            ["store", "Tienda", "Catálogo, carrito y pagos"],
          ] as const).map(([value, label, hint]) => (
            <label
              key={value}
              className={`flex cursor-pointer flex-col gap-0.5 rounded-lg border p-3 text-left transition ${
                kind === value ? "border-purple bg-purple-tint" : "border-neutral-300 bg-white hover:bg-neutral-50"
              }`}
            >
              <input
                type="radio" name="kind" value={value} checked={kind === value}
                onChange={() => setKind(value)} className="sr-only"
              />
              <span className="text-sm font-semibold text-neutral-900">{label}</span>
              <span className="text-xs text-neutral-500">{hint}</span>
            </label>
          ))}
        </div>
      </div>
      <div>
        <label className="label">Nombre</label>
        <input
          name="name" required autoFocus placeholder={kind === "store" ? "Tienda ACME" : "Cliente ACME"} className="input"
          onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]+/g, "-").replace(/^-+|-+$/g, ""))}
        />
      </div>
      <div>
        <label className="label">Subdominio</label>
        <div className="flex items-center gap-2">
          <input
            name="slug" value={slug} onChange={(e) => setSlug(e.target.value)}
            placeholder="acme" className="input" required
          />
          <span className="whitespace-nowrap text-xs text-neutral-400">.{rootDomain}</span>
        </div>
        <p className="hint mt-1">
          Usa <code className="rounded bg-neutral-100 px-1">www</code> para el sitio principal: ese responde
          en {rootDomain} y en www.{rootDomain}.
        </p>
      </div>
      {state.error ? <p className="text-xs text-red-600">{state.error}</p> : null}
      <div className="flex gap-2">
        <button type="submit" disabled={pending} className="btn-primary">
          {pending ? "Creando…" : "Crear"}
        </button>
        <button type="button" onClick={() => setOpen(false)} className="btn-secondary">
          Cancelar
        </button>
      </div>
    </form>
  );
}
