"use client";

import { useActionState, useState } from "react";
import { saveSiteChat, type ActionState } from "../../../actions";
import { Field } from "@/components/ui";

const PROVIDERS = [
  { id: "anthropic", label: "Anthropic (Claude)" },
  { id: "openai", label: "OpenAI" },
  { id: "google", label: "Google (Gemini)" },
  { id: "groq", label: "Groq" },
  { id: "deepseek", label: "DeepSeek" },
];

export type ModelOption = { provider: string; model: string; isDefault: boolean };

export type ChatValues = {
  enabled: boolean;
  replacesForm: boolean;
  keyMode: "platform" | "own";
  provider: string;
  model: string;
  ownHint: string | null;
  launcherLabel: string;
  welcome: string;
  businessContext: string;
  serviceOptions: string[];
  monthlyLimit: number;
};

export function ChatForm({
  siteId, values, availableProviders, models,
}: {
  siteId: string;
  values: ChatValues;
  availableProviders: string[];
  models: ModelOption[];
}) {
  const [state, action, pending] = useActionState<ActionState, FormData>(saveSiteChat, {});
  const [enabled, setEnabled] = useState(values.enabled);
  const [keyMode, setKeyMode] = useState(values.keyMode);
  const [provider, setProvider] = useState(values.provider);

  const platformHasKey = availableProviders.includes(provider);
  const forProvider = models.filter((m) => m.provider === provider);
  const fallback = forProvider.find((m) => m.isDefault);

  return (
    <form action={action} className="space-y-6">
      <input type="hidden" name="siteId" value={siteId} />

      <section className="card p-5">
        <label className="flex cursor-pointer items-start gap-3">
          <input
            type="checkbox" name="enabled" defaultChecked={values.enabled}
            onChange={(e) => setEnabled(e.target.checked)}
            className="mt-0.5 h-4 w-4 rounded border-neutral-300"
          />
          <span>
            <span className="text-sm font-medium text-neutral-900">Activar el chat de cotización</span>
            <span className="hint mt-0.5 block">
              Aparece como un botón flotante en la landing. Hace una guía de preguntas fijas y, a media
              conversación, una llamada a la IA para proponer hasta dos preguntas de seguimiento según lo
              que describió el visitante.
            </span>
          </span>
        </label>

        <label className="mt-4 flex cursor-pointer items-start gap-3 border-t border-neutral-200 pt-4">
          <input
            type="checkbox" name="replacesForm" defaultChecked={values.replacesForm}
            className="mt-0.5 h-4 w-4 rounded border-neutral-300"
          />
          <span>
            <span className="text-sm font-medium text-neutral-900">Reemplazar el formulario de contacto</span>
            <span className="hint mt-0.5 block">
              Si lo marcas, el formulario estático de la landing se oculta y el chat queda como única vía de
              contacto. Si no, conviven los dos.
            </span>
          </span>
        </label>
      </section>

      <section className="card p-5">
        <h3 className="mb-1 text-sm font-semibold text-neutral-900">Motor de IA</h3>
        <p className="hint mb-4">
          Cada conversación hace <strong>una</strong> llamada al modelo. Si falla o tarda, el chat continúa con
          las preguntas fijas y el visitante no ve ningún error.
        </p>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Proveedor">
            <select
              name="provider" value={provider} onChange={(e) => setProvider(e.target.value)}
              className="input"
            >
              {PROVIDERS.map((p) => <option key={p.id} value={p.id}>{p.label}</option>)}
            </select>
          </Field>
          <Field
            label="Modelo"
            hint={
              fallback
                ? `Sin elegir uno, este sitio usa el predeterminado del proveedor (${fallback.model}).`
                : "Este proveedor no tiene modelos configurados todavía."
            }
          >
            <select name="model" defaultValue={values.model} className="input">
              <option value="">
                {fallback ? `Predeterminado — ${fallback.model}` : "Predeterminado (ninguno configurado)"}
              </option>
              {forProvider.map((m) => (
                <option key={m.model} value={m.model}>{m.model}</option>
              ))}
            </select>
          </Field>
        </div>

        <div className="mt-4 border-t border-neutral-200 pt-4">
          <span className="label">Qué llave usar</span>
          <div className="space-y-2">
            <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-neutral-200 p-3">
              <input
                type="radio" name="keyMode" value="platform" defaultChecked={values.keyMode === "platform"}
                onChange={() => setKeyMode("platform")} className="mt-0.5 h-4 w-4"
              />
              <span>
                <span className="text-sm text-neutral-900">Llave de la plataforma</span>
                <span className="hint mt-0.5 block">
                  Las que administras en <strong>Llaves de IA</strong>. El costo lo absorbes tú.
                </span>
              </span>
            </label>
            <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-neutral-200 p-3">
              <input
                type="radio" name="keyMode" value="own" defaultChecked={values.keyMode === "own"}
                onChange={() => setKeyMode("own")} className="mt-0.5 h-4 w-4"
              />
              <span>
                <span className="text-sm text-neutral-900">Llave del cliente</span>
                <span className="hint mt-0.5 block">
                  El consumo se factura a su cuenta. Se guarda cifrada y no se vuelve a mostrar.
                </span>
              </span>
            </label>
          </div>

          {keyMode === "own" ? (
            <div className="mt-3">
              <Field
                label={values.ownHint ? `Llave del cliente (guardada: ${values.ownHint})` : "Llave del cliente"}
                hint={values.ownHint ? "Déjalo vacío para conservar la que ya está guardada." : undefined}
              >
                <input name="ownSecret" type="password" autoComplete="off" placeholder="sk-…" className="input" />
              </Field>
            </div>
          ) : null}

          {enabled && forProvider.length === 0 ? (
            <p className="mt-3 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
              Ese proveedor no tiene ningún modelo dado de alta. Agrégalo en <strong>Llaves de IA</strong> o
              el chat no va a poder hacer la llamada.
            </p>
          ) : null}

          {enabled && keyMode === "platform" && !platformHasKey ? (
            <p className="mt-3 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
              No hay llave de plataforma para ese proveedor. Agrégala en <strong>Llaves de IA</strong> o cambia
              a la llave del cliente.
            </p>
          ) : null}
        </div>
      </section>

      <section className="card p-5">
        <h3 className="mb-4 text-sm font-semibold text-neutral-900">Contenido del chat</h3>
        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Texto del botón">
              <input name="launcherLabel" defaultValue={values.launcherLabel} placeholder="Cotiza con IA" className="input" />
            </Field>
            <Field label="Tope de llamadas al mes" hint="Al llegar, el chat sigue funcionando sin las preguntas de IA.">
              <input name="monthlyLimit" type="number" min={0} defaultValue={values.monthlyLimit} className="input" />
            </Field>
          </div>

          <Field label="Mensaje de bienvenida" hint="Vacío = un texto por defecto que aclara que no da precios automáticos.">
            <textarea name="welcome" rows={2} defaultValue={values.welcome} className="input" />
          </Field>

          <Field label="Opciones de la primera pregunta" hint="Una por línea, máximo 8. Vacío = opciones genéricas.">
            <textarea
              name="serviceOptions" rows={4}
              defaultValue={values.serviceOptions.join("\n")}
              placeholder={"Página web\nTienda en línea\nApp móvil\nSoftware a la medida"}
              className="input"
            />
          </Field>

          <Field
            label="A qué se dedica el negocio"
            hint="Es el contexto que recibe la IA para que las preguntas de seguimiento tengan sentido. Entre más concreto, mejores preguntas."
          >
            <textarea
              name="businessContext" rows={4} defaultValue={values.businessContext}
              placeholder="Estudio de desarrollo de software. Hacemos plataformas a la medida, integraciones y apps. Proyectos desde 3 meses."
              className="input"
            />
          </Field>
        </div>
      </section>

      <div className="flex items-center gap-3">
        <button type="submit" disabled={pending} className="btn-primary">
          {pending ? "Guardando…" : "Guardar"}
        </button>
        {state.error ? <span className="text-sm text-red-600">{state.error}</span> : null}
        {state.ok ? <span className="text-sm text-emerald-700">{state.message}</span> : null}
      </div>
    </form>
  );
}
