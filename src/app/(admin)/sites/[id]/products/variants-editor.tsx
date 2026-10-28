"use client";

import { useActionState, useState, useTransition } from "react";
import { formatMXN } from "@/components/storefront/money";
import { deleteVariant, moveVariant, saveVariant, type ActionState } from "./actions";

export type VariantRow = { id: string; name: string; priceDeltaCents: number; sku: string | null; stock: number | null };

const toMXN = (cents: number) => (cents === 0 ? "" : (cents / 100).toFixed(2));

/**
 * Opciones del producto (tamaño, color…). Cada fila se edita en su lugar; la
 * diferencia de precio se suma al precio base.
 */
export function VariantsEditor({ siteId, productId, variants, basePriceCents }: {
  siteId: string; productId: string; variants: VariantRow[]; basePriceCents: number;
}) {
  return (
    <section className="card p-5">
      <h3 className="mb-1 text-sm font-semibold text-neutral-900">Opciones (variantes)</h3>
      <p className="hint mb-4">
        Tamaños, colores, materiales… El cliente elige una al comprar. La diferencia se suma al precio base
        ({formatMXN(basePriceCents)}); puede ser negativa.
      </p>

      {variants.length > 0 ? (
        <div className="mb-4 overflow-x-auto">
          <table className="w-full min-w-[640px] text-sm">
            <thead className="text-left text-xs uppercase tracking-wide text-neutral-500">
              <tr>
                <th className="py-1 pr-2">Nombre</th>
                <th className="py-1 pr-2">Diferencia (MXN)</th>
                <th className="py-1 pr-2">Precio final</th>
                <th className="py-1 pr-2">SKU</th>
                <th className="py-1 pr-2">Inventario</th>
                <th className="py-1" />
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {variants.map((v, i) => (
                <VariantRowForm key={v.id} siteId={siteId} productId={productId} variant={v} basePriceCents={basePriceCents} first={i === 0} last={i === variants.length - 1} />
              ))}
            </tbody>
          </table>
        </div>
      ) : null}

      <AddVariant siteId={siteId} productId={productId} />
    </section>
  );
}

function VariantRowForm({ siteId, productId, variant, basePriceCents, first, last }: {
  siteId: string; productId: string; variant: VariantRow; basePriceCents: number; first: boolean; last: boolean;
}) {
  const [state, action, pending] = useActionState<ActionState, FormData>(saveVariant, {});
  const [busy, start] = useTransition();
  const [delta, setDelta] = useState(toMXN(variant.priceDeltaCents));
  const deltaCents = Math.round((Number(delta.replace(/[$,\s]/g, "")) || 0) * 100);
  const formId = `variant-${variant.id}`;

  return (
    <tr>
      <td className="py-2 pr-2">
        <form id={formId} action={action}>
          <input type="hidden" name="siteId" value={siteId} />
          <input type="hidden" name="productId" value={productId} />
          <input type="hidden" name="variantId" value={variant.id} />
        </form>
        <input form={formId} name="name" defaultValue={variant.name} required className="input" />
      </td>
      <td className="py-2 pr-2">
        <input form={formId} name="priceDelta" inputMode="decimal" value={delta} onChange={(e) => setDelta(e.target.value)} placeholder="0.00" className="input w-28" />
      </td>
      <td className="py-2 pr-2 whitespace-nowrap font-medium">{formatMXN(Math.max(0, basePriceCents + deltaCents))}</td>
      <td className="py-2 pr-2"><input form={formId} name="sku" defaultValue={variant.sku ?? ""} className="input w-28 font-mono" /></td>
      <td className="py-2 pr-2"><input form={formId} name="stock" inputMode="numeric" defaultValue={variant.stock ?? ""} placeholder="∞" className="input w-20" /></td>
      <td className="py-2">
        <div className="flex items-center justify-end gap-1">
          <button type="button" disabled={first || busy} aria-label="Subir" onClick={() => start(() => moveVariant(siteId, productId, variant.id, -1))} className="btn-secondary px-2 disabled:opacity-30">↑</button>
          <button type="button" disabled={last || busy} aria-label="Bajar" onClick={() => start(() => moveVariant(siteId, productId, variant.id, 1))} className="btn-secondary px-2 disabled:opacity-30">↓</button>
          <button type="submit" form={formId} disabled={pending} className="btn-secondary">{pending ? "…" : "Guardar"}</button>
          <button type="button" disabled={busy} aria-label="Quitar" onClick={() => { if (confirm(`¿Quitar la opción "${variant.name}"?`)) start(() => deleteVariant(siteId, productId, variant.id)); }} className="btn-danger px-2">×</button>
        </div>
        {state.error ? <p className="mt-1 text-right text-xs text-red-600">{state.error}</p> : null}
      </td>
    </tr>
  );
}

function AddVariant({ siteId, productId }: { siteId: string; productId: string }) {
  const [state, action, pending] = useActionState<ActionState, FormData>(saveVariant, {});
  return (
    <form action={action} className="grid gap-2 rounded-lg border border-dashed border-neutral-300 p-3 sm:grid-cols-[1fr_120px_120px_90px_auto] sm:items-end">
      <input type="hidden" name="siteId" value={siteId} />
      <input type="hidden" name="productId" value={productId} />
      <div>
        <label className="label">Nueva opción</label>
        <input name="name" required placeholder="Ej. Grande" className="input" />
      </div>
      <div>
        <label className="label">Diferencia</label>
        <input name="priceDelta" inputMode="decimal" placeholder="+0.00" className="input" />
      </div>
      <div>
        <label className="label">SKU</label>
        <input name="sku" className="input font-mono" />
      </div>
      <div>
        <label className="label">Inventario</label>
        <input name="stock" inputMode="numeric" placeholder="∞" className="input" />
      </div>
      <button type="submit" disabled={pending} className="btn-secondary">{pending ? "Agregando…" : "+ Agregar"}</button>
      {state.error ? <p className="text-xs text-red-600 sm:col-span-5">{state.error}</p> : null}
    </form>
  );
}
