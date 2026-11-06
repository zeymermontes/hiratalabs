import type { SiteTheme } from "@/lib/db/schema";
import { FONT_BY_NAME, fontParam } from "./fonts";
import { SECTION_BY_TYPE, SECTIONS, defaultSettings } from "./sections";
import { DEFAULT_TEMPLATE, TEMPLATE_BY_KEY } from "./templates";
import {
  SCHEME_KEYS, type GlobalSettings, type PageKey, type Scheme, type SchemeKey, type SectionInstance, type ThemeDoc, type Zone,
} from "./types";

/* ------------------------------------------------------------ saneado */

const HEX = /^#([0-9a-f]{3}|[0-9a-f]{6}|[0-9a-f]{8})$/i;
const color = (v: unknown, fallback: string) => (typeof v === "string" && HEX.test(v.trim()) ? v.trim().toLowerCase() : fallback);
const fontName = (v: unknown, fallback: string) => {
  const s = typeof v === "string" ? v.replace(/[^A-Za-z0-9 ]/g, "").trim().slice(0, 60) : "";
  return s || fallback;
};
const oneOf = <T extends string>(v: unknown, allowed: readonly T[], fallback: T): T =>
  (allowed as readonly string[]).includes(v as string) ? (v as T) : fallback;

let idSeq = 0;
const freshId = (p: string) => `${p}-${Date.now().toString(36)}${(++idSeq).toString(36)}`;

function cleanSettings(raw: unknown, base: GlobalSettings): GlobalSettings {
  const r = (raw && typeof raw === "object" ? raw : {}) as Partial<GlobalSettings>;
  const schemes = {} as Record<SchemeKey, Scheme>;
  for (const k of SCHEME_KEYS) {
    const src = (r.schemes?.[k] ?? {}) as Partial<Scheme>;
    const def = base.schemes[k];
    schemes[k] = {
      bg: color(src.bg, def.bg), fg: color(src.fg, def.fg), primary: color(src.primary, def.primary),
      primaryFg: color(src.primaryFg, def.primaryFg), accent: color(src.accent, def.accent),
      muted: color(src.muted, def.muted), border: color(src.border, def.border),
    };
  }
  const m = (r.motion ?? {}) as Partial<GlobalSettings["motion"]>;
  return {
    schemes,
    fonts: { display: fontName(r.fonts?.display, base.fonts.display), body: fontName(r.fonts?.body, base.fonts.body) },
    typeScale: oneOf(r.typeScale, ["compact", "normal", "large", "huge"], base.typeScale),
    headingCase: oneOf(r.headingCase, ["normal", "upper"], base.headingCase),
    headingWeight: oneOf(r.headingWeight, ["light", "regular", "bold", "black"], base.headingWeight),
    radius: oneOf(r.radius, ["none", "sm", "md", "lg", "full"], base.radius),
    buttons: oneOf(r.buttons, ["solid", "outline", "pill", "hard", "underline"], base.buttons),
    cards: oneOf(r.cards, ["classic", "overlay", "minimal", "bordered", "polaroid", "swap"], base.cards),
    cardRatio: oneOf(r.cardRatio, ["square", "portrait", "landscape"], base.cardRatio),
    motion: {
      reveal: oneOf(m.reveal, ["none", "fade", "rise", "mask", "zoom", "blur", "slide"], base.motion.reveal),
      hover: oneOf(m.hover, ["none", "lift", "zoom", "tilt", "hard", "glow"], base.motion.hover),
      intensity: oneOf(m.intensity, ["soft", "normal", "bold"], base.motion.intensity),
    },
    width: oneOf(r.width, ["narrow", "normal", "wide", "full"], base.width),
    texture: oneOf(r.texture, ["plain", "grain", "grid", "dots"], base.texture),
    logoUrl: typeof r.logoUrl === "string" && /^https?:\/\//.test(r.logoUrl) ? r.logoUrl : base.logoUrl,
  };
}

function cleanSection(raw: unknown, zone: Zone): SectionInstance | null {
  if (!raw || typeof raw !== "object") return null;
  const s = raw as Partial<SectionInstance>;
  const def = typeof s.type === "string" ? SECTION_BY_TYPE[s.type] : undefined;
  if (!def || !def.zones.includes(zone)) return null;
  const variant = def.variants.some((v) => v.key === s.variant) ? s.variant! : def.variants[0].key;
  const blockTypes = new Set(def.blocks?.types.map((b) => b.type) ?? []);
  const blocks = Array.isArray(s.blocks)
    ? s.blocks
        .filter((b) => b && typeof b === "object" && blockTypes.has(b.type))
        .slice(0, def.blocks?.max ?? 0)
        .map((b) => ({ id: typeof b.id === "string" && b.id ? b.id : freshId("b"), type: b.type, settings: b.settings && typeof b.settings === "object" ? b.settings : {} }))
    : undefined;
  return {
    id: typeof s.id === "string" && s.id ? s.id.slice(0, 64) : freshId(def.type),
    type: def.type,
    variant,
    scheme: oneOf(s.scheme, SCHEME_KEYS, "base"),
    hidden: s.hidden === true ? true : undefined,
    settings: { ...defaultSettings(def.settings), ...(s.settings && typeof s.settings === "object" ? s.settings : {}) },
    blocks: def.blocks ? blocks ?? [] : undefined,
  };
}

