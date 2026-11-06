/**
 * Motor de temas del storefront. Un tema es DATOS: ajustes globales + listas
 * de secciones por página y por grupo (encabezado y pie). Las secciones
 * viven en una biblioteca compartida (src/themes/sections.ts) con variantes,
 * así que una plantilla nueva es un archivo de datos, no código.
 */

export type PageKey = "home" | "product" | "collection";
export type GroupKey = "header" | "footer";
export type Zone = PageKey | GroupKey;

export const SCHEME_KEYS = ["base", "alt", "invert", "accent"] as const;
export type SchemeKey = (typeof SCHEME_KEYS)[number];

/** Esquema de color: cada sección elige uno y la página se pinta con él. */
export type Scheme = {
  bg: string;
  fg: string;
  primary: string;
  primaryFg: string;
  accent: string;
  muted: string;
  border: string;
};

export type Motion = {
  /** Cómo entran las secciones al hacer scroll. */
  reveal: "none" | "fade" | "rise" | "mask" | "zoom" | "blur" | "slide";
  /** Qué pasa al pasar el cursor por tarjetas y botones. */
  hover: "none" | "lift" | "zoom" | "tilt" | "hard" | "glow";
  intensity: "soft" | "normal" | "bold";
};

export type GlobalSettings = {
  schemes: Record<SchemeKey, Scheme>;
  fonts: { display: string; body: string };
  typeScale: "compact" | "normal" | "large" | "huge";
  headingCase: "normal" | "upper";
  headingWeight: "light" | "regular" | "bold" | "black";
  radius: "none" | "sm" | "md" | "lg" | "full";
  buttons: "solid" | "outline" | "pill" | "hard" | "underline";
  cards: "classic" | "overlay" | "minimal" | "bordered" | "polaroid" | "swap";
  cardRatio: "square" | "portrait" | "landscape";
  motion: Motion;
  width: "narrow" | "normal" | "wide" | "full";
  texture: "plain" | "grain" | "grid" | "dots";
  logoUrl?: string;
};

export type BlockInstance = {
  id: string;
  type: string;
  settings: Record<string, unknown>;
};

export type SectionInstance = {
  id: string;
  type: string;
  variant?: string;
  /** Esquema de color de la sección; sin valor usa "base". */
  scheme?: SchemeKey;
  hidden?: boolean;
  settings: Record<string, unknown>;
  blocks?: BlockInstance[];
};

export type ThemeDoc = {
  v: 1;
  /** Plantilla de la que salió (para el selector y la demo). */
  template: string;
  /** Estilo de la plantilla (paleta + tipografía alternativas). */
  style?: string;
  settings: GlobalSettings;
  groups: Record<GroupKey, SectionInstance[]>;
  pages: Record<PageKey, SectionInstance[]>;
};

/* ------------------------------------------------- esquema de ajustes */

export type SettingOption = { value: string; label: string };

/** Un campo editable de una sección o bloque. El panel arma el formulario con esto. */
export type SettingDef =
  | { key: string; type: "text" | "textarea" | "url" | "image" | "datetime" | "html"; label: string; hint?: string; default?: string; placeholder?: string }
  | { key: string; type: "select"; label: string; hint?: string; default?: string; options: SettingOption[] }
  | { key: string; type: "range"; label: string; hint?: string; default?: number; min: number; max: number; step?: number; unit?: string }
  | { key: string; type: "toggle"; label: string; hint?: string; default?: boolean }
  | { key: string; type: "category"; label: string; hint?: string; default?: string };

export type BlockDef = {
  type: string;
  label: string;
  settings: SettingDef[];
};

export type VariantDef = { key: string; label: string; hint?: string };

export type SectionDef = {
  type: string;
  label: string;
  hint: string;
  /** Dónde se puede poner. */
  zones: Zone[];
  variants: VariantDef[];
  settings: SettingDef[];
  blocks?: { max: number; types: BlockDef[] };
  /** Solo una por página (p. ej. el encabezado o la ficha de producto). */
  single?: boolean;
  /** No se puede quitar de su zona (la ficha de producto, la rejilla de colección). */
  required?: boolean;
};

/* ------------------------------------------------------- plantillas */

export type TemplateStyle = {
  key: string;
  name: string;
  schemes?: Partial<Record<SchemeKey, Partial<Scheme>>>;
  fonts?: Partial<GlobalSettings["fonts"]>;
};

export type TemplateDef = {
  key: string;
  name: string;
  description: string;
  /** Giros para los que se recomienda. */
  tags: string[];
  /** Industria de la tienda demo (elige el catálogo de ejemplo). */
  demo: string;
  /** Rasgos que la distinguen, para el selector. */
  highlights: string[];
  styles: TemplateStyle[];
  doc: ThemeDoc;
};
