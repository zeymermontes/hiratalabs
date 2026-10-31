import type { GlobalSettings, PageKey, Scheme, SchemeKey, TemplateStyle } from "@/themes/types";

/** Lo que el editor necesita de cada plantilla (sin sus secciones). */
export type TemplateSummary = {
  key: string;
  name: string;
  description: string;
  tags: string[];
  highlights: string[];
  styles: TemplateStyle[];
  schemes: Record<SchemeKey, Scheme>;
  fonts: GlobalSettings["fonts"];
  demoUrl: string;
};

export type VersionRow = {
  id: string;
  status: "draft" | "published" | "archived";
  label: string | null;
  template: string;
  updatedAt: string;
  publishedAt: string | null;
};

export type CategoryOption = { slug: string; name: string };

export const PAGE_PATHS: { key: PageKey; label: string }[] = [
  { key: "home", label: "Portada" },
  { key: "product", label: "Producto" },
  { key: "collection", label: "Catálogo" },
];

export const SCHEME_LABEL: Record<SchemeKey, string> = {
  base: "Base", alt: "Alterno", invert: "Invertido", accent: "Acento",
};
