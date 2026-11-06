"use client";

import { useId, useState } from "react";
import { SECTION_BY_TYPE, sectionsForZone } from "@/themes/sections";
import { SCHEME_KEYS, type PageKey, type SectionInstance, type ThemeDoc, type Zone } from "@/themes/types";
import {
  cloneSection, getList, moveItem, newBlock, newSection, summary, updateSection, withList,
} from "./doc-utils";
import type { CategoryOption } from "./editor-types";
import { SCHEME_LABEL } from "./editor-types";
import { SettingsForm } from "./fields";
import { Icon } from "./icons";

export type Update = (fn: (d: ThemeDoc) => ThemeDoc, coalesceKey?: string) => void;
export type Selection = { zone: Zone; id: string } | null;

const PAGE_TITLE: Record<PageKey, string> = { home: "Portada", product: "Página de producto", collection: "Catálogo" };

const iconBtn =
  "inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-neutral-500 transition hover:bg-neutral-100 hover:text-neutral-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-purple/40 disabled:pointer-events-none disabled:opacity-30";

export function SectionsPanel({
  doc, page, update, selected, onSelect, siteId, categories,
}: {
  doc: ThemeDoc;
  page: PageKey;
  update: Update;
  selected: Selection;
  onSelect: (s: Selection) => void;
  siteId: string;
  categories: CategoryOption[];
}) {
  const current = selected ? getList(doc, selected.zone).find((s) => s.id === selected.id) : undefined;
  if (selected && current) {
    return (
      <SectionEditor
        zone={selected.zone} section={current} doc={doc} update={update} onBack={() => onSelect(null)}
        siteId={siteId} categories={categories}
      />
    );
  }
  return (
    <div className="space-y-6">
      <SectionList zone="header" title="Encabezado" doc={doc} update={update} onSelect={onSelect} />
      <SectionList zone={page} title={PAGE_TITLE[page]} doc={doc} update={update} onSelect={onSelect} />
      <SectionList zone="footer" title="Pie de página" doc={doc} update={update} onSelect={onSelect} />
    </div>
  );
}

/* --------------------------------------------------------------- lista */

