"use client";

import { useActionState } from "react";
import { sendTestMail, type ActionState } from "@/app/(admin)/actions";

export function TestEmailForm({ defaultTo, siteName }: { defaultTo: string; siteName: string }) {
  const [state, action, pending] = useActionState<ActionState, FormData>(sendTestMail, {});

  return (
    <form action={action} className="card flex flex-wrap items-end gap-3 p-5">
      <input type="hidden" name="siteName" value={siteName} />
      <div className="min-w-56 flex-1">
        <label className="label">Probar envío con Resend</label>
        <input name="to" defaultValue={defaultTo} placeholder="tu@correo.com" className="input" />
      </div>
      <button type="submit" disabled={pending} className="btn-secondary mb-0.5">
        {pending ? "Enviando…" : "Enviar prueba"}
      </button>
      <div className="w-full">
        {state.error ? <p className="text-sm text-red-600">{state.error}</p> : null}
        {state.ok ? <p className="text-sm text-emerald-700">{state.message}</p> : null}
      </div>
    </form>
  );
}
