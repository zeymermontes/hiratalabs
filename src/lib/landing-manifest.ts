/**
 * A landing can ship a `landing.json` at the root of its ZIP declaring how its
 * chat should be configured. The panel reads it on upload and prefills the
 * fields the admin has not filled in yet — it never overwrites a value someone
 * already set, and never turns the chat on by itself, because that spends money.
 *
 * The file is pulled out of the published file set, so it is never served.
 */
export const MANIFEST_FILENAME = "landing.json";

export type ManifestChat = {
  launcherLabel?: string;
  welcome?: string;
  replacesForm?: boolean;
  serviceOptions?: string[];
  /** Serialized into the site's "business context" field verbatim. */
  scope?: Record<string, unknown>;
  /** Colours, radii and typeface so the chat matches the landing. */
  theme?: Record<string, string | number>;
};

/** Only these keys reach the widget; anything else in `theme` is dropped. */
export const THEME_KEYS = [
  "surface", "ink", "onInk", "accent", "onAccent", "highlight",
  "radius", "bubbleRadius", "launcherShape", "fontFamily", "displayFontFamily",
] as const;

const COLOR = /^(#[0-9a-fA-F]{3,8}|rgb\(|rgba\(|hsl\(|hsla\()/;

function theme(value: unknown): Record<string, string | number> | undefined {
  if (!value || typeof value !== "object" || Array.isArray(value)) return undefined;
  const src = value as Record<string, unknown>;
  const out: Record<string, string | number> = {};

  for (const key of THEME_KEYS) {
    const v = src[key];
    if (v === undefined || v === null) continue;

    if (key === "radius" || key === "bubbleRadius") {
      const n = Number(v);
      if (Number.isFinite(n)) out[key] = Math.max(0, Math.min(40, n));
    } else if (key === "launcherShape") {
      if (v === "circle" || v === "pill") out[key] = v;
    } else if (key === "fontFamily" || key === "displayFontFamily") {
      // Sin url() ni expresiones: esto entra a una hoja de estilo.
      const s = String(v).slice(0, 160);
      if (!/[{}:;]|url\(|expression|@import/i.test(s)) out[key] = s;
    } else {
      const s = String(v).trim().slice(0, 40);
      if (COLOR.test(s) && !/[;{}]/.test(s)) out[key] = s;
    }
  }

  return Object.keys(out).length ? out : undefined;
}

export type LandingManifest = {
  chat?: ManifestChat;
};

export type ManifestResult = {
  manifest: LandingManifest | null;
  error: string | null;
};

function str(value: unknown, max: number): string | undefined {
  if (typeof value !== "string") return undefined;
  const v = value.trim();
  return v ? v.slice(0, max) : undefined;
}

function list(value: unknown, cap: number, max: number): string[] | undefined {
  if (!Array.isArray(value)) return undefined;
  const out = value
    .filter((v): v is string => typeof v === "string")
    .map((v) => v.trim().slice(0, max))
    .filter(Boolean)
    .slice(0, cap);
  return out.length ? out : undefined;
}

export function parseManifest(raw: string): ManifestResult {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return { manifest: null, error: `${MANIFEST_FILENAME} no es JSON válido; se ignoró.` };
  }
  if (!parsed || typeof parsed !== "object") {
    return { manifest: null, error: `${MANIFEST_FILENAME} debe ser un objeto; se ignoró.` };
  }

  const chatRaw = (parsed as Record<string, unknown>).chat;
  if (!chatRaw || typeof chatRaw !== "object") return { manifest: {}, error: null };

  const c = chatRaw as Record<string, unknown>;
  const chat: ManifestChat = {
    launcherLabel: str(c.launcherLabel, 60),
    welcome: str(c.welcome, 600),
    replacesForm: typeof c.replacesForm === "boolean" ? c.replacesForm : undefined,
    serviceOptions: list(c.serviceOptions, 8, 80),
    scope: c.scope && typeof c.scope === "object" && !Array.isArray(c.scope)
      ? (c.scope as Record<string, unknown>)
      : undefined,
    theme: theme(c.theme),
  };

  return { manifest: { chat }, error: null };
}

/** Human-readable summary of what a prefill changed, shown after the upload. */
export function describeApplied(applied: string[], skipped: string[]): string {
  const parts: string[] = [];
  if (applied.length) parts.push(`${MANIFEST_FILENAME}: se prellenó ${applied.join(", ")}.`);
  if (skipped.length) parts.push(`Se respetó lo que ya tenías en ${skipped.join(", ")}.`);
  return parts.join(" ");
}
