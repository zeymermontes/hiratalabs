"use client";

import { useActionState, useState } from "react";
import { createSite, type ActionState } from "./actions";

export function NewSiteForm({ rootDomain }: { rootDomain: string }) {
  const [open, setOpen] = useState(false);
  const [state, action, pending] = useActionState<ActionState, FormData>(createSite, {});
  const [slug, setSlug] = useState("");

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
        <label className="label">Nombre</label>
        <input
          name="name" required autoFocus placeholder="Cliente ACME" className="input"
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
