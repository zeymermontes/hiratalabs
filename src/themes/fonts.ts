/**
 * Catálogo curado de Google Fonts. Cada familia lleva los ejes que de verdad
 * tiene: pedir un peso que no existe hace que Google responda error y la
 * tienda se quede sin fuente. El editor ofrece solo estas.
 */
export type FontDef = { name: string; spec: string; kind: "serif" | "sans" | "display" | "mono" | "hand" };

export const FONTS: FontDef[] = [
  // Serif
  { name: "Fraunces", spec: "ital,opsz,wght@0,9..144,300..900;1,9..144,300..900", kind: "serif" },
  { name: "Playfair Display", spec: "ital,wght@0,400..900;1,400..900", kind: "serif" },
  { name: "Cormorant Garamond", spec: "ital,wght@0,300..700;1,300..700", kind: "serif" },
  { name: "DM Serif Display", spec: "ital@0;1", kind: "serif" },
  { name: "Instrument Serif", spec: "ital@0;1", kind: "serif" },
  { name: "Libre Caslon Text", spec: "ital,wght@0,400..700;1,400..700", kind: "serif" },
  { name: "Newsreader", spec: "ital,opsz,wght@0,6..72,200..800;1,6..72,200..800", kind: "serif" },
  { name: "Lora", spec: "ital,wght@0,400..700;1,400..700", kind: "serif" },
  { name: "Bodoni Moda", spec: "ital,opsz,wght@0,6..96,400..900;1,6..96,400..900", kind: "serif" },
  // Sans
  { name: "Inter", spec: "ital,opsz,wght@0,14..32,100..900;1,14..32,100..900", kind: "sans" },
  { name: "Manrope", spec: "wght@200..800", kind: "sans" },
  { name: "DM Sans", spec: "ital,opsz,wght@0,9..40,100..1000;1,9..40,100..1000", kind: "sans" },
  { name: "Plus Jakarta Sans", spec: "ital,wght@0,200..800;1,200..800", kind: "sans" },
  { name: "Nunito", spec: "ital,wght@0,200..1000;1,200..1000", kind: "sans" },
  { name: "Outfit", spec: "wght@100..900", kind: "sans" },
  { name: "Sora", spec: "wght@100..800", kind: "sans" },
  { name: "Work Sans", spec: "ital,wght@0,100..900;1,100..900", kind: "sans" },
  { name: "Space Grotesk", spec: "wght@300..700", kind: "sans" },
  { name: "Archivo", spec: "ital,wdth,wght@0,62..125,100..900;1,62..125,100..900", kind: "sans" },
  { name: "Figtree", spec: "ital,wght@0,300..900;1,300..900", kind: "sans" },
  { name: "Urbanist", spec: "ital,wght@0,100..900;1,100..900", kind: "sans" },
  { name: "Lexend", spec: "wght@100..900", kind: "sans" },
  { name: "Quicksand", spec: "wght@300..700", kind: "sans" },
  // Display
  { name: "Bebas Neue", spec: "", kind: "display" },
  { name: "Anton", spec: "", kind: "display" },
  { name: "Archivo Black", spec: "", kind: "display" },
  { name: "Syne", spec: "wght@400..800", kind: "display" },
  { name: "Unbounded", spec: "wght@200..900", kind: "display" },
  { name: "Fredoka", spec: "wght@300..700", kind: "display" },
  { name: "Bricolage Grotesque", spec: "opsz,wght@12..96,200..800", kind: "display" },
  { name: "Big Shoulders Display", spec: "wght@100..900", kind: "display" },
  { name: "Righteous", spec: "", kind: "display" },
  { name: "Rubik Mono One", spec: "", kind: "display" },
  { name: "Climate Crisis", spec: "", kind: "display" },
  // Mono
  { name: "Space Mono", spec: "ital,wght@0,400;0,700;1,400;1,700", kind: "mono" },
  { name: "JetBrains Mono", spec: "ital,wght@0,100..800;1,100..800", kind: "mono" },
  { name: "IBM Plex Mono", spec: "ital,wght@0,300;0,400;0,500;0,600;0,700;1,400", kind: "mono" },
  // A mano
  { name: "Caveat", spec: "wght@400..700", kind: "hand" },
  { name: "Gloria Hallelujah", spec: "", kind: "hand" },
];

export const FONT_BY_NAME: Record<string, FontDef> = Object.fromEntries(FONTS.map((f) => [f.name, f]));

/** Parámetro `family=` de Google Fonts para una familia (con sus ejes reales). */
export function fontParam(name: string): string {
  const def = FONT_BY_NAME[name];
  const fam = name.replace(/ /g, "+");
  return def?.spec ? `family=${fam}:${def.spec}` : `family=${fam}`;
}
