"use client";

import { useActionState, useState, useTransition } from "react";
import { Field } from "@/components/ui";
import { clearMpCredentials, saveMpCredentials, testMpConnection, type ActionState } from "./actions";

type Values = {
  publicKey: string;
  accessTokenHint: string | null;
  mode: "test" | "live" | null;
  statementDescriptor: string;
  hasWebhookSecret: boolean;
};

export function PaymentsForm({ siteId, values, canManage }: { siteId: string; values: Values; canManage: boolean }) {
  const [state, action, pending] = useActionState<ActionState, FormData>(saveMpCredentials, {});
  const [testing, startTest] = useTransition();
  const [test, setTest] = useState<ActionState | null>(null);

  return (
    <form action={action} className="space-y-6">
      <input type="hidden" name="siteId" value={siteId} />

      <section className="card p-5">
        <h3 className="mb-1 text-sm font-semibold text-neutral-900">Credenciales</h3>
        <p className="hint mb-4">
          En Mercado Pago: <strong>Tus integraciones → tu aplicación → Credenciales</strong>. Las de prueba empiezan con
          <code> TEST-</code>; las de producción con <code>APP_USR-</code>. Usa el par de la misma aplicación.
        </p>
        <div className="space-y-4">
          <Field label="Public Key">
            <input name="publicKey" defaultValue={values.publicKey} placeholder="APP_USR-…" autoComplete="off" className="input font-mono" disabled={!canManage} />
          </Field>
          <Field
            label={values.accessTokenHint ? `Access Token (guardado: ${values.accessTokenHint})` : "Access Token"}
            hint={values.accessTokenHint ? "Se guarda cifrado y no se vuelve a mostrar. Déjalo vacío para conservar el actual." : "Se guarda cifrado y no se vuelve a mostrar."}
          >
            <input name="accessToken" type="password" placeholder="APP_USR-…" autoComplete="new-password" className="input font-mono" disabled={!canManage} />
          </Field>
          <Field label="Texto en el estado de cuenta (opcional)" hint="Hasta 22 letras o números. Así aparece el cargo en la tarjeta del cliente.">
            <input name="statementDescriptor" defaultValue={values.statementDescriptor} maxLength={22} placeholder="MI TIENDA" className="input" disabled={!canManage} />
          </Field>
        </div>
      </section>

      <section className="card p-5">
        <h3 className="mb-1 text-sm font-semibold text-neutral-900">Webhook (avisos de pago)</h3>
        <p className="hint mb-4">
          Necesario para pagos en OXXO y transferencia, que se confirman horas después. En Mercado Pago → tu aplicación →
          <strong> Webhooks</strong>, registra la URL de arriba para el evento <strong>Pagos</strong> y pega aquí la clave secreta que te da.
        </p>
        <Field label={values.hasWebhookSecret ? "Clave secreta (ya hay una guardada)" : "Clave secreta"} hint="Opcional pero recomendada: con ella se verifica que el aviso venga de Mercado Pago.">
          <input name="webhookSecret" type="password" autoComplete="new-password" className="input font-mono" disabled={!canManage} />
        </Field>
        {values.hasWebhookSecret ? (
          <label className="mt-3 flex items-center gap-2 text-xs text-neutral-600">
            <input type="checkbox" name="clearWebhookSecret" className="h-4 w-4 rounded border-neutral-300" /> Quitar la clave guardada
          </label>
        ) : null}
      </section>

      {canManage ? (
        <div className="flex flex-wrap items-center gap-3">
          <button type="submit" disabled={pending} className="btn-primary">{pending ? "Guardando…" : "Guardar"}</button>
          <button type="button" disabled={testing || !values.accessTokenHint} className="btn-secondary" onClick={() => startTest(async () => setTest(await testMpConnection(siteId)))}>
            {testing ? "Probando…" : "Probar conexión"}
          </button>
          {values.accessTokenHint ? (
            <button type="button" className="btn-danger" onClick={() => { if (confirm("¿Quitar las credenciales? La tienda dejará de cobrar.")) startTest(async () => setTest(await clearMpCredentials(siteId))); }}>
              Quitar
            </button>
          ) : null}
          {state.error ? <span className="text-sm text-red-600">{state.error}</span> : null}
          {state.ok ? <span className="text-sm text-emerald-700">{state.message}</span> : null}
          {test?.error ? <span className="text-sm text-red-600">{test.error}</span> : null}
          {test?.ok ? <span className="text-sm text-emerald-700">{test.message}</span> : null}
        </div>
      ) : (
        <p className="hint">Solo el dueño de la tienda puede cambiar las credenciales.</p>
      )}
    </form>
  );
}
