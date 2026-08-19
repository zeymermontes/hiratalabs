"use client";

import { useActionState, useState, useTransition } from "react";
import { addAiKey, deleteAiKey, setDefaultAiKey, type ActionState } from "../actions";
import { Field } from "@/components/ui";

const PROVIDERS = [
  { id: "anthropic", label: "Anthropic (Claude)", keys: "https://console.anthropic.com/settings/keys" },
  { id: "openai", label: "OpenAI", keys: "https://platform.openai.com/api-keys" },
  { id: "google", label: "Google (Gemini)", keys: "https://aistudio.google.com/apikey" },
  { id: "groq", label: "Groq", keys: "https://console.groq.com/keys" },
];

export function AddKeyForm() {
  const [state, action, pending] = useActionState<ActionState, FormData>(addAiKey, {});
  const [provider, setProvider] = useState("anthropic");
  const current = PROVIDERS.find((p) => p.id === provider);

  return (
    <form action={action} className="card space-y-4 p-5">
      <div className="grid gap-4 sm:grid-cols-3">
        <Field label="Proveedor">
          <select name="provider" value={provider} onChange={(e) => setProvider(e.target.value)} className="input">
            {PROVIDERS.map((p) => <option key={p.id} value={p.id}>{p.label}</option>)}
          </select>
        </Field>
        <Field label="Nombre interno" hint="Para distinguirla de otras.">
          <input name="label" placeholder="Cuenta principal" className="input" />
        </Field>
        <Field label="API key" hint={current ? `Consíguela en ${new URL(current.keys).host}` : undefined}>
          <input name="secret" type="password" required autoComplete="off" placeholder="sk-… / re-…" className="input" />
        </Field>
      </div>

      <div className="flex items-center gap-3">
        <button type="submit" disabled={pending} className="btn-primary">
          {pending ? "Guardando…" : "Agregar llave"}
        </button>
        {current ? (
          <a href={current.keys} target="_blank" rel="noreferrer" className="text-xs text-neutral-500 underline-offset-2 hover:underline">
            Crear una en {current.label} ↗
          </a>
        ) : null}
        {state.error ? <span className="text-sm text-red-600">{state.error}</span> : null}
        {state.ok ? <span className="text-sm text-emerald-700">{state.message}</span> : null}
      </div>
    </form>
  );
}

export function KeyRow({
  id, provider, label, hint, isDefault, siblings,
}: {
  id: string; provider: string; label: string; hint: string; isDefault: boolean; siblings: number;
}) {
  const [pending, start] = useTransition();
  const name = PROVIDERS.find((p) => p.id === provider)?.label ?? provider;

  return (
    <div className="flex flex-wrap items-center gap-3 px-5 py-3.5">
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-neutral-900">{label}</span>
          {isDefault ? (
            <span className="rounded bg-emerald-50 px-1.5 py-0.5 text-[10px] font-medium text-emerald-700 ring-1 ring-inset ring-emerald-200">
              en uso
            </span>
          ) : null}
        </div>
        <p className="mt-0.5 font-mono text-xs text-neutral-500">{name} · {hint}</p>
      </div>
      <div className="flex items-center gap-3 text-xs">
        {!isDefault && siblings > 1 ? (
          <button
            disabled={pending}
            onClick={() => start(() => { void setDefaultAiKey(id, provider); })}
            className="font-medium text-neutral-700 underline-offset-2 hover:underline disabled:opacity-50"
          >
            Usar esta
          </button>
        ) : null}
        <button
          disabled={pending}
          onClick={() => { if (confirm(`¿Borrar la llave "${label}"?`)) start(() => { void deleteAiKey(id); }); }}
          className="text-neutral-400 underline-offset-2 hover:text-red-600 hover:underline disabled:opacity-50"
        >
          Borrar
        </button>
      </div>
    </div>
  );
}
