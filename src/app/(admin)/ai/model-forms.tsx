"use client";

import { useActionState, useState, useTransition } from "react";
import {
  addAiModel, deleteAiModel, listProviderModels, setDefaultAiModel, updateAiModelPrice,
  type ActionState,
} from "../actions";
import { Field } from "@/components/ui";

export const PROVIDER_LABELS: Record<string, string> = {
  anthropic: "Anthropic (Claude)",
  openai: "OpenAI",
  google: "Google (Gemini)",
  groq: "Groq",
  deepseek: "DeepSeek",
};

/**
 * Anthropic publishes its list prices, so they can be prefilled. Every other
 * provider's price has to be typed in — inventing one would quietly bill wrong.
 */
const ANTHROPIC_PRICES: Record<string, [number, number]> = {
  "claude-fable-5": [10, 50],
  "claude-mythos-5": [10, 50],
  "claude-opus-5": [5, 25],
  "claude-opus-4-8": [5, 25],
  "claude-opus-4-7": [5, 25],
  "claude-opus-4-6": [5, 25],
  "claude-sonnet-5": [3, 15],
  "claude-sonnet-4-6": [3, 15],
  "claude-haiku-4-5": [1, 5],
};

export function AddModelForm() {
  const [state, action, pending] = useActionState<ActionState, FormData>(addAiModel, {});
  const [provider, setProvider] = useState("anthropic");
  const [available, setAvailable] = useState<string[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loading, startLoading] = useTransition();
  const [model, setModel] = useState("");
  const [prices, setPrices] = useState({ input: "0", output: "0" });

  function chooseModel(value: string) {
    setModel(value);
    const known = provider === "anthropic" ? ANTHROPIC_PRICES[value] : undefined;
    if (known) setPrices({ input: String(known[0]), output: String(known[1]) });
  }

  function load() {
    setLoadError(null);
    startLoading(async () => {
      const res = await listProviderModels(provider as "anthropic");
      if (res.error) { setLoadError(res.error); setAvailable(null); }
      else setAvailable(res.models ?? []);
    });
  }

  return (
    <form action={action} className="card space-y-4 p-5">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Field label="Proveedor">
          <select
            name="provider" value={provider} className="input"
            onChange={(e) => { setProvider(e.target.value); setAvailable(null); setModel(""); setLoadError(null); }}
          >
            {Object.entries(PROVIDER_LABELS).map(([id, label]) => (
              <option key={id} value={id}>{label}</option>
            ))}
          </select>
        </Field>

        <Field
          label="Modelo"
          hint={available ? `${available.length} disponibles en tu cuenta.` : "Trae la lista o escribe el identificador."}
        >
          {available ? (
            <select
              name="model" required value={model} className="input font-mono text-xs"
              onChange={(e) => chooseModel(e.target.value)}
            >
              <option value="">Elige uno…</option>
              {available.map((m) => <option key={m} value={m}>{m}</option>)}
            </select>
          ) : (
            <input
              name="model" required value={model} onChange={(e) => chooseModel(e.target.value)}
              placeholder="claude-opus-5" className="input font-mono text-xs"
            />
          )}
        </Field>

        <Field label="Precio entrada" hint="USD por 1M de tokens.">
          <input
            name="inputPrice" type="number" step="0.01" min="0"
            value={prices.input} onChange={(e) => setPrices((p) => ({ ...p, input: e.target.value }))}
            className="input"
          />
        </Field>
        <Field label="Precio salida" hint="USD por 1M de tokens.">
          <input
            name="outputPrice" type="number" step="0.01" min="0"
            value={prices.output} onChange={(e) => setPrices((p) => ({ ...p, output: e.target.value }))}
            className="input"
          />
        </Field>
      </div>

      <div className="flex flex-wrap items-center gap-4">
        <button type="button" onClick={load} disabled={loading} className="btn-secondary">
          {loading ? "Consultando…" : available ? "Actualizar lista" : "Traer modelos del proveedor"}
        </button>
        {available ? (
          <button
            type="button"
            onClick={() => { setAvailable(null); setModel(""); }}
            className="text-xs text-neutral-500 underline-offset-2 hover:underline"
          >
            escribirlo a mano
          </button>
        ) : null}
        <label className="flex items-center gap-2 text-sm text-neutral-700">
          <input type="checkbox" name="isDefault" className="h-4 w-4 rounded border-neutral-300" />
          Usarlo por defecto para este proveedor
        </label>
        <button type="submit" disabled={pending} className="btn-primary">
          {pending ? "Agregando…" : "Agregar modelo"}
        </button>
        {state.error ? <span className="text-sm text-red-600">{state.error}</span> : null}
        {state.ok ? <span className="text-sm text-emerald-700">{state.message}</span> : null}
        {loadError ? <span className="text-sm text-red-600">{loadError}</span> : null}
      </div>
      <p className="hint">
        &quot;Traer modelos&quot; le pregunta al proveedor con tu propia llave, así que la lista es la que
        tu cuenta puede usar de verdad. Los precios sí van a mano —solo los de Anthropic se prellenan— porque
        ningún proveedor los expone por API y un precio inventado se traduce en un cobro mal hecho.
      </p>
    </form>
  );
}

