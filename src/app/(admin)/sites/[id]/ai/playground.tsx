"use client";

import { useState } from "react";
import { AiAssistButton } from "@/components/admin/ai-assist-button";

type Mode = "free_prompt" | "home_copy";

/**
 * Caja para probar el asistente sin salir de la pestaña. "Pregunta libre" es
 * la tarea free_prompt; "Textos de portada" corre home_copy con lo escrito
 * como descripción del negocio.
 */
export function Playground({ siteId }: { siteId: string }) {
  const [mode, setMode] = useState<Mode>("free_prompt");
  const [text, setText] = useState("");
  const [result, setResult] = useState<Record<string, unknown> | null>(null);
  const [meta, setMeta] = useState<{ model: string; tokens: number } | null>(null);

  const rendered = result
    ? Object.entries(result)
      .filter(([, v]) => v !== undefined && v !== null && v !== "")
      .map(([k, v]) => ({ k, v: Array.isArray(v) ? v.map((x) => `• ${String(x)}`).join("\n") : String(v) }))
    : [];

  return (
    <div className="card p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 className="text-sm font-semibold text-neutral-900">Pídele algo a la IA sobre tu tienda</h3>
        <select value={mode} onChange={(e) => setMode(e.target.value as Mode)} className="input w-auto py-1 text-xs">
          <option value="free_prompt">Pregunta libre</option>
          <option value="home_copy">Textos de portada (describe tu negocio)</option>
        </select>
      </div>
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={4}
        maxLength={3000}
        placeholder={mode === "home_copy"
          ? "Ej. Vendemos velas artesanales de soya con aromas mexicanos, hechas en Guadalajara…"
          : "Ej. Dame 5 ideas de promociones para el Buen Fin en una tienda de velas."}
        className="input mt-3"
      />
      <div className="mt-3 flex flex-wrap items-center gap-3">
        <AiAssistButton
          siteId={siteId}
          task={mode}
          label={mode === "home_copy" ? "Redactar portada" : "Preguntar"}
          disabled={!text.trim()}
          input={() => (mode === "home_copy" ? { business: text } : { prompt: text })}
          onResult={(data, m) => { setResult(data); setMeta({ model: m.model, tokens: m.tokens }); }}
        />
        {meta ? <span className="hint">{meta.model} · {meta.tokens.toLocaleString("es-MX")} tokens</span> : null}
      </div>

      {rendered.length > 0 ? (
        <div className="mt-4 space-y-3 rounded-lg border border-purple/30 bg-purple-tint/40 p-4">
          {rendered.map(({ k, v }) => (
            <div key={k}>
              {rendered.length > 1 ? <div className="label">{LABEL[k] ?? k}</div> : null}
              <p className="whitespace-pre-wrap text-sm text-neutral-800">{v}</p>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}

const LABEL: Record<string, string> = {
  tagline: "Frase principal",
  intro: "Introducción",
  cta: "Botón",
  text: "Respuesta",
};
