"use client";

import { useId } from "react";
import { ImageUpload } from "@/components/admin/image-upload";
import type { SettingDef } from "@/themes/types";
import type { CategoryOption } from "./editor-types";

/** Grupo de opciones como botones (radio). Para listas cortas de estilos. */
export function Choice<T extends string>({
  label, value, options, onChange, hint, columns = 3,
}: {
  label: string;
  value: T;
  options: { value: T; label: string; hint?: string }[];
  onChange: (v: T) => void;
  hint?: string;
  columns?: 2 | 3 | 4;
}) {
  const id = useId();
  const cols = columns === 2 ? "grid-cols-2" : columns === 4 ? "grid-cols-4" : "grid-cols-3";
  return (
    <div>
      <p id={id} className="label">{label}</p>
      {hint ? <p className="hint -mt-1 mb-1.5">{hint}</p> : null}
      <div role="radiogroup" aria-labelledby={id} className={`grid gap-1.5 ${cols}`}>
        {options.map((o) => {
          const active = o.value === value;
          return (
            <button
              key={o.value} type="button" role="radio" aria-checked={active} title={o.hint}
              onClick={() => onChange(o.value)}
              className={`min-h-9 rounded-lg border px-2 py-1.5 text-xs font-semibold transition focus:outline-none focus-visible:ring-2 focus-visible:ring-purple/40 ${
                active ? "border-purple bg-purple-tint text-purple-dark" : "border-neutral-200 bg-white text-neutral-700 hover:border-neutral-400"
              }`}
            >
              {o.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function Toggle({ label, checked, onChange, hint }: { label: string; checked: boolean; onChange: (v: boolean) => void; hint?: string }) {
  const id = useId();
  return (
    <div className="flex items-start justify-between gap-3">
      <div className="min-w-0">
        <span id={id} className="block text-sm font-medium text-neutral-800">{label}</span>
        {hint ? <span className="hint block">{hint}</span> : null}
      </div>
      <button
        type="button" role="switch" aria-checked={checked} aria-labelledby={id} onClick={() => onChange(!checked)}
        className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition focus:outline-none focus-visible:ring-2 focus-visible:ring-purple/40 ${checked ? "bg-purple" : "bg-neutral-300"}`}
      >
        <span className={`inline-block h-5 w-5 rounded-full bg-white shadow transition ${checked ? "translate-x-5" : "translate-x-0.5"}`} />
      </button>
    </div>
  );
}

export function ColorField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  const id = useId();
  // input[type=color] solo entiende #rrggbb.
  const hex6 = /^#[0-9a-f]{6}$/i.test(value) ? value : /^#[0-9a-f]{3}$/i.test(value)
    ? `#${value.slice(1).split("").map((c) => c + c).join("")}` : "#000000";
  return (
    <div className="flex items-center gap-2">
      <input
        id={id} type="color" value={hex6} onChange={(e) => onChange(e.target.value)}
        className="h-8 w-9 shrink-0 cursor-pointer rounded border border-neutral-300 bg-white p-0.5"
      />
      <label htmlFor={id} className="min-w-0 flex-1">
        <span className="block truncate text-xs font-medium text-neutral-800">{label}</span>
        <span className="block font-mono text-[11px] text-neutral-500">{value}</span>
      </label>
    </div>
  );
}

/** Fechas: se guardan con la zona de México (sin horario de verano desde 2022). */
const MX_OFFSET = "-06:00";
const toLocalInput = (v: string) => (v ? v.slice(0, 16) : "");
const fromLocalInput = (v: string) => (v ? `${v}:00${MX_OFFSET}` : "");

/** Un campo del formulario armado a partir de su definición (SettingDef). */
export function SettingField({
  def, value, onChange, siteId, categories,
}: {
  def: SettingDef;
  value: unknown;
  onChange: (v: unknown) => void;
  siteId: string;
  categories: CategoryOption[];
}) {
  const id = useId();
  const v = value ?? def.default;
  const str = typeof v === "string" ? v : v == null ? "" : String(v);
  const hint = def.hint ? <p className="hint mt-1">{def.hint}</p> : null;

  switch (def.type) {
    case "toggle":
      return <Toggle label={def.label} hint={def.hint} checked={v === true} onChange={onChange} />;

    case "range": {
      const n = typeof v === "number" ? v : Number(v ?? def.min);
      return (
        <div>
          <div className="flex items-baseline justify-between gap-2">
            <label htmlFor={id} className="label">{def.label}</label>
            <output htmlFor={id} className="font-mono text-xs text-neutral-600">{n}{def.unit ?? ""}</output>
          </div>
          <input
            id={id} type="range" min={def.min} max={def.max} step={def.step ?? 1} value={Number.isFinite(n) ? n : def.min}
            onChange={(e) => onChange(Number(e.target.value))} className="w-full accent-purple"
          />
          {hint}
        </div>
      );
    }

    case "select":
      return (
        <div>
          <label htmlFor={id} className="label">{def.label}</label>
          <select id={id} value={str} onChange={(e) => onChange(e.target.value)} className="input">
            {def.options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
          {hint}
        </div>
      );

    case "category":
      return (
        <div>
          <label htmlFor={id} className="label">{def.label}</label>
          <select id={id} value={str} onChange={(e) => onChange(e.target.value)} className="input">
            <option value="">{categories.length ? "Elige una categoría" : "Aún no tienes categorías"}</option>
            {categories.map((c) => <option key={c.slug} value={c.slug}>{c.name}</option>)}
          </select>
          {hint}
        </div>
      );

    case "image":
      return (
        <div className="space-y-2">
          <ImageUpload
            key={str} siteId={siteId} name={`img-${id}`} folder="theme" label={def.label} hint={def.hint}
            defaultValue={str} onChange={(url) => onChange(url)}
          />
          <div>
            <label htmlFor={id} className="sr-only">{def.label}: enlace de la imagen</label>
            <input
              id={id} type="text" inputMode="url" value={str} placeholder="…o pega el enlace de una imagen"
              onChange={(e) => onChange(e.target.value.trim())} className="input text-xs"
            />
          </div>
        </div>
      );

    case "datetime":
      return (
        <div>
          <label htmlFor={id} className="label">{def.label}</label>
          <input
            id={id} type="datetime-local" value={toLocalInput(str)}
            onChange={(e) => onChange(fromLocalInput(e.target.value))} className="input"
          />
          {hint}
        </div>
      );

    case "textarea":
    case "html":
      return (
        <div>
          <label htmlFor={id} className="label">{def.label}</label>
          <textarea
            id={id} value={str} rows={def.type === "html" ? 8 : 3}
            placeholder={"placeholder" in def ? def.placeholder : undefined}
            onChange={(e) => onChange(e.target.value)}
            spellCheck={def.type !== "html"}
            className={`input ${def.type === "html" ? "font-mono text-xs" : ""}`}
          />
          {hint}
        </div>
      );

    case "url":
    case "text":
    default:
      return (
        <div>
          <label htmlFor={id} className="label">{def.label}</label>
          <input
            id={id} type="text" inputMode={def.type === "url" ? "url" : undefined} value={str}
            placeholder={"placeholder" in def && def.placeholder ? def.placeholder : def.type === "url" ? "/productos o https://…" : undefined}
            onChange={(e) => onChange(e.target.value)} className="input"
          />
          {hint}
        </div>
      );
  }
}

/** Formulario completo de una lista de ajustes. */
export function SettingsForm({
  defs, values, onChange, siteId, categories,
}: {
  defs: SettingDef[];
  values: Record<string, unknown>;
  onChange: (key: string, v: unknown) => void;
  siteId: string;
  categories: CategoryOption[];
}) {
  return (
    <div className="space-y-4">
      {defs.map((d) => (
        <SettingField
          key={d.key} def={d} value={values[d.key]} siteId={siteId} categories={categories}
          onChange={(v) => onChange(d.key, v)}
        />
      ))}
    </div>
  );
}
