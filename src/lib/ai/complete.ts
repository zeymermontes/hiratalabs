import Anthropic from "@anthropic-ai/sdk";
import { PROVIDERS, type ProviderId } from "./providers";

/**
 * Llamada genérica "system + user → texto" a cualquier proveedor, pidiendo JSON
 * cuando el proveedor lo soporta. Es la base del asistente de redacción
 * (src/modules/ai/assist.ts); el chat de cotización sigue usando askForQuestions,
 * que tiene su propio esquema estricto.
 */
export type CompletionRequest = {
  system: string;
  user: string;
  maxTokens?: number;
  /** true = pedir JSON al proveedor (json_object / responseMimeType). */
  json?: boolean;
  timeoutMs?: number;
};

export type CompletionResult = {
  text: string;
  inputTokens?: number;
  outputTokens?: number;
};

const DEFAULT_TIMEOUT_MS = 45_000;

async function postJson(url: string, headers: Record<string, string>, body: unknown, timeoutMs: number) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...headers },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    const text = await res.text();
    if (!res.ok) throw new Error(`${res.status}: ${text.slice(0, 200)}`);
    return JSON.parse(text) as Record<string, unknown>;
  } finally {
    clearTimeout(timer);
  }
}

async function completeAnthropic(apiKey: string, model: string, req: CompletionRequest): Promise<CompletionResult> {
  const client = new Anthropic({ apiKey, timeout: req.timeoutMs ?? DEFAULT_TIMEOUT_MS });
  const response = await client.messages.create({
    model,
    max_tokens: req.maxTokens ?? 1500,
    system: req.system,
    messages: [{ role: "user", content: req.user }],
  });
  const text = response.content
    .map((block) => (block.type === "text" ? block.text : ""))
    .join("")
    .trim();
  return {
    text,
    inputTokens: response.usage?.input_tokens,
    outputTokens: response.usage?.output_tokens,
  };
}

async function completeOpenAiCompatible(
  baseUrl: string, apiKey: string, model: string, req: CompletionRequest,
): Promise<CompletionResult> {
  const data = await postJson(baseUrl, { Authorization: `Bearer ${apiKey}` }, {
    model,
    max_completion_tokens: req.maxTokens ?? 1500,
    messages: [
      { role: "system", content: req.system },
      { role: "user", content: req.user },
    ],
    ...(req.json ? { response_format: { type: "json_object" } } : {}),
  }, req.timeoutMs ?? DEFAULT_TIMEOUT_MS);

  const choices = data.choices as Array<{ message?: { content?: string } }> | undefined;
  const usage = data.usage as { prompt_tokens?: number; completion_tokens?: number } | undefined;
  return {
    text: (choices?.[0]?.message?.content ?? "").trim(),
    inputTokens: usage?.prompt_tokens,
    outputTokens: usage?.completion_tokens,
  };
}

async function completeGoogle(apiKey: string, model: string, req: CompletionRequest): Promise<CompletionResult> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`;
  const data = await postJson(url, {}, {
    systemInstruction: { parts: [{ text: req.system }] },
    contents: [{ role: "user", parts: [{ text: req.user }] }],
    generationConfig: {
      ...(req.json ? { responseMimeType: "application/json" } : {}),
      maxOutputTokens: req.maxTokens ?? 1500,
    },
  }, req.timeoutMs ?? DEFAULT_TIMEOUT_MS);

  const candidates = data.candidates as Array<{ content?: { parts?: Array<{ text?: string }> } }> | undefined;
  const usage = data.usageMetadata as { promptTokenCount?: number; candidatesTokenCount?: number } | undefined;
  return {
    text: (candidates?.[0]?.content?.parts ?? []).map((p) => p.text ?? "").join("").trim(),
    inputTokens: usage?.promptTokenCount,
    outputTokens: usage?.candidatesTokenCount,
  };
}

export async function complete(
  provider: ProviderId, apiKey: string, model: string, req: CompletionRequest,
): Promise<CompletionResult> {
  const resolved = model.trim() || PROVIDERS[provider].defaultModel;
  if (!resolved) throw new Error(`Falta indicar el modelo para ${PROVIDERS[provider].label}.`);

  switch (provider) {
    case "anthropic":
      return completeAnthropic(apiKey, resolved, req);
    case "openai":
      return completeOpenAiCompatible("https://api.openai.com/v1/chat/completions", apiKey, resolved, req);
    case "groq":
      return completeOpenAiCompatible("https://api.groq.com/openai/v1/chat/completions", apiKey, resolved, req);
    case "deepseek":
      return completeOpenAiCompatible("https://api.deepseek.com/chat/completions", apiKey, resolved, req);
    case "google":
      return completeGoogle(apiKey, resolved, req);
  }
}

/**
 * Saca un objeto JSON de la respuesta aunque el modelo lo envuelva en ```json
 * o le agregue texto alrededor. null si no hay nada parseable.
 */
export function extractJsonObject(text: string): Record<string, unknown> | null {
  const tryParse = (s: string) => {
    try {
      const v = JSON.parse(s);
      return v && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, unknown>) : null;
    } catch {
      return null;
    }
  };
  const direct = tryParse(text.trim());
  if (direct) return direct;
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenced) {
    const v = tryParse(fenced[1].trim());
    if (v) return v;
  }
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start >= 0 && end > start) return tryParse(text.slice(start, end + 1));
  return null;
}