export function ModelRow({
  id, provider, model, label, inputPrice, outputPrice, isDefault,
}: {
  id: string; provider: string; model: string; label: string | null;
  inputPrice: number; outputPrice: number; isDefault: boolean;
}) {
  const [pending, start] = useTransition();
  const [editing, setEditing] = useState(false);
  const [state, action] = useActionState<ActionState, FormData>(updateAiModelPrice, {});

  return (
    <div className="px-5 py-3.5">
      <div className="flex flex-wrap items-center gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-mono text-sm text-neutral-900">{model}</span>
            {isDefault ? (
              <span className="rounded bg-emerald-50 px-1.5 py-0.5 text-[10px] font-medium text-emerald-700 ring-1 ring-inset ring-emerald-200">
                por defecto
              </span>
            ) : null}
          </div>
          <p className="mt-0.5 text-xs text-neutral-500">
            {PROVIDER_LABELS[provider] ?? provider}
            {label ? ` · ${label}` : ""} · ${inputPrice.toFixed(2)} entrada / ${outputPrice.toFixed(2)} salida por 1M
          </p>
        </div>

        <div className="flex items-center gap-3 text-xs">
          <button
            onClick={() => setEditing((v) => !v)}
            className="font-medium text-neutral-700 underline-offset-2 hover:underline"
          >
            {editing ? "Cancelar" : "Precios"}
          </button>
          {!isDefault ? (
            <button
              disabled={pending}
              onClick={() => start(() => { void setDefaultAiModel(id, provider); })}
              className="text-neutral-500 underline-offset-2 hover:underline disabled:opacity-50"
            >
              Hacer predeterminado
            </button>
          ) : null}
          <button
            disabled={pending}
            onClick={() => { if (confirm(`¿Quitar ${model} de la lista?`)) start(() => { void deleteAiModel(id); }); }}
            className="text-neutral-400 underline-offset-2 hover:text-red-600 hover:underline disabled:opacity-50"
          >
            Quitar
          </button>
        </div>
      </div>

      {editing ? (
        <form action={action} className="mt-3 flex flex-wrap items-end gap-3 rounded-lg border border-neutral-200 bg-neutral-50 p-3">
          <input type="hidden" name="id" value={id} />
          <div className="w-32">
            <label className="label">Entrada / 1M</label>
            <input name="inputPrice" type="number" step="0.01" min="0" defaultValue={inputPrice} className="input" />
          </div>
          <div className="w-32">
            <label className="label">Salida / 1M</label>
            <input name="outputPrice" type="number" step="0.01" min="0" defaultValue={outputPrice} className="input" />
          </div>
          <button type="submit" className="btn-secondary mb-0.5">Guardar</button>
          {state.ok ? <span className="mb-2 text-xs text-emerald-700">{state.message}</span> : null}
        </form>
      ) : null}
    </div>
  );
}
