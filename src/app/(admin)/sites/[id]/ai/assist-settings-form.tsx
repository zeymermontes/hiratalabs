"use client";

import { useActionState, useState } from "react";
import { Field } from "@/components/ui";
import { saveAssistSettings, type ActionState } from "@/modules/ai/actions";

const PROVIDERS = [
  { id: "deepseek", label: "DeepSeek" },
  { id: "anthropic", label: "Anthropic (Claude)" },
  { id: "openai", label: "OpenAI" },
  { id: "google", label: "Google (Gemini)" },
  { id: "groq", label: "Groq" },
];

export type AssistSettingsValues = {
  keyMode: "platform" | "own";
  provider: string;
  model: string;
  ownHint: string | null;
  monthlyTokens: number;
};

export function AssistSettingsForm({
  siteId, values, isSuperAdmin, platformProviders, defaultModels,
}: {
  siteId: string;
  values: AssistSettingsValues;
  isSuperAdmin: boolean;
  /** Proveedores con llave de plataforma, para avisar si el elegido no tiene. */
  platformProviders: string[];
  /** Modelo predeterminado por proveedor (ai_models). */
  defaultModels: Record<string, string>;
}) {
  const [state, action, pending] = useActionState<ActionState, FormData>(saveAssistSettings, {});
  const [keyMode, setKeyMode] = useState(values.keyMode);
  const [provider, setProvider] = useState(values.provider || "deepseek");

  const fallbackModel = defaultModels[provider] ?? (provider === "deepseek" ? "deepseek-chat" : "");
  const platformHasKey = platformProviders.includes(provider);

  return (
    <form action={action} className="card space-y-5 p-5">
      <input type="hidden" name="siteId" value={siteId} />
      <div>
        <h3 className="text-sm font-semibold text-neutral-900">Qué llave usa el asistente</h3>
        <p className="hint mt-0.5">
          Con la llave de la plataforma tienes una cuota mensual de tokens incluida. Con tu propia llave el
          consumo se cobra a tu cuenta y no hay límite.
        </p>
      </div>

      <div className="space-y-2">
        <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-neutral-200 p-3">
          <input
            type="radio" name="keyMode" value="platform" defaultChecked={values.keyMode === "platform"}
            onChange={() => setKeyMode("platform")} className="mt-0.5 h-4 w-4"
          />
          <span>
            <span className="text-sm text-neutral-900">Llave de la plataforma (recomendado)</span>
            <span className="hint mt-0.5 block">DeepSeek por default. Sin configurar nada más.</span>
          </span>
        </label>
        <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-neutral-200 p-3">
          <input
            type="radio" name="keyMode" value="own" defaultChecked={values.keyMode === "own"}
            onChange={() => setKeyMode("own")} className="mt-0.5 h-4 w-4"
          />
          <span>
            <span className="text-sm text-neutral-900">Mi propia llave</span>
            <span className="hint mt-0.5 block">Se guarda cifrada y nunca se vuelve a mostrar. Sin cuota.</span>
          </span>
        </label>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field
          label="Proveedor"
          hint={keyMode === "platform" && !platformHasKey
            ? "La plataforma no tiene llave para este proveedor: se usará el que sí tenga."
            : undefined}
        >
          <select name="provider" value={provider} onChange={(e) => setProvider(e.target.value)} className="input">
            {PROVIDERS.map((p) => <option key={p.id} value={p.id}>{p.label}</option>)}
          </select>
        </Field>
        <Field
          label="Modelo (opcional)"
          hint={fallbackModel ? `Vacío = el predeterminado del proveedor (${fallbackModel}).` : "Vacío = el predeterminado del proveedor."}
        >
          <input name="model" defaultValue={values.model} placeholder={fallbackModel || "nombre exacto del modelo"} className="input" />
        </Field>
      </div>

      {keyMode === "own" ? (
        <div className="space-y-3 rounded-lg border border-neutral-200 bg-neutral-50 p-3">
          <Field
            label={values.ownHint ? `Tu API key (guardada: ${values.ownHint})` : "Tu API key"}
            hint={values.ownHint ? "Déjalo vacío para conservar la que ya está guardada." : "Pégala tal cual te la dio el proveedor."}
          >
            <input name="ownSecret" type="password" autoComplete="off" placeholder="sk-…" className="input" />
          </Field>
          {values.ownHint ? (
            <label className="flex cursor-pointer items-center gap-2 text-xs text-neutral-600">
              <input type="checkbox" name="clearSecret" className="h-3.5 w-3.5 rounded border-neutral-300" />
              Borrar la llave guardada
            </label>
          ) : null}
        </div>
      ) : null}

      {isSuperAdmin ? (
        <Field
          label="Cuota mensual de tokens (solo super admin)"
          hint="Entrada + salida, con llave de plataforma. Se reinicia el día 1 de cada mes."
        >
          <input name="monthlyTokens" type="number" min={0} step={1000} defaultValue={values.monthlyTokens} className="input max-w-xs" />
        </Field>
      ) : null}

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
