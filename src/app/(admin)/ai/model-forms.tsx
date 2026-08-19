"use client";

import { useActionState, useEffect, useState, useTransition } from "react";
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
 * Published list prices, so selecting a model fills them in. Only providers
 * whose prices could be verified are here — an invented price bills wrong, and
 * these go stale on their own, so the form always says where they came from.
 */
const PRICE_BOOK: Record<string, { verified: string; pricing: string; note?: string; models: Record<string, [number, number]> }> = {
  anthropic: {
    verified: "2026-06",
    pricing: "https://www.anthropic.com/pricing",
    models: {
      "claude-fable-5": [10, 50],
      "claude-mythos-5": [10, 50],
      "claude-opus-5": [5, 25],
      "claude-opus-4-8": [5, 25],
      "claude-opus-4-7": [5, 25],
      "claude-opus-4-6": [5, 25],
      "claude-sonnet-5": [3, 15],
      "claude-sonnet-4-6": [3, 15],
      "claude-haiku-4-5": [1, 5],
    },
  },
  deepseek: {
    verified: "2026-08",
    pricing: "https://api-docs.deepseek.com/quick_start/pricing",
    note: "Precio de hora pico. Fuera de pico DeepSeek cobra la mitad, así que esto nunca subestima el consumo.",
    models: {
      "deepseek-v4-flash": [0.44, 1.32],
      "deepseek-v4-pro": [1.32, 3.96],
    },
  },
};

const PRICING_PAGES: Record<string, string> = {
  anthropic: "https://www.anthropic.com/pricing",
  openai: "https://openai.com/api/pricing/",
  google: "https://ai.google.dev/pricing",
  groq: "https://groq.com/pricing/",
  deepseek: "https://api-docs.deepseek.com/quick_start/pricing",
};

export function AddModelForm({ providersWithKeys }: { providersWithKeys: string[] }) {
  const [state, action, pending] = useActionState<ActionState, FormData>(addAiModel, {});
  // Start on a provider that actually has a key, so the form is usable on arrival.
  const [provider, setProvider] = useState(
    () => providersWithKeys[0] ?? "anthropic",
  );
  const [available, setAvailable] = useState<string[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loading, startLoading] = useTransition();
  const [manual, setManual] = useState(false);
  const [model, setModel] = useState("");
  const [prices, setPrices] = useState({ input: "0", output: "0" });
  const [prefilled, setPrefilled] = useState<string | null>(null);

  const hasKey = providersWithKeys.includes(provider);
  const book = PRICE_BOOK[provider];

  function chooseModel(value: string) {
    setModel(value);
    const known = book?.models[value];
    if (known) {
      setPrices({ input: String(known[0]), output: String(known[1]) });
      setPrefilled(book.verified);
    } else {
      setPrices({ input: "0", output: "0" });
      setPrefilled(null);
    }
  }

  function load() {
    setLoadError(null);
    startLoading(async () => {
      const res = await listProviderModels(provider as "anthropic");
      if (res.error) { setLoadError(res.error); setAvailable(null); }
      else setAvailable(res.models ?? []);
    });
  }

  // Pull the list as soon as a provider with a key is selected: waiting for a
  // click left the field looking like it had no options at all.
  useEffect(() => {
    setAvailable(null);
    setModel("");
    setLoadError(null);
    setManual(false);
    setPrices({ input: "0", output: "0" });
    setPrefilled(null);
    if (!providersWithKeys.includes(provider)) return;

    let cancelled = false;
    startLoading(async () => {
      const res = await listProviderModels(provider as "anthropic");
      if (cancelled) return;
      if (res.error) setLoadError(res.error);
      else setAvailable(res.models ?? []);
    });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [provider]);

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
          hint={
            loading ? "Consultando al proveedor…"
              : !hasKey ? "Agrega primero una llave de este proveedor."
              : available ? `${available.length} disponibles en tu cuenta.`
              : loadError ? "No se pudo traer la lista; escribe el identificador."
              : "Escribe el identificador exacto."
          }
        >
          {available && !manual ? (
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

      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs">
        {prefilled ? (
          <span className="rounded-md border border-emerald-200 bg-emerald-50 px-2 py-1 text-emerald-800">
            Precio de lista verificado en {prefilled} — confírmalo contra tu cuenta.
          </span>
        ) : model ? (
          <span className="rounded-md border border-amber-200 bg-amber-50 px-2 py-1 text-amber-800">
            No tengo precio verificado de este modelo. Captúralo o el consumo se va a calcular en cero.
          </span>
        ) : null}
        {book?.note && prefilled ? <span className="text-neutral-500">{book.note}</span> : null}
        <a
          href={PRICING_PAGES[provider]} target="_blank" rel="noreferrer"
          className="text-neutral-500 underline-offset-2 hover:text-neutral-800 hover:underline"
        >
          Ver precios de {PROVIDER_LABELS[provider]} ↗
        </a>
      </div>

      <div className="flex flex-wrap items-center gap-4">
        <button type="button" onClick={load} disabled={loading || !hasKey} className="btn-secondary">
          {loading ? "Consultando…" : available ? "Actualizar lista" : "Reintentar lista"}
        </button>
        <button
          type="button"
          onClick={() => { setManual((v) => !v); setModel(""); }}
          className="text-xs text-neutral-500 underline-offset-2 hover:underline"
        >
          {manual && available ? "elegir de la lista" : "escribirlo a mano"}
        </button>
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
        La lista se consulta al proveedor con tu propia llave, así que es la que tu cuenta puede usar de
        verdad. Los precios sí van a mano —solo los de Anthropic se prellenan— porque ningún proveedor los
        expone por API y un precio inventado se traduce en un cobro mal hecho.
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
            {inputPrice === 0 && outputPrice === 0 ? (
              <span className="rounded bg-amber-50 px-1.5 py-0.5 text-[10px] font-medium text-amber-700 ring-1 ring-inset ring-amber-200">
                sin precio
              </span>
            ) : null}
          </div>
          <p className="mt-0.5 text-xs text-neutral-500">
            {PROVIDER_LABELS[provider] ?? provider}
            {label ? ` · ${label}` : ""} ·{" "}
            {inputPrice === 0 && outputPrice === 0
              ? "su consumo se calcula en cero hasta que captures el precio"
              : `$${inputPrice.toFixed(2)} entrada / $${outputPrice.toFixed(2)} salida por 1M`}
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
