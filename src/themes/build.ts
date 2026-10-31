import type { BlockInstance, GlobalSettings, Scheme, SchemeKey, SectionInstance, ThemeDoc } from "./types";

/**
 * Atajos para escribir plantillas como datos sin repetir boilerplate.
 * Los ids solo necesitan ser únicos dentro del documento.
 */

let seq = 0;
const nextId = (p: string) => `${p}-${(++seq).toString(36)}`;

export function sec(
  type: string,
  variant: string | undefined,
  settings: Record<string, unknown> = {},
  opts: { scheme?: SchemeKey; blocks?: [string, Record<string, unknown>][]; id?: string } = {},
): SectionInstance {
  const blocks: BlockInstance[] | undefined = opts.blocks?.map(([bt, s]) => ({ id: nextId("b"), type: bt, settings: s }));
  return { id: opts.id ?? nextId(type), type, variant, scheme: opts.scheme, settings, blocks };
}

export function scheme(bg: string, fg: string, primary: string, primaryFg: string, accent: string, muted: string, border?: string): Scheme {
  return { bg, fg, primary, primaryFg, accent, muted, border: border ?? muted };
}

/** Ajustes globales con defaults sensatos; cada plantilla cambia lo suyo. */
export function settings(over: Partial<GlobalSettings> & Pick<GlobalSettings, "schemes" | "fonts">): GlobalSettings {
  return {
    typeScale: "normal",
    headingCase: "normal",
    headingWeight: "regular",
    radius: "md",
    buttons: "solid",
    cards: "classic",
    cardRatio: "portrait",
    motion: { reveal: "rise", hover: "lift", intensity: "normal" },
    width: "normal",
    texture: "plain",
    ...over,
  };
}

/** Páginas de producto y colección por default; las plantillas pueden cambiar variantes. */
export function productPage(variant = "gallery", extra: SectionInstance[] = [], relatedVariant = "grid"): SectionInstance[] {
  return [
    sec("product_main", variant, { stickyInfo: true }),
    ...extra,
    sec("related_products", relatedVariant, { title: "También te puede gustar", limit: 4 }),
  ];
}

export function collectionPage(headerVariant = "simple", gridVariant = "pills", columns = "4", extra: SectionInstance[] = []): SectionInstance[] {
  return [
    sec("collection_header", headerVariant, { eyebrow: "Catálogo" }),
    sec("collection_grid", gridVariant, { columns, showSearch: true }),
    ...extra,
  ];
}

export function doc(d: Omit<ThemeDoc, "v">): ThemeDoc {
  return { v: 1, ...d };
}