function SectionList({
  zone, title, doc, update, onSelect,
}: {
  zone: Zone;
  title: string;
  doc: ThemeDoc;
  update: Update;
  onSelect: (s: Selection) => void;
}) {
  const list = getList(doc, zone);
  const [adding, setAdding] = useState(false);
  const [dragFrom, setDragFrom] = useState<number | null>(null);
  const [dragOver, setDragOver] = useState<number | null>(null);
  const headingId = useId();

  const setList = (fn: (l: SectionInstance[]) => SectionInstance[]) => update((d) => withList(d, zone, fn(getList(d, zone))));
  const available = sectionsForZone(zone).filter((def) => !(def.single && list.some((s) => s.type === def.type)));

  return (
    <section aria-labelledby={headingId}>
      <h3 id={headingId} className="label">{title}</h3>
      <ul className="space-y-1">
        {list.map((s, i) => {
          const def = SECTION_BY_TYPE[s.type];
          const variant = def?.variants.find((v) => v.key === s.variant);
          const text = summary(s.settings);
          return (
            <li
              key={s.id}
              draggable
              onDragStart={(e) => { setDragFrom(i); e.dataTransfer.effectAllowed = "move"; e.dataTransfer.setData("text/plain", s.id); }}
              onDragOver={(e) => { if (dragFrom === null) return; e.preventDefault(); setDragOver(i); }}
              onDragLeave={() => setDragOver((o) => (o === i ? null : o))}
              onDrop={(e) => { e.preventDefault(); if (dragFrom !== null) setList((l) => moveItem(l, dragFrom, i)); setDragFrom(null); setDragOver(null); }}
              onDragEnd={() => { setDragFrom(null); setDragOver(null); }}
              className={`group flex items-center gap-1 rounded-lg border bg-white pr-1 transition ${
                dragOver === i && dragFrom !== i ? "border-purple ring-2 ring-purple/30" : "border-neutral-200"
              } ${dragFrom === i ? "opacity-50" : ""} ${s.hidden ? "bg-neutral-50" : ""}`}
            >
              <span className="flex h-10 w-6 shrink-0 cursor-grab items-center justify-center text-neutral-400 active:cursor-grabbing" title="Arrastra para mover">
                <Icon name="grip" />
              </span>
              <button
                type="button" onClick={() => onSelect({ zone, id: s.id })}
                className="min-w-0 flex-1 rounded-md py-1.5 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-purple/40"
              >
                <span className={`block truncate text-sm font-medium ${s.hidden ? "text-neutral-400 line-through" : "text-neutral-900"}`}>
                  {def?.label ?? s.type}
                </span>
                <span className="block truncate text-xs text-neutral-500">
                  {[variant?.label, text].filter(Boolean).join(" · ") || "Sin texto"}
                </span>
              </button>
              <button
                type="button" className={iconBtn} aria-pressed={!s.hidden}
                aria-label={s.hidden ? `Mostrar ${def?.label}` : `Ocultar ${def?.label}`} title={s.hidden ? "Mostrar" : "Ocultar"}
                onClick={() => update((d) => updateSection(d, zone, s.id, (x) => ({ ...x, hidden: x.hidden ? undefined : true })))}
              >
                <Icon name={s.hidden ? "eyeOff" : "eye"} />
              </button>
              <div className="flex items-center lg:opacity-0 lg:group-focus-within:opacity-100 lg:group-hover:opacity-100">
                <RowActions
                  label={def?.label ?? s.type} first={i === 0} last={i === list.length - 1}
                  canCopy={!def?.single} canDelete={!def?.required}
                  onMove={(dir) => setList((l) => moveItem(l, i, i + dir))}
                  onCopy={() => setList((l) => { const c = [...l]; c.splice(i + 1, 0, cloneSection(s)); return c; })}
                  onDelete={() => setList((l) => l.filter((x) => x.id !== s.id))}
                />
              </div>
            </li>
          );
        })}
      </ul>

      {available.length > 0 ? (
        adding ? (
          <div className="mt-2 rounded-lg border border-neutral-200 bg-white p-2">
            <div className="mb-1 flex items-center justify-between px-1">
              <span className="text-xs font-semibold text-neutral-700">Elige una sección</span>
              <button type="button" onClick={() => setAdding(false)} className="text-xs font-semibold text-neutral-500 hover:text-neutral-900">Cerrar</button>
            </div>
            <ul className="max-h-80 space-y-1 overflow-y-auto">
              {available.map((def) => (
                <li key={def.type}>
                  <button
                    type="button"
                    onClick={() => {
                      const s = newSection(def);
                      setList((l) => [...l, s]);
                      setAdding(false);
                      onSelect({ zone, id: s.id });
                    }}
                    className="w-full rounded-md px-2 py-2 text-left transition hover:bg-purple-tint focus:outline-none focus-visible:ring-2 focus-visible:ring-purple/40"
                  >
                    <span className="flex items-center justify-between gap-2">
                      <span className="text-sm font-medium text-neutral-900">{def.label}</span>
                      {def.variants.length > 1 ? <span className="pill bg-neutral-100 text-neutral-600">{def.variants.length} diseños</span> : null}
                    </span>
                    <span className="hint block">{def.hint}</span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        ) : (
          <button
            type="button" onClick={() => setAdding(true)}
            className="mt-2 flex w-full items-center justify-center gap-1.5 rounded-lg border border-dashed border-neutral-300 py-2 text-sm font-semibold text-purple transition hover:border-purple hover:bg-purple-tint focus:outline-none focus-visible:ring-2 focus-visible:ring-purple/40"
          >
            <Icon name="plus" /> Agregar sección
          </button>
        )
      ) : null}
    </section>
  );
}

function RowActions({
  label, first, last, canCopy, canDelete, onMove, onCopy, onDelete,
}: {
  label: string; first: boolean; last: boolean; canCopy: boolean; canDelete: boolean;
  onMove: (dir: -1 | 1) => void; onCopy: () => void; onDelete: () => void;
}) {
  return (
    <>
      <button type="button" className={iconBtn} disabled={first} onClick={() => onMove(-1)} aria-label={`Subir ${label}`} title="Subir"><Icon name="up" /></button>
      <button type="button" className={iconBtn} disabled={last} onClick={() => onMove(1)} aria-label={`Bajar ${label}`} title="Bajar"><Icon name="down" /></button>
      {canCopy ? <button type="button" className={iconBtn} onClick={onCopy} aria-label={`Duplicar ${label}`} title="Duplicar"><Icon name="copy" /></button> : null}
      {canDelete ? (
        <button type="button" className={`${iconBtn} hover:!bg-red-50 hover:!text-red-700`} onClick={onDelete} aria-label={`Quitar ${label}`} title="Quitar">
          <Icon name="trash" />
        </button>
      ) : null}
    </>
  );
}

/* ------------------------------------------------------------ editor */

function SectionEditor({
  zone, section, doc, update, onBack, siteId, categories,
}: {
  zone: Zone;
  section: SectionInstance;
  doc: ThemeDoc;
  update: Update;
  onBack: () => void;
  siteId: string;
  categories: CategoryOption[];
}) {
  const def = SECTION_BY_TYPE[section.type];
  const [open, setOpen] = useState<Set<string>>(() => new Set());
  const variantId = useId();
  const schemeId = useId();
  if (!def) return null;

  const patch = (fn: (s: SectionInstance) => SectionInstance, coalesce?: string) =>
    update((d) => updateSection(d, zone, section.id, fn), coalesce);
  const blocks = section.blocks ?? [];
  const setBlocks = (fn: (b: NonNullable<SectionInstance["blocks"]>) => NonNullable<SectionInstance["blocks"]>, coalesce?: string) =>
    patch((s) => ({ ...s, blocks: fn(s.blocks ?? []) }), coalesce);
  const toggleOpen = (id: string) => setOpen((o) => { const n = new Set(o); if (n.has(id)) n.delete(id); else n.add(id); return n; });

  return (
    <div className="space-y-5">
      <div className="flex items-start gap-2">
        <button type="button" onClick={onBack} className={iconBtn} aria-label="Volver a la lista de secciones" title="Volver">
          <Icon name="back" />
        </button>
        <div className="min-w-0 flex-1">
          <h3 className="text-base font-semibold text-neutral-900">{def.label}</h3>
          <p className="hint">{def.hint}</p>
        </div>
        <button
          type="button" className={iconBtn} aria-pressed={!section.hidden}
          aria-label={section.hidden ? "Mostrar sección" : "Ocultar sección"} title={section.hidden ? "Mostrar" : "Ocultar"}
          onClick={() => patch((s) => ({ ...s, hidden: s.hidden ? undefined : true }))}
        >
          <Icon name={section.hidden ? "eyeOff" : "eye"} />
        </button>
      </div>
      {section.hidden ? <p className="rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-700">Esta sección está oculta: no aparece en tu tienda.</p> : null}

      {def.variants.length > 1 ? (
        <div>
          <p id={variantId} className="label">Diseño</p>
          <div role="radiogroup" aria-labelledby={variantId} className="grid grid-cols-2 gap-1.5">
            {def.variants.map((v) => {
              const active = (section.variant ?? def.variants[0].key) === v.key;
              return (
                <button
                  key={v.key} type="button" role="radio" aria-checked={active}
                  onClick={() => patch((s) => ({ ...s, variant: v.key }))}
                  className={`rounded-lg border p-2 text-left transition focus:outline-none focus-visible:ring-2 focus-visible:ring-purple/40 ${
                    active ? "border-purple bg-purple-tint" : "border-neutral-200 bg-white hover:border-neutral-400"
                  }`}
                >
                  <span className={`block text-xs font-semibold ${active ? "text-purple-dark" : "text-neutral-800"}`}>{v.label}</span>
                  {v.hint ? <span className="mt-0.5 block text-[11px] leading-snug text-neutral-500">{v.hint}</span> : null}
                </button>
              );
            })}
          </div>
        </div>
      ) : null}

      <div>
        <p id={schemeId} className="label">Colores de la sección</p>
        <div role="radiogroup" aria-labelledby={schemeId} className="grid grid-cols-4 gap-1.5">
          {SCHEME_KEYS.map((k) => {
            const sc = doc.settings.schemes[k];
            const active = (section.scheme ?? "base") === k;
            return (
              <button
                key={k} type="button" role="radio" aria-checked={active}
                onClick={() => patch((s) => ({ ...s, scheme: k }))}
                className={`rounded-lg border p-1 text-center transition focus:outline-none focus-visible:ring-2 focus-visible:ring-purple/40 ${
                  active ? "border-purple ring-2 ring-purple/30" : "border-neutral-200 hover:border-neutral-400"
                }`}
              >
                <span className="flex h-9 items-center justify-center gap-1 rounded-md" style={{ background: sc.bg, color: sc.fg, border: `1px solid ${sc.border}` }} aria-hidden="true">
                  <span className="text-xs font-bold">Aa</span>
                  <span className="h-3 w-3 rounded-full" style={{ background: sc.primary }} />
                </span>
                <span className="mt-1 block text-[11px] font-semibold text-neutral-700">{SCHEME_LABEL[k]}</span>
              </button>
            );
          })}
        </div>
      </div>

      {def.settings.length > 0 ? (
        <SettingsForm
          defs={def.settings} values={section.settings} siteId={siteId} categories={categories}
          onChange={(key, v) => patch((s) => ({ ...s, settings: { ...s.settings, [key]: v } }), `${section.id}:${key}`)}
        />
      ) : null}

      {def.blocks ? (
        <div>
          <div className="mb-1.5 flex items-baseline justify-between">
            <p className="label mb-0">Elementos</p>
            <span className="text-xs text-neutral-500">{blocks.length} de {def.blocks.max}</span>
          </div>
          <ul className="space-y-1.5">
            {blocks.map((b, i) => {
              const bdef = def.blocks!.types.find((t) => t.type === b.type);
              const isOpen = open.has(b.id);
              const panelId = `blk-${b.id}`;
              return (
                <li key={b.id} className="rounded-lg border border-neutral-200 bg-white">
                  <div className="flex items-center gap-1 pr-1">
                    <button
                      type="button" onClick={() => toggleOpen(b.id)} aria-expanded={isOpen} aria-controls={panelId}
                      className="flex min-w-0 flex-1 items-center gap-2 rounded-md px-2 py-2 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-purple/40"
                    >
                      <span className={`text-neutral-400 transition ${isOpen ? "rotate-90" : ""}`}><Icon name="chevron" /></span>
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-medium text-neutral-900">{summary(b.settings) || `${bdef?.label ?? "Elemento"} ${i + 1}`}</span>
                        <span className="block text-[11px] text-neutral-500">{bdef?.label}</span>
                      </span>
                    </button>
                    <button type="button" className={iconBtn} disabled={i === 0} onClick={() => setBlocks((l) => moveItem(l, i, i - 1))} aria-label="Subir elemento" title="Subir"><Icon name="up" /></button>
                    <button type="button" className={iconBtn} disabled={i === blocks.length - 1} onClick={() => setBlocks((l) => moveItem(l, i, i + 1))} aria-label="Bajar elemento" title="Bajar"><Icon name="down" /></button>
                    <button type="button" className={`${iconBtn} hover:!bg-red-50 hover:!text-red-700`} onClick={() => setBlocks((l) => l.filter((x) => x.id !== b.id))} aria-label="Quitar elemento" title="Quitar"><Icon name="trash" /></button>
                  </div>
                  {isOpen && bdef ? (
                    <div id={panelId} className="border-t border-neutral-100 p-3">
                      <SettingsForm
                        defs={bdef.settings} values={b.settings} siteId={siteId} categories={categories}
                        onChange={(key, v) => setBlocks((l) => l.map((x) => (x.id === b.id ? { ...x, settings: { ...x.settings, [key]: v } } : x)), `${b.id}:${key}`)}
                      />
                    </div>
                  ) : null}
                </li>
              );
            })}
          </ul>
          {blocks.length < def.blocks.max ? (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {def.blocks.types.map((t) => (
                <button
                  key={t.type} type="button" className="btn-secondary min-h-9 py-1 text-xs"
                  onClick={() => { const nb = newBlock(t.type); setBlocks((l) => [...l, nb]); setOpen((o) => new Set(o).add(nb.id)); }}
                >
                  <Icon name="plus" /> Agregar {t.label.toLowerCase()}
                </button>
              ))}
            </div>
          ) : null}
        </div>
      ) : null}

      <button type="button" onClick={onBack} className="btn-secondary w-full">Listo</button>
    </div>
  );
}
