"use client";

import { useState, useTransition } from "react";
import { assistAction, type AssistActionResult } from "@/modules/ai/actions";
import type { AssistInput, AssistTask } from "@/modules/ai/assist";

export type AiAssistButtonProps = {
  siteId: string;
  task: AssistTask;
  /** Se evalúa al hacer clic, así toma lo que haya en el formulario en ese momento. */
  input: () => AssistInput;
  onResult: (data: Record<string, unknown>, meta: { model: string; provider: string; tokens: number }) => void;
  label?: string;
  className?: string;
  /** "sm" para meterlo junto a un label de campo. */
  size?: "sm" | "md";
  disabled?: boolean;
};

function Sparkle({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 20 20" fill="currentColor" aria-hidden="true" className={className}>
      <path d="M10 2.5c.3 0 .55.2.62.49l.73 2.86a3 3 0 0 0 2.2 2.2l2.86.73a.64.64 0 0 1 0 1.24l-2.86.73a3 3 0 0 0-2.2 2.2l-.73 2.86a.64.64 0 0 1-1.24 0l-.73-2.86a3 3 0 0 0-2.2-2.2l-2.86-.73a.64.64 0 0 1 0-1.24l2.86-.73a3 3 0 0 0 2.2-2.2l.73-2.86A.64.64 0 0 1 10 2.5ZM4 13.5c.2 0 .37.13.42.32l.3 1.1a1.4 1.4 0 0 0 .96.96l1.1.3a.43.43 0 0 1 0 .84l-1.1.3a1.4 1.4 0 0 0-.96.96l-.3 1.1a.43.43 0 0 1-.84 0l-.3-1.1a1.4 1.4 0 0 0-.96-.96l-1.1-.3a.43.43 0 0 1 0-.84l1.1-.3a1.4 1.4 0 0 0 .96-.96l.3-1.1A.43.43 0 0 1 4 13.5Z" />
    </svg>
  );
}

function Spinner({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 20 20" fill="none" aria-hidden="true" className={`animate-spin ${className ?? ""}`}>
      <circle cx="10" cy="10" r="7" stroke="currentColor" strokeOpacity="0.25" strokeWidth="2.5" />
      <path d="M17 10a7 7 0 0 0-7-7" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  );
}

/**
 * Botón morado "Redactar con IA". Llama a la server action del asistente y
 * entrega el JSON de la tarea al formulario que lo contiene. El error se
 * muestra junto al botón, sin tocar el formulario.
 */
export function AiAssistButton({
  siteId, task, input, onResult, label = "Redactar con IA", className = "", size = "md", disabled,
}: AiAssistButtonProps) {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const pad = size === "sm" ? "px-2.5 py-1 text-xs" : "px-3.5 py-2 text-sm";
  const icon = size === "sm" ? "h-3.5 w-3.5" : "h-4 w-4";

  function run() {
    setError(null);
    let payload: AssistInput;
    try {
      payload = input();
    } catch {
      setError("No se pudo leer el formulario.");
      return;
    }
    start(async () => {
      let r: AssistActionResult;
      try {
        r = await assistAction(siteId, task, payload);
      } catch {
        setError("No se pudo contactar al servidor.");
        return;
      }
      if (!r.ok) {
        setError(r.error);
        return;
      }
      onResult(r.data, { model: r.model, provider: r.provider, tokens: r.tokens });
    });
  }

  return (
    <span className={`inline-flex flex-wrap items-center gap-2 ${className}`}>
      <button
        type="button"
        onClick={run}
        disabled={pending || disabled}
        className={`inline-flex items-center gap-1.5 rounded-lg bg-purple font-medium text-white shadow-sm transition hover:bg-purple-dark disabled:cursor-not-allowed disabled:opacity-60 ${pad}`}
      >
        {pending ? <Spinner className={icon} /> : <Sparkle className={icon} />}
        {pending ? "Redactando…" : label}
      </button>
      {error ? <span role="alert" className="text-xs text-red-600">{error}</span> : null}
    </span>
  );
}
