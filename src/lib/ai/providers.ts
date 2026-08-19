import Anthropic from "@anthropic-ai/sdk";
import { jsonSchemaOutputFormat } from "@anthropic-ai/sdk/helpers/json-schema";
import { buildPrompt, JSON_INSTRUCTION, SYSTEM_PROMPT, type QuestionRequest } from "./prompt";

export type ProviderId = "anthropic" | "openai" | "google" | "groq" | "deepseek";

export const PROVIDERS: Record<ProviderId, { label: string; defaultModel: string; modelHint: string; keysUrl: string }> = {
  anthropic: {
    label: "Anthropic (Claude)",
    defaultModel: "claude-opus-5",
    modelHint: "claude-opus-5 · claude-sonnet-5 · claude-haiku-4-5",
    keysUrl: "https://console.anthropic.com/settings/keys",
  },
  openai: {
    label: "OpenAI",
    defaultModel: "",
    modelHint: "Escribe el modelo exacto, tal como aparece en tu cuenta.",
    keysUrl: "https://platform.openai.com/api-keys",
  },
  google: {
    label: "Google (Gemini)",
    defaultModel: "",
    modelHint: "Escribe el modelo exacto, tal como aparece en tu cuenta.",
    keysUrl: "https://aistudio.google.com/apikey",
  },
  groq: {
    label: "Groq",
    defaultModel: "",
    modelHint: "Escribe el modelo exacto, tal como aparece en tu cuenta.",
    keysUrl: "https://console.groq.com/keys",
  },
  deepseek: {
    label: "DeepSeek",
    defaultModel: "",
    modelHint: "Escribe el modelo exacto, tal como aparece en tu cuenta.",
    keysUrl: "https://platform.deepseek.com/api_keys",
  },
};

export type AskResult = {
  questions: string[];
  inputTokens?: number;
  outputTokens?: number;
};

/** Trims, de-duplicates and hard-caps whatever the model returned. */
function clean(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const item of raw) {
    if (typeof item !== "string") continue;
    const q = item.trim().replace(/\s+/g, " ").slice(0, 240);
    if (!q || seen.has(q.toLowerCase())) continue;
    seen.add(q.toLowerCase());
    out.push(q);
    if (out.length === 2) break;
  }
  return out;
}

const JSON_SCHEMA = {
  type: "object",
  properties: {
    questions: { type: "array", items: { type: "string" }, maxItems: 2 },
  },
  required: ["questions"],
  additionalProperties: false,
} as const;

const TIMEOUT_MS = 20_000;

async function postJson(url: string, headers: Record<string, string>, body: unknown) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
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

/** Models are told to answer with JSON; this pulls the array out defensively. */
function parseQuestionsJson(text: string): string[] {
  try {
    const parsed = JSON.parse(text);
    if (Array.isArray(parsed)) return clean(parsed);
    if (parsed && typeof parsed === "object" && "questions" in parsed) {
      return clean((parsed as { questions: unknown }).questions);
    }
  } catch {
    const match = text.match(/\[[\s\S]*\]/);
    if (match) {
      try { return clean(JSON.parse(match[0])); } catch { /* fall through */ }
    }
  }
  return [];
}


async function askAnthropic(apiKey: string, model: string, req: QuestionRequest): Promise<AskResult> {
  const client = new Anthropic({ apiKey, timeout: TIMEOUT_MS });
  const response = await client.messages.parse({
    model: model || PROVIDERS.anthropic.defaultModel,
    max_tokens: 2000,
    system: SYSTEM_PROMPT,
    // Thinking stays on with low effort: disabling it on Opus 5 can leak
    // internal tags into the response, and this task is simple anyway.
    thinking: { type: "adaptive" },
    output_config: { effort: "low", format: jsonSchemaOutputFormat(JSON_SCHEMA) },
    messages: [{ role: "user", content: buildPrompt(req) }],
  });

  return {
    questions: clean(response.parsed_output?.questions),
    inputTokens: response.usage?.input_tokens,
    outputTokens: response.usage?.output_tokens,
  };
}

