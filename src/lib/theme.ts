import type { SiteTheme } from "@/lib/db/schema";
import { fontParam } from "@/themes/fonts";
import { THEME_TEMPLATES } from "@/themes/templates";

/**
 * Compatibilidad con el formato anterior (plantilla + colores planos). Lo
 * siguen usando los correos, el resumen de la tienda y el registro público.
 * La fuente de verdad del diseño ahora es el motor de temas (src/themes).
 */
export type TemplateDef = {
  key: string;
  name: string;
  description: string;
  tags: string[];
  highlights: string[];
  demo: string;
  defaults: Required<Pick<SiteTheme, "colors" | "fonts" | "radius">>;
};

export const TEMPLATES: TemplateDef[] = THEME_TEMPLATES.map((t) => {
  const b = t.doc.settings.schemes.base;
  return {
    key: t.key, name: t.name, description: t.description, tags: t.tags, highlights: t.highlights, demo: t.demo,
    defaults: {
      colors: { primary: b.primary, primaryForeground: b.primaryFg, accent: b.accent, background: b.bg, foreground: b.fg, muted: b.muted },
      fonts: t.doc.settings.fonts,
      radius: t.doc.settings.radius,
    },
  };
});

export const TEMPLATE_BY_KEY: Record<string, TemplateDef> = Object.fromEntries(TEMPLATES.map((t) => [t.key, t]));

const RADIUS: Record<NonNullable<SiteTheme["radius"]>, string> = { none: "0px", sm: "4px", md: "8px", lg: "16px", full: "999px" };

export type ResolvedTheme = {
  template: TemplateDef;
  colors: Required<NonNullable<SiteTheme["colors"]>>;
  fonts: Required<NonNullable<SiteTheme["fonts"]>>;
  radius: string;
  logoUrl: string | null;
  announcement: string | null;
  fontsHref: string;
  cssVars: Record<string, string>;
};

export function resolveTheme(theme: SiteTheme | null | undefined): ResolvedTheme {
  const template = TEMPLATE_BY_KEY[theme?.template ?? ""] ?? TEMPLATES[0];
  const colors = { ...template.defaults.colors, ...(theme?.colors ?? {}) } as ResolvedTheme["colors"];
  const fonts = { ...template.defaults.fonts, ...(theme?.fonts ?? {}) } as ResolvedTheme["fonts"];
  const radius = RADIUS[theme?.radius ?? template.defaults.radius];
  const fontsHref = `https://fonts.googleapis.com/css2?${[...new Set([fonts.display, fonts.body])].map(fontParam).join("&")}&display=swap`;
  return {
    template, colors, fonts, radius,
    logoUrl: theme?.logoUrl ?? null,
    announcement: theme?.announcement?.trim() || null,
    fontsHref,
    cssVars: {
      "--sf-primary": colors.primary, "--sf-primary-fg": colors.primaryForeground, "--sf-accent": colors.accent,
      "--sf-bg": colors.background, "--sf-fg": colors.foreground, "--sf-muted": colors.muted, "--sf-radius": radius,
      "--sf-font-display": `'${fonts.display}', serif`, "--sf-font-body": `'${fonts.body}', system-ui, sans-serif`,
    },
  };
}
