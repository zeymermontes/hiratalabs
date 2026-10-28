"use client";

import { useActionState, useState } from "react";
import { resetCatalogEntry, saveCatalogEntry, type ActionState } from "@/app/(admin)/module-actions";
import { TierPill } from "@/components/ui";

type Props = {
  moduleKey: string;
  name: string;
  description: string;
  appliesTo: ("landing" | "store")[];
  core: boolean;
  available: boolean;
  tier: "free" | "paid";
  priceLabel: string | null;
  ownerCanToggle: boolean;
  notes: string | null;
  customized: boolean;
};

export function CatalogRow(p: Props) {
  const [open, setOpen] = useState(false);
  const [state, action, pending] = useActionState<ActionState, FormData>(saveCatalogEntry, {});

  return (
    <div className="px-4 py-3 sm:px-5">
      <div className="flex flex-wrap items-center gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-semibold text-neutral-900">{p.name}</span>
            <TierPill tier={p.tier} priceLabel={p.priceLabel} />
            {p.core ? <span className="pill bg-neutral-100 text-neutral-600">Incluido</span> : null}
            {!p.available ? <span className="pill bg-red-50 text-red-700">Retirado</span> : null}
            {p.customized ? <span className="pill bg-cyan-tint text-[#005d66]">Ajustado</span> : null}
          </div>
          <p className="hint mt-0.5">{p.description}</p>
          <p className="mt-1 font-mono text-[11px] text-neutral-400">
            {p.moduleKey} · {p.appliesTo.map((k) => (k === "store" ? "tiendas" : "landings")).join(" + ")} ·{" "}
            {p.ownerCanToggle ? "el dueño lo prende solo" : "lo activa la plataforma"}
          </p>
        </div>
        <button type="button" onClick={() => setOpen((v) => !v)} className="btn-secondary">
          {open ? "Cerrar" : "Ajustar"}
        </button>
      </div>

      {open ? (
        <form action={action} className="mt-3 grid gap-3 rounded-lg bg-neutral-50 p-3 sm:grid-cols-2">
          <input type="hidden" name="key" value={p.moduleKey} />
          <label className="flex min-h-11 items-center gap-2 text-sm">
            <input type="checkbox" name="available" defaultChecked={p.available} className="h-4 w-4 accent-purple" />
            Disponible en el catálogo
          </label>
          <label className="flex min-h-11 items-center gap-2 text-sm">
            <input type="checkbox" name="ownerCanToggle" defaultChecked={p.ownerCanToggle} disabled={p.core} className="h-4 w-4 accent-purple" />
            El dueño puede prenderlo/apagarlo
          </label>
          <div>
            <label className="label" htmlFor={`tier-${p.moduleKey}`}>Cobro</label>
            <select id={`tier-${p.moduleKey}`} name="tier" defaultValue={p.tier} className="input">
              <option value="free">Gratis (incluido)</option>
              <option value="paid">Extra (de pago)</option>
            </select>
          </div>
          <div>
            <label className="label" htmlFor={`price-${p.moduleKey}`}>Precio que se muestra</label>
            <input id={`price-${p.moduleKey}`} name="priceLabel" defaultValue={p.priceLabel ?? ""} placeholder="$299 MXN/mes" className="input" />
          </div>
          <div className="sm:col-span-2">
            <label className="label" htmlFor={`notes-${p.moduleKey}`}>Notas internas</label>
            <input id={`notes-${p.moduleKey}`} name="notes" defaultValue={p.notes ?? ""} className="input" />
          </div>
          {state.error ? <p className="text-xs text-red-600 sm:col-span-2">{state.error}</p> : null}
          {state.message ? <p className="text-xs text-emerald-700 sm:col-span-2">{state.message}</p> : null}
          <div className="flex gap-2 sm:col-span-2">
            <button type="submit" disabled={pending} className="btn-primary">{pending ? "Guardando…" : "Guardar"}</button>
            {p.customized ? (
              <button type="button" onClick={() => resetCatalogEntry(p.moduleKey)} className="btn-secondary">
                Volver al default
              </button>
            ) : null}
          </div>
        </form>
      ) : null}
    </div>
  );
}