async function askOpenAiCompatible(
  baseUrl: string, apiKey: string, model: string, req: QuestionRequest,
): Promise<AskResult> {
  const data = await postJson(baseUrl, { Authorization: `Bearer ${apiKey}` }, {
    model,
    max_completion_tokens: 600,
    messages: [
      { role: "system", content: SYSTEM_PROMPT + JSON_INSTRUCTION },
      { role: "user", content: buildPrompt(req) },
    ],
    // Plain JSON mode rather than json_schema: OpenAI, Groq and DeepSeek all
    // support it, and the answer is parsed defensively either way.
    response_format: { type: "json_object" },
  });

  const choices = data.choices as Array<{ message?: { content?: string } }> | undefined;
  const usage = data.usage as { prompt_tokens?: number; completion_tokens?: number } | undefined;
  return {
    questions: parseQuestionsJson(choices?.[0]?.message?.content ?? ""),
    inputTokens: usage?.prompt_tokens,
    outputTokens: usage?.completion_tokens,
  };
}

async function askGoogle(apiKey: string, model: string, req: QuestionRequest): Promise<AskResult> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`;
  const data = await postJson(url, {}, {
    systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
    contents: [{ role: "user", parts: [{ text: buildPrompt(req) }] }],
    generationConfig: {
      responseMimeType: "application/json",
      responseSchema: {
        type: "OBJECT",
        properties: { questions: { type: "ARRAY", items: { type: "STRING" } } },
        required: ["questions"],
      },
      maxOutputTokens: 600,
    },
  });

  const candidates = data.candidates as Array<{ content?: { parts?: Array<{ text?: string }> } }> | undefined;
  const usage = data.usageMetadata as { promptTokenCount?: number; candidatesTokenCount?: number } | undefined;
  return {
    questions: parseQuestionsJson(candidates?.[0]?.content?.parts?.[0]?.text ?? ""),
    inputTokens: usage?.promptTokenCount,
    outputTokens: usage?.candidatesTokenCount,
  };
}

export async function askForQuestions(
  provider: ProviderId, apiKey: string, model: string, req: QuestionRequest,
): Promise<AskResult> {
  const resolved = model.trim() || PROVIDERS[provider].defaultModel;
  if (!resolved) {
    throw new Error(`Falta indicar el modelo para ${PROVIDERS[provider].label}.`);
  }

  switch (provider) {
    case "anthropic":
      return askAnthropic(apiKey, resolved, req);
    case "openai":
      return askOpenAiCompatible("https://api.openai.com/v1/chat/completions", apiKey, resolved, req);
    case "groq":
      return askOpenAiCompatible("https://api.groq.com/openai/v1/chat/completions", apiKey, resolved, req);
    case "deepseek":
      return askOpenAiCompatible("https://api.deepseek.com/chat/completions", apiKey, resolved, req);
    case "google":
      return askGoogle(apiKey, resolved, req);
  }
}

/* ------------------------- model discovery ------------------------------ */

async function getJson(url: string, headers: Record<string, string>) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 15_000);
  try {
    const res = await fetch(url, { headers, signal: controller.signal, cache: "no-store" });
    const text = await res.text();
    if (!res.ok) throw new Error(`${res.status}: ${text.slice(0, 200)}`);
    return JSON.parse(text) as Record<string, unknown>;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Asks the provider which models the account can actually use, so nobody has to
 * type an id from memory and discover it was wrong at call time.
 */
export async function listModels(provider: ProviderId, apiKey: string): Promise<string[]> {
  const pick = (data: Record<string, unknown>, key: string, field: string) => {
    const list = data[key];
    if (!Array.isArray(list)) return [];
    return list
      .map((item) => (item && typeof item === "object" ? String((item as Record<string, unknown>)[field] ?? "") : ""))
      .filter(Boolean);
  };

  switch (provider) {
    case "anthropic": {
      const data = await getJson("https://api.anthropic.com/v1/models?limit=100", {
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      });
      return pick(data, "data", "id");
    }
    case "openai": {
      const data = await getJson("https://api.openai.com/v1/models", { Authorization: `Bearer ${apiKey}` });
      return pick(data, "data", "id");
    }
    case "groq": {
      const data = await getJson("https://api.groq.com/openai/v1/models", { Authorization: `Bearer ${apiKey}` });
      return pick(data, "data", "id");
    }
    case "deepseek": {
      const data = await getJson("https://api.deepseek.com/models", { Authorization: `Bearer ${apiKey}` });
      return pick(data, "data", "id");
    }
    case "google": {
      const data = await getJson(
        `https://generativelanguage.googleapis.com/v1beta/models?key=${encodeURIComponent(apiKey)}&pageSize=200`,
        {},
      );
      // Google returns "models/gemini-…"; the generate call takes the bare id.
      return pick(data, "models", "name").map((n) => n.replace(/^models\//, ""));
    }
  }
}