function cleanList(raw: unknown, zone: Zone, fallback: SectionInstance[]): SectionInstance[] {
  const list = Array.isArray(raw) ? raw.map((r) => cleanSection(r, zone)).filter((s): s is SectionInstance => s !== null) : fallback;
  // Una sola instancia de las secciones "single", y las obligatorias siempre presentes.
  const seen = new Set<string>();
  const out = list.filter((s) => {
    if (!SECTION_BY_TYPE[s.type].single) return true;
    if (seen.has(s.type)) return false;
    seen.add(s.type);
    return true;
  });
  for (const def of SECTIONS) {
    if (def.required && def.zones.includes(zone) && !out.some((s) => s.type === def.type)) {
      const fromFallback = fallback.find((s) => s.type === def.type);
      out.push(fromFallback ?? { id: freshId(def.type), type: def.type, variant: def.variants[0].key, settings: defaultSettings(def.settings) });
    }
  }
  return out.slice(0, 40);
}

/** Valida y completa un documento de tema (venga de la base, del editor o de una plantilla). */
export function normalizeDoc(raw: unknown): ThemeDoc {
  const r = (raw && typeof raw === "object" ? raw : {}) as Partial<ThemeDoc>;
  const tpl = TEMPLATE_BY_KEY[r.template ?? ""] ?? TEMPLATE_BY_KEY[DEFAULT_TEMPLATE];
  const base = tpl.doc;
  return {
    v: 1,
    template: tpl.key,
    style: typeof r.style === "string" ? r.style.slice(0, 40) : undefined,
    settings: cleanSettings(r.settings, base.settings),
    groups: {
      header: cleanList(r.groups?.header, "header", base.groups.header),
      footer: cleanList(r.groups?.footer, "footer", base.groups.footer),
    },
    pages: {
      home: cleanList(r.pages?.home, "home", base.pages.home),
      product: cleanList(r.pages?.product, "product", base.pages.product),
      collection: cleanList(r.pages?.collection, "collection", base.pages.collection),
    },
  };
}

/** Documento de una plantilla (con uno de sus estilos), listo para aplicarse a una tienda. */
export function docFromTemplate(templateKey: string, styleKey?: string): ThemeDoc {
  const tpl = TEMPLATE_BY_KEY[templateKey] ?? TEMPLATE_BY_KEY[DEFAULT_TEMPLATE];
  const d: ThemeDoc = structuredClone(tpl.doc);
  const style = tpl.styles.find((s) => s.key === styleKey);
  if (style) {
    d.style = style.key;
    for (const k of SCHEME_KEYS) if (style.schemes?.[k]) d.settings.schemes[k] = { ...d.settings.schemes[k], ...style.schemes[k] };
    if (style.fonts) d.settings.fonts = { ...d.settings.fonts, ...style.fonts };
  }
  return normalizeDoc(d);
}

/* -------------------------------------------------- temas anteriores */

type LegacyHomeSection = { type: string; title: string | null; config: Record<string, unknown>; active: boolean };

/**
 * Tiendas creadas antes del motor de temas: su `sites.theme` (plantilla +
 * colores) y sus `home_sections` se traducen al documento nuevo al vuelo.
 * Nada se migra en la base: al primer guardado en el editor queda el nuevo.
 */
