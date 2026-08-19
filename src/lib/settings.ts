import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { siteSettings } from "@/lib/db/schema";
import { env } from "@/lib/env";

export type SocialKey =
  | "instagram" | "facebook" | "x" | "linkedin" | "tiktok"
  | "youtube" | "threads" | "pinterest" | "github" | "telegram";

export const SOCIAL_KEYS: SocialKey[] = [
  "instagram", "facebook", "x", "linkedin", "tiktok",
  "youtube", "threads", "pinterest", "github", "telegram",
];

export type EffectiveSettings = {
  brandName: string;
  email: string;
  phone: string;
  whatsapp: string;
  address: string;
  mapsUrl: string;
  socials: Record<string, string>;
  formRecipients: string[];
  formSubject: string;
  custom: Record<string, string>;
};

export async function getSiteSettings(siteId: string) {
  const [row] = await db.select().from(siteSettings).where(eq(siteSettings.siteId, siteId));
  if (row) return row;
  const [created] = await db.insert(siteSettings).values({ siteId }).returning();
  return created;
}

/**
 * Each site owns its data outright — there is no fallback to a shared default.
 * A field left empty stays empty, and the runtime hides the element that would
 * have shown it.
 */
export async function resolveSettings(siteId: string, siteName: string): Promise<EffectiveSettings> {
  const s = await getSiteSettings(siteId);

  const clean = (v: string | null | undefined) => (v ?? "").trim();
  const socials: Record<string, string> = {};
  for (const [key, value] of Object.entries(s?.socials ?? {})) {
    if (value && value.trim()) socials[key] = value.trim();
  }

  return {
    brandName: clean(s?.brandName) || siteName,
    email: clean(s?.email),
    phone: clean(s?.phone),
    whatsapp: clean(s?.whatsapp),
    address: clean(s?.address),
    mapsUrl: safeUrl(clean(s?.mapsUrl)),
    socials,
    formRecipients: (s?.formRecipients ?? []).filter(Boolean),
    formSubject: clean(s?.formSubject) || "Nuevo mensaje desde {site}",
    custom: s?.custom ?? {},
  };
}

const DIGITS = /[^\d+]/g;

/**
 * Solo http(s). El valor viaja a un href de la página pública, así que un
 * `javascript:` capturado en el panel se ejecutaría en el sitio del cliente.
 */
export function safeUrl(raw: string): string {
  const v = raw.trim();
  if (!v) return "";
  const withScheme = /^[a-z][a-z0-9+.-]*:/i.test(v) ? v : `https://${v}`;
  try {
    const u = new URL(withScheme);
    return u.protocol === "http:" || u.protocol === "https:" ? u.toString() : "";
  } catch {
    return "";
  }
}

/** The exact object exposed to landing pages as window.__SITE__. */
export function publicSiteConfig(
  site: { id: string; name: string; slug: string },
  s: EffectiveSettings,
  host: string,
  options: {
    poweredBy?: boolean;
    chat?: {
      enabled: boolean;
      replacesForm: boolean;
      launcherLabel: string;
      welcome: string;
      serviceOptions: string[];
      theme: Record<string, string | number> | null;
    } | null;
  } = {},
) {
  const waDigits = s.whatsapp.replace(DIGITS, "").replace(/^\+/, "");
  const telDigits = s.phone.replace(DIGITS, "");
  return {
    id: site.id,
    slug: site.slug,
    name: site.name,
    host,
    brandName: s.brandName,
    email: s.email,
    emailHref: s.email ? `mailto:${s.email}` : "",
    phone: s.phone,
    phoneHref: telDigits ? `tel:${telDigits}` : "",
    whatsapp: s.whatsapp,
    whatsappHref: waDigits ? `https://wa.me/${waDigits}` : "",
    address: s.address,
    // El enlace capturado gana: una búsqueda por texto falla cuando la
    // dirección trae interior o colonia.
    addressHref: s.mapsUrl || (s.address ? `https://maps.google.com/?q=${encodeURIComponent(s.address)}` : ""),
    mapsUrl: s.mapsUrl,
    socials: s.socials,
    custom: s.custom,
    formEndpoint: "/api/f/submit",
    year: new Date().getFullYear(),
    /** Shown only on platform subdomains, never on a client's own domain. */
    poweredBy: options.poweredBy === true,
    poweredByName: env.platformName,
    poweredByUrl: `https://${env.rootDomain}`,
    chat: options.chat
      ? { ...options.chat, endpoint: "/api/f/ai", formName: "chat" }
      : null,
  };
}

export type PublicSiteConfig = ReturnType<typeof publicSiteConfig>;
