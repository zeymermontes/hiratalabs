"use client";

import { useActionState, useState, useTransition } from "react";
import {
  addAiModel, deleteAiModel, setDefaultAiModel, updateAiModelPrice, type ActionState,
} from "../actions";
import { Field } from "@/components/ui";

export const PROVIDER_LABELS: Record<string, string> = {
  anthropic: "Anthropic (Claude)",
  openai: "OpenAI",
  google: "Google (Gemini)",
  groq: "Groq",
  deepseek: "DeepSeek",
};

export function AddModelForm() {
  const [state, action, pending] = useActionState<ActionState, FormData>(addAiModel, {});
  const [provider, setProvider] = useState("anthropic");

  return (
    <form action={action} className="card space-y-4 p-5">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Field label="Proveedor">
          <select name="provider" value={provider} onChange={(e) => setProvider(e.target.value)} className="input">
            {Object.entries(PROVIDER_LABELS).map(([id, label]) => (
              <option key={id} value={id}>{label}</option>
            ))}
          </select>
        </Field>
        <Field label="Modelo" hint="El identificador exacto que espera el proveedor.">
          <input name="model" required placeholder="claude-opus-5" className="input font-mono text-xs" />
        </Field>
        <Field label="Precio entrada" hint="USD por 1M de tokens.">
          <input name="inputPrice" type="number" step="0.01" min="0" defaultValue="0" className="input" />
        </Field>
        <Field label="Precio salida" hint="USD por 1M de tokens.">
          <input name="outputPrice" type="number" step="0.01" min="0" defaultValue="0" className="input" />
        </Field>
      </div>

      <div className="flex flex-wrap items-center gap-4">
        <label className="flex items-center gap-2 text-sm text-neutral-700">
          <input type="checkbox" name="isDefault" className="h-4 w-4 rounded border-neutral-300" />
          Usarlo por defecto para este proveedor
        </label>
        <button type="submit" disabled={pending} className="btn-primary">
          {pending ? "Agregando…" : "Agregar modelo"}
        </button>
        {state.error ? <span className="text-sm text-red-600">{state.error}</span> : null}
        {state.ok ? <span className="text-sm text-emerald-700">{state.message}</span> : null}
      </div>
      <p className="hint">
        Los precios son los que usa el panel para calcular cuánto consumió cada sitio. Cópialos de la
        página de precios de tu proveedor: no se consultan solos.
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
