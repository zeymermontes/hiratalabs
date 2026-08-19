import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { globalSettings, siteSettings } from "@/lib/db/schema";

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
  socials: Record<string, string>;
  formRecipients: string[];
  formSubject: string;
  custom: Record<string, string>;
};

const EMPTY: EffectiveSettings = {
  brandName: "", email: "", phone: "", whatsapp: "", address: "",
  socials: {}, formRecipients: [], formSubject: "", custom: {},
};

function pick(a: string | null | undefined, b: string | null | undefined) {
  return (a && a.trim()) || (b && b.trim()) || "";
}

export async function getGlobalSettings() {
  const [row] = await db.select().from(globalSettings).where(eq(globalSettings.id, "default"));
  if (row) return row;
  const [created] = await db.insert(globalSettings).values({ id: "default" }).returning();
  return created;
}

export async function getSiteSettings(siteId: string) {
  const [row] = await db.select().from(siteSettings).where(eq(siteSettings.siteId, siteId));
  if (row) return row;
  const [created] = await db.insert(siteSettings).values({ siteId }).returning();
  return created;
}

/** Per-site values win; blanks inherit from the global defaults. */
export async function resolveSettings(siteId: string, siteName: string): Promise<EffectiveSettings> {
  const [g, s] = await Promise.all([getGlobalSettings(), getSiteSettings(siteId)]);
  if (!g || !s) return { ...EMPTY, brandName: siteName };

  const socials: Record<string, string> = {};
  for (const key of new Set([...Object.keys(g.socials ?? {}), ...Object.keys(s.socials ?? {})])) {
    const v = pick(s.socials?.[key], g.socials?.[key]);
    if (v) socials[key] = v;
  }

  return {
    brandName: pick(s.brandName, g.brandName) || siteName,
    email: pick(s.email, g.email),
    phone: pick(s.phone, g.phone),
    whatsapp: pick(s.whatsapp, g.whatsapp),
    address: pick(s.address, g.address),
    socials,
    formRecipients: s.formRecipients?.length ? s.formRecipients : (g.formRecipients ?? []),
    formSubject: pick(s.formSubject, g.formSubject) || "Nuevo mensaje desde {site}",
    custom: { ...(g.custom ?? {}), ...(s.custom ?? {}) },
  };
}

const DIGITS = /[^\d+]/g;

/** The exact object exposed to landing pages as window.__SITE__. */
export function publicSiteConfig(
  site: { id: string; name: string; slug: string },
  s: EffectiveSettings,
  host: string,
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
    addressHref: s.address ? `https://maps.google.com/?q=${encodeURIComponent(s.address)}` : "",
    socials: s.socials,
    custom: s.custom,
    formEndpoint: "/api/f/submit",
    year: new Date().getFullYear(),
  };
}

export type PublicSiteConfig = ReturnType<typeof publicSiteConfig>;
