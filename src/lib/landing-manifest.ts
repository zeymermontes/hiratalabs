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
};

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
