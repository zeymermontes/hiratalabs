"use client";

import { useActionState, useState, useTransition } from "react";
import { Field } from "@/components/ui";
import { ORDER_STATUSES, ORDER_STATUS_LABEL } from "@/modules/orders/status";
import { COMMON_CARRIERS } from "@/modules/orders/shipping-carriers";
import { resendOrderEmail, saveOrderNotes, updateOrderStatus, type ActionState } from "../actions";

type Props = {
  siteId: string;
  orderId: string;
  status: string;
  fulfillment: "ship" | "pickup";
  trackingCarrier: string | null;
  trackingNumber: string | null;
};

export function StatusForm({ siteId, orderId, status: current, fulfillment, trackingCarrier, trackingNumber }: Props) {
  const [state, action, pending] = useActionState<ActionState, FormData>(updateOrderStatus, {});
  const [status, setStatus] = useState(current);
  const showTracking = fulfillment === "ship" && (status === "shipped" || status === "delivered");

  return (
    <form action={action} className="space-y-3">
      <input type="hidden" name="siteId" value={siteId} />
      <input type="hidden" name="orderId" value={orderId} />
      <Field label="Estado">
        <select name="status" value={status} onChange={(e) => setStatus(e.target.value)} className="input">
          {ORDER_STATUSES.map((s) => <option key={s} value={s}>{ORDER_STATUS_LABEL[s]}</option>)}
        </select>
      </Field>
      {showTracking ? (
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Paquetería">
            <input name="trackingCarrier" list="carriers" defaultValue={trackingCarrier ?? ""} placeholder="Estafeta, DHL…" className="input" />
            <datalist id="carriers">{COMMON_CARRIERS.map((c) => <option key={c} value={c} />)}</datalist>
          </Field>
          <Field label="Número de guía">
            <input name="trackingNumber" defaultValue={trackingNumber ?? ""} className="input" />
          </Field>
        </div>
      ) : null}
      <Field label="Nota (opcional)" hint={status === "cancelled" ? "Al cancelar se devuelve el inventario. La nota la ve el cliente en su historial." : "La ve el cliente en el historial de su pedido."}>
        <input name="note" maxLength={500} className="input" placeholder="Ej. Sale mañana por la tarde" />
      </Field>
      <div className="flex items-center gap-3">
        <button type="submit" disabled={pending} className="btn-primary">{pending ? "Guardando…" : status === current ? "Guardar" : `Cambiar a “${ORDER_STATUS_LABEL[status as keyof typeof ORDER_STATUS_LABEL]}”`}</button>
        {state.error ? <span className="text-sm text-red-600">{state.error}</span> : null}
        {state.ok ? <span className="text-sm text-emerald-700">{state.message}</span> : null}
      </div>
    </form>
  );
}

export function NotesForm({ siteId, orderId, notes }: { siteId: string; orderId: string; notes: string | null }) {
  const [state, action, pending] = useActionState<ActionState, FormData>(saveOrderNotes, {});
  return (
    <form action={action} className="space-y-2">
      <input type="hidden" name="siteId" value={siteId} />
      <input type="hidden" name="orderId" value={orderId} />
      <textarea name="notes" rows={3} defaultValue={notes ?? ""} className="input" placeholder="Notas internas o del cliente" />
      <div className="flex items-center gap-3">
        <button type="submit" disabled={pending} className="btn-secondary">{pending ? "Guardando…" : "Guardar notas"}</button>
        {state.error ? <span className="text-sm text-red-600">{state.error}</span> : null}
        {state.ok ? <span className="text-sm text-emerald-700">{state.message}</span> : null}
      </div>
    </form>
  );
}

export function ResendButton({ siteId, orderId }: { siteId: string; orderId: string }) {
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);
  return (
    <span className="inline-flex items-center gap-2">
      <button type="button" disabled={pending} className="btn-secondary" onClick={() => start(async () => { const r = await resendOrderEmail(siteId, orderId); setMsg(r.error ?? r.message ?? null); })}>
        {pending ? "Enviando…" : "Reenviar confirmación"}
      </button>
      {msg ? <span className="text-xs text-neutral-500">{msg}</span> : null}
    </span>
  );
}
