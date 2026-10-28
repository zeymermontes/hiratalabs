import type { SiteTheme } from "@/lib/db/schema";

/**
 * Plantillas del storefront. Cada una trae tokens por default que la tienda
 * sobreescribe desde "Diseño". Los tokens llegan al HTML como variables CSS
 * (--sf-*) y las páginas del storefront solo usan esas variables, así una
 * tienda nunca hereda la marca de Hirata Labs ni la de otra tienda.
 */
export type TemplateDef = {
  key: string;
  name: string;
  description: string;
  /** Para qué negocios se recomienda; se muestra en el onboarding. */
  tags: string[];
  defaults: Required<Pick<SiteTheme, "colors" | "fonts" | "radius">>;
  /** Google Fonts families a cargar. */
  googleFonts: string[];
};

export const TEMPLATES: TemplateDef[] = [
  {
    key: "lumen",
    name: "Lumen",
    description: "Editorial y espaciosa: serif en los títulos, mucho aire, revelado suave al hacer scroll.",
    tags: ["plantas", "cosmética", "artesanía", "moda"],
    defaults: {
      colors: { primary: "#2f5d3a", primaryForeground: "#f7f5ef", accent: "#d9cbb0", background: "#f7f5ef", foreground: "#1a1a1a", muted: "#e3dfd3" },
      fonts: { display: "Fraunces", body: "Manrope" },
      radius: "lg",
    },
    googleFonts: ["Fraunces:opsz,wght@9..144,400;9..144,500;9..144,700", "Manrope:wght@400;500;600;700;800"],
  },
  {
    key: "grid",
    name: "Grid",
    description: "Catálogo denso en 4 columnas, fondo oscuro opcional, hover con zoom. Base de Hirata Impresión.",
    tags: ["imprenta", "papelería", "electrónica", "catálogos grandes"],
    defaults: {
      colors: { primary: "#facc15", primaryForeground: "#0a0a0a", accent: "#fef9c3", background: "#ffffff", foreground: "#0a0a0a", muted: "#f5f5f5" },
      fonts: { display: "Space Grotesk", body: "Inter" },
      radius: "md",
    },
    googleFonts: ["Space+Grotesk:wght@500;700", "Inter:wght@400;500;600;700"],
  },
  {
    key: "mercado",
    name: "Mercado",
    description: "Cálida y local: sucursales y WhatsApp al frente, botones grandes. Base de La Rica Dona.",
    tags: ["comida", "panadería", "restaurante", "retail local"],
    defaults: {
      colors: { primary: "#c62828", primaryForeground: "#fff4e6", accent: "#f5d6a8", background: "#fff4e6", foreground: "#3b1d12", muted: "#f8e6cc" },
      fonts: { display: "Bebas Neue", body: "Nunito" },
      radius: "full",
    },
    googleFonts: ["Bebas+Neue", "Nunito:wght@400;600;700;800"],
  },
  {
    key: "galeria",
    name: "Galería",
    description: "Oscura, la imagen primero: masonry, visor de piezas y pocas palabras. Base de GasGar.",
    tags: ["arte", "fotografía", "joyería", "piezas únicas"],
    defaults: {
      colors: { primary: "#ededed", primaryForeground: "#111111", accent: "#8c5a3c", background: "#111111", foreground: "#ededed", muted: "#1f1f1f" },
      fonts: { display: "Cormorant Garamond", body: "Inter" },
      radius: "sm",
    },
    googleFonts: ["Cormorant+Garamond:wght@500;600;700", "Inter:wght@400;500;600"],
  },
  {
    key: "taller",
    name: "Taller",
    description: "Para productos que el cliente diseña: flujo guiado paso a paso. Base de Momentos.",
    tags: ["fotolibros", "personalizados", "regalos"],
    defaults: {
      colors: { primary: "#f272b3", primaryForeground: "#ffffff", accent: "#f9d4e6", background: "#ffffff", foreground: "#1a1a1a", muted: "#f7f7f7" },
      fonts: { display: "Manrope", body: "Manrope" },
      radius: "lg",
    },
    googleFonts: ["Manrope:wght@400;500;600;700;800"],
  },
];

export const TEMPLATE_BY_KEY: Record<string, TemplateDef> = Object.fromEntries(TEMPLATES.map((t) => [t.key, t]));

const RADIUS: Record<NonNullable<SiteTheme["radius"]>, string> = {
  none: "0px", sm: "4px", md: "8px", lg: "14px", full: "999px",
};

export type ResolvedTheme = {
  template: TemplateDef;
  colors: Required<NonNullable<SiteTheme["colors"]>>;
  fonts: Required<NonNullable<SiteTheme["fonts"]>>;
  radius: string;
  logoUrl: string | null;
  announcement: string | null;
  /** URL de Google Fonts con las familias que usa la tienda. */
  fontsHref: string;
  /** Variables CSS para el <html> del storefront. */
  cssVars: Record<string, string>;
};

export function resolveTheme(theme: SiteTheme | null | undefined): ResolvedTheme {
  const template = TEMPLATE_BY_KEY[theme?.template ?? ""] ?? TEMPLATES[0];
  const colors = { ...template.defaults.colors, ...(theme?.colors ?? {}) } as ResolvedTheme["colors"];
  const fonts = { ...template.defaults.fonts, ...(theme?.fonts ?? {}) } as ResolvedTheme["fonts"];
  const radius = RADIUS[theme?.radius ?? template.defaults.radius];

  // Si la tienda cambió de fuente, se pide esa familia con pesos genéricos.
  const families = new Set(template.googleFonts);
  for (const f of [fonts.display, fonts.body]) {
    const inTemplate = template.googleFonts.some((g) => g.split(":")[0].replace(/\+/g, " ") === f);
    if (!inTemplate) families.add(`${f.replace(/ /g, "+")}:wght@400;500;600;700`);
  }
  const fontsHref = `https://fonts.googleapis.com/css2?${[...families].map((f) => `family=${f}`).join("&")}&display=swap`;

  return {
    template, colors, fonts, radius,
    logoUrl: theme?.logoUrl ?? null,
    announcement: theme?.announcement?.trim() || null,
    fontsHref,
    cssVars: {
      "--sf-primary": colors.primary,
      "--sf-primary-fg": colors.primaryForeground,
      "--sf-accent": colors.accent,
      "--sf-bg": colors.background,
      "--sf-fg": colors.foreground,
      "--sf-muted": colors.muted,
      "--sf-radius": radius,
      "--sf-font-display": `'${fonts.display}', serif`,
      "--sf-font-body": `'${fonts.body}', system-ui, sans-serif`,
    },
  };
}