export function legacyToDoc(theme: SiteTheme | null | undefined, homeSections: LegacyHomeSection[] = []): ThemeDoc {
  const d = docFromTemplate(theme?.template ?? DEFAULT_TEMPLATE);
  const c = theme?.colors;
  if (c) {
    const b = d.settings.schemes.base;
    d.settings.schemes.base = {
      ...b,
      bg: color(c.background, b.bg), fg: color(c.foreground, b.fg), primary: color(c.primary, b.primary),
      primaryFg: color(c.primaryForeground, b.primaryFg), accent: color(c.accent, b.accent), muted: color(c.muted, b.muted),
      border: color(c.muted, b.border),
    };
  }
  if (theme?.fonts) d.settings.fonts = { display: fontName(theme.fonts.display, d.settings.fonts.display), body: fontName(theme.fonts.body, d.settings.fonts.body) };
  if (theme?.radius) d.settings.radius = theme.radius;
  if (theme?.logoUrl) d.settings.logoUrl = theme.logoUrl;
  if (theme?.announcement) {
    const ann = d.groups.header.find((s) => s.type === "announcement");
    if (ann) ann.settings = { ...ann.settings, text: theme.announcement };
    else d.groups.header.unshift({ id: "legacy-ann", type: "announcement", variant: "static", settings: { text: theme.announcement } });
  }

  const active = homeSections.filter((s) => s.active);
  if (active.length > 0) {
    const mapped: SectionInstance[] = [];
    for (const [i, s] of active.entries()) {
      const id = `legacy-${i}`;
      const cfg = s.config ?? {};
      const title = s.title ?? undefined;
      switch (s.type) {
        case "hero_banners":
          mapped.push({ id, type: "hero", variant: "carousel", settings: { title: cfg.title, subtitle: cfg.subtitle, image: cfg.imageUrl, primaryLabel: cfg.primaryLabel, primaryHref: cfg.primaryHref, secondaryLabel: cfg.secondaryLabel, secondaryHref: cfg.secondaryHref } });
          break;
        case "featured_products":
          mapped.push({ id, type: "product_grid", variant: "grid", settings: { title: title ?? "Destacados", source: cfg.source === "newest" ? "newest" : "featured", limit: cfg.limit ?? 8 } });
          break;
        case "carousel":
          mapped.push({ id, type: "product_grid", variant: "carousel", settings: { title, source: cfg.categorySlug ? "category" : cfg.source === "featured" ? "featured" : "newest", category: cfg.categorySlug, limit: cfg.limit ?? 12 } });
          break;
        case "category_grid":
          mapped.push({ id, type: "category_tiles", variant: "tiles", settings: { title: title ?? "Categorías", limit: cfg.limit ?? 6 } });
          break;
        case "banner_strip":
          mapped.push({ id, type: "banner_strip", variant: "grid", settings: { title } });
          break;
        case "cta_band":
          mapped.push({ id, type: "cta_band", variant: "band", settings: { title: cfg.title ?? title, subtitle: cfg.subtitle, buttonLabel: cfg.buttonLabel, buttonHref: cfg.buttonHref } });
          break;
        case "custom_html":
          mapped.push({ id, type: "custom_html", variant: "default", settings: { title, html: cfg.html } });
          break;
      }
    }
    d.pages.home = mapped;
  }
  return normalizeDoc(d);
}

/* ------------------------------------------------------- para pintar */

const RADIUS: Record<GlobalSettings["radius"], string> = { none: "0px", sm: "4px", md: "8px", lg: "16px", full: "999px" };
const SCALE: Record<GlobalSettings["typeScale"], string> = { compact: "0.9", normal: "1", large: "1.12", huge: "1.28" };
const WEIGHT: Record<GlobalSettings["headingWeight"], string> = { light: "300", regular: "500", bold: "700", black: "900" };
const WIDTH: Record<GlobalSettings["width"], string> = { narrow: "1080px", normal: "1280px", wide: "1440px", full: "100%" };

export function schemeVars(s: Scheme): Record<string, string> {
  return {
    "--sf-bg": s.bg, "--sf-fg": s.fg, "--sf-primary": s.primary, "--sf-primary-fg": s.primaryFg,
    "--sf-accent": s.accent, "--sf-muted": s.muted, "--sf-border": s.border,
  };
}

export type ResolvedDoc = {
  doc: ThemeDoc;
  /** Variables del contenedor raíz (esquema base + tipografía + forma). */
  cssVars: Record<string, string>;
  /** CSS de los esquemas alternos, para un <style> en el layout. */
  schemeCss: string;
  fontsHref: string;
  /** data-* del contenedor raíz: los estilos de movimiento, botones y tarjetas cuelgan de aquí. */
  rootAttrs: Record<string, string>;
};

export function resolveDoc(doc: ThemeDoc): ResolvedDoc {
  const st = doc.settings;
  const cssVars: Record<string, string> = {
    ...schemeVars(st.schemes.base),
    "--sf-radius": RADIUS[st.radius],
    "--sf-font-display": `'${st.fonts.display}', ui-serif, Georgia, serif`,
    "--sf-font-body": `'${st.fonts.body}', ui-sans-serif, system-ui, sans-serif`,
    "--sf-scale": SCALE[st.typeScale],
    "--sf-heading-weight": WEIGHT[st.headingWeight],
    "--sf-heading-case": st.headingCase === "upper" ? "uppercase" : "none",
    "--sf-max": WIDTH[st.width],
    "--sf-display-w": String(FONT_BY_NAME[st.fonts.display]?.width ?? 0.75),
  };
  const schemeCss = SCHEME_KEYS.map((k) => {
    const vars = Object.entries(schemeVars(st.schemes[k])).map(([n, v]) => `${n}:${v}`).join(";");
    return `.sf [data-scheme="${k}"]{${vars}}`;
  }).join("\n");
  const families = [...new Set([st.fonts.display, st.fonts.body])].map(fontParam);
  const fontsHref = `https://fonts.googleapis.com/css2?${families.join("&")}&display=swap`;
  return {
    doc, cssVars, schemeCss, fontsHref,
    rootAttrs: {
      "data-template": doc.template,
      "data-reveal": st.motion.reveal,
      "data-hover": st.motion.hover,
      "data-intensity": st.motion.intensity,
      "data-buttons": st.buttons,
      "data-cards": st.cards,
      "data-ratio": st.cardRatio,
      "data-texture": st.texture,
      "data-radius": st.radius,
    },
  };
}

export function visibleSections(list: SectionInstance[]): SectionInstance[] {
  return list.filter((s) => !s.hidden);
}

export type { PageKey };
