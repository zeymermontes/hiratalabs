import { SECTION_BY_TYPE, defaultSettings } from "@/themes/sections";
import type { BlockInstance, SectionDef, SectionInstance, ThemeDoc, Zone } from "@/themes/types";

/** Cambios inmutables al documento del tema, compartidos por los paneles del editor. */

let seq = 0;
export const newId = (p: string) => `${p}-${Date.now().toString(36)}${(++seq).toString(36)}`;

export const isGroup = (z: Zone): z is "header" | "footer" => z === "header" || z === "footer";

export function getList(doc: ThemeDoc, zone: Zone): SectionInstance[] {
  return isGroup(zone) ? doc.groups[zone] : doc.pages[zone];
}

export function withList(doc: ThemeDoc, zone: Zone, list: SectionInstance[]): ThemeDoc {
  return isGroup(zone)
    ? { ...doc, groups: { ...doc.groups, [zone]: list } }
    : { ...doc, pages: { ...doc.pages, [zone]: list } };
}

export function updateSection(doc: ThemeDoc, zone: Zone, id: string, fn: (s: SectionInstance) => SectionInstance): ThemeDoc {
  return withList(doc, zone, getList(doc, zone).map((s) => (s.id === id ? fn(s) : s)));
}

export function moveItem<T>(list: T[], from: number, to: number): T[] {
  if (from === to || from < 0 || to < 0 || from >= list.length || to >= list.length) return list;
  const copy = [...list];
  const [it] = copy.splice(from, 1);
  copy.splice(to, 0, it);
  return copy;
}

export function newSection(def: SectionDef): SectionInstance {
  return {
    id: newId(def.type), type: def.type, variant: def.variants[0]?.key, scheme: "base",
    settings: defaultSettings(def.settings), blocks: def.blocks ? [] : undefined,
  };
}

export function cloneSection(s: SectionInstance): SectionInstance {
  const c: SectionInstance = structuredClone(s);
  c.id = newId(s.type);
  c.blocks = c.blocks?.map((b) => ({ ...b, id: newId("b") }));
  return c;
}

export function newBlock(type: string): BlockInstance {
  const def = Object.values(SECTION_BY_TYPE).flatMap((s) => s.blocks?.types ?? []).find((b) => b.type === type);
  return { id: newId("b"), type, settings: def ? defaultSettings(def.settings) : {} };
}

/** Texto corto para reconocer una sección o bloque en la lista. */
export function summary(settings: Record<string, unknown>): string {
  for (const k of ["title", "name", "question", "text", "author", "caption", "eyebrow"]) {
    const v = settings[k];
    if (typeof v === "string" && v.trim()) return v.trim().replace(/\s+/g, " ").slice(0, 48);
  }
  return "";
}
