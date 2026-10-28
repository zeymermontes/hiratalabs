"use client";

import { useActionState, useState } from "react";
import { Field } from "@/components/ui";
import type { ShippingConfig } from "@/modules/orders/shipping";
import { saveShippingSettings, type ActionState } from "../actions";

export function ShippingForm({ siteId, values }: { siteId: string; values: ShippingConfig }) {
  const [state, action, pending] = useActionState<ActionState, FormData>(saveShippingSettings, {});
  const [pickup, setPickup] = useState(values.pickupEnabled);

  return (
    <form action={action} className="space-y-6">
      <input type="hidden" name="siteId" value={siteId} />

      <section className="card p-5">
        <h3 className="mb-1 text-sm font-semibold text-neutral-900">Envío a domicilio</h3>
        <p className="hint mb-4">Un costo fijo por pedido. Si quieres, a partir de cierto monto el envío sale gratis.</p>
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Costo de envío (MXN)">
            <input name="flat" type="number" min={0} step="0.01" defaultValue={(values.flatCents / 100).toFixed(2)} className="input" />
          </Field>
          <Field label="Gratis a partir de (MXN)" hint="Vacío = nunca es gratis.">
            <input name="freeOver" type="number" min={0} step="0.01" defaultValue={values.freeOverCents !== null ? (values.freeOverCents / 100).toFixed(2) : ""} className="input" />
          </Field>
          <Field label="Tiempo estimado" hint="Se muestra en el checkout.">
            <input name="estimatedDays" defaultValue={values.estimatedDays ?? ""} placeholder="3 a 5 días hábiles" className="input" />
          </Field>
        </div>
      </section>

      <section className="card p-5">
        <label className="flex cursor-pointer items-start gap-3">
          <input type="checkbox" name="pickupEnabled" defaultChecked={values.pickupEnabled} onChange={(e) => setPickup(e.target.checked)} className="mt-0.5 h-4 w-4 rounded border-neutral-300" />
          <span>
            <span className="text-sm font-medium text-neutral-900">Permitir recoger en tienda</span>
            <span className="hint mt-0.5 block">Sin costo de envío. El cliente recibe un correo cuando marques el pedido como “Listo para recoger”.</span>
          </span>
        </label>
        {pickup ? (
          <div className="mt-4">
            <Field label="Instrucciones para recoger" hint="Dirección y horario. Lo ve el cliente al elegir esta opción.">
              <textarea name="pickupNote" rows={2} defaultValue={values.pickupNote ?? ""} placeholder="Av. Reforma 123, Col. Centro. Lunes a viernes de 10 a 18 h." className="input" />
            </Field>
          </div>
        ) : null}
      </section>

      <div className="flex items-center gap-3">
        <button type="submit" disabled={pending} className="btn-primary">{pending ? "Guardando…" : "Guardar"}</button>
        {state.error ? <span className="text-sm text-red-600">{state.error}</span> : null}
        {state.ok ? <span className="text-sm text-emerald-700">{state.message}</span> : null}
      </div>
    </form>
  );
}
