"use client";

import { useId } from "react";
import { ImageUpload } from "@/components/admin/image-upload";
import { FONTS, type FontDef } from "@/themes/fonts";
import { SCHEME_KEYS, type GlobalSettings, type Scheme, type SchemeKey, type ThemeDoc } from "@/themes/types";
import { SCHEME_LABEL, type TemplateSummary } from "./editor-types";
import { Choice, ColorField } from "./fields";
import type { Update } from "./sections-panel";

const COLOR_FIELDS: [keyof Scheme, string][] = [
  ["bg", "Fondo"], ["fg", "Texto"], ["primary", "Botones"], ["primaryFg", "Texto de botones"],
  ["accent", "Acento"], ["muted", "Fondo suave"], ["border", "Líneas"],
];

const SCHEME_HINT: Record<SchemeKey, string> = {
  base: "Los colores de casi toda la tienda.",
  alt: "Para dar un respiro entre secciones.",
  invert: "Oscuro sobre claro (o al revés) para destacar.",
  accent: "El color más llamativo, para ofertas y avisos.",
};

const KIND_LABEL: Record<FontDef["kind"], string> = {
  serif: "Con remate (clásicas)", sans: "Sin remate (modernas)", display: "Llamativas", mono: "Máquina de escribir", hand: "A mano",
};

// Solo los caracteres que se pintan en el selector, para que la hoja de fuentes pese poco.
const PREVIEW_TEXT = "Aa Bb Cc 123 Así se ven tus títulos";
const FONTS_HREF = (() => {
  const chars = [...new Set((FONTS.map((f) => f.name).join("") + PREVIEW_TEXT).split(""))].join("");
  const fams = FONTS.map((f) => `family=${f.name.replace(/ /g, "+")}`).join("&");
  return `https://fonts.googleapis.com/css2?${fams}&text=${encodeURIComponent(chars)}&display=swap`;
})();

type Opt<T extends string> = { value: T; label: string; hint?: string };

const TYPE_SCALE: Opt<GlobalSettings["typeScale"]>[] = [
  { value: "compact", label: "Compacto" }, { value: "normal", label: "Normal" }, { value: "large", label: "Grande" }, { value: "huge", label: "Enorme" },
];
const HEADING_CASE: Opt<GlobalSettings["headingCase"]>[] = [
  { value: "normal", label: "Como lo escribas" }, { value: "upper", label: "MAYÚSCULAS" },
];
const HEADING_WEIGHT: Opt<GlobalSettings["headingWeight"]>[] = [
  { value: "light", label: "Delgado" }, { value: "regular", label: "Normal" }, { value: "bold", label: "Negrita" }, { value: "black", label: "Muy grueso" },
];
const RADIUS: Opt<GlobalSettings["radius"]>[] = [
  { value: "none", label: "Rectas" }, { value: "sm", label: "Apenas" }, { value: "md", label: "Suaves" },
  { value: "lg", label: "Muy redondas" }, { value: "full", label: "Píldora" },
];
const BUTTONS: Opt<GlobalSettings["buttons"]>[] = [
  { value: "solid", label: "Rellenos" }, { value: "outline", label: "Con contorno" }, { value: "pill", label: "Píldora" },
  { value: "hard", label: "Sombra dura" }, { value: "underline", label: "Subrayados" },
];
const CARDS: Opt<GlobalSettings["cards"]>[] = [
  { value: "classic", label: "Clásica" }, { value: "overlay", label: "Sobre la foto" }, { value: "minimal", label: "Mínima" },
  { value: "bordered", label: "Con borde" }, { value: "polaroid", label: "Polaroid" }, { value: "swap", label: "Segunda foto", hint: "Muestra otra foto al pasar el cursor." },
];
const RATIO: Opt<GlobalSettings["cardRatio"]>[] = [
  { value: "square", label: "Cuadrada" }, { value: "portrait", label: "Vertical" }, { value: "landscape", label: "Horizontal" },
];
const REVEAL: Opt<GlobalSettings["motion"]["reveal"]>[] = [
  { value: "none", label: "Ninguno" }, { value: "fade", label: "Aparecer" }, { value: "rise", label: "Subir" }, { value: "mask", label: "Telón" },
  { value: "zoom", label: "Acercar" }, { value: "blur", label: "Desenfoque" }, { value: "slide", label: "Deslizar" },
];
const HOVER: Opt<GlobalSettings["motion"]["hover"]>[] = [
  { value: "none", label: "Ninguno" }, { value: "lift", label: "Elevar" }, { value: "zoom", label: "Acercar foto" },
  { value: "tilt", label: "Inclinar 3D" }, { value: "hard", label: "Sombra dura" }, { value: "glow", label: "Brillo" },
];
const INTENSITY: Opt<GlobalSettings["motion"]["intensity"]>[] = [
  { value: "soft", label: "Suave" }, { value: "normal", label: "Normal" }, { value: "bold", label: "Intensa" },
];
const WIDTH: Opt<GlobalSettings["width"]>[] = [
  { value: "narrow", label: "Angosto" }, { value: "normal", label: "Normal" }, { value: "wide", label: "Amplio" }, { value: "full", label: "Todo" },
];
const TEXTURE: Opt<GlobalSettings["texture"]>[] = [
  { value: "plain", label: "Liso" }, { value: "grain", label: "Grano" }, { value: "grid", label: "Cuadrícula" }, { value: "dots", label: "Puntos" },
];

function Group({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
  return (
    <section className="space-y-3 border-t border-neutral-200 pt-5 first:border-t-0 first:pt-0">
      <div>
        <h3 className="text-sm font-semibold text-neutral-900">{title}</h3>
        {hint ? <p className="hint">{hint}</p> : null}
      </div>
      {children}
    </section>
  );
}

function FontSelect({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  const id = useId();
  const known = FONTS.some((f) => f.name === value);
  return (
    <div>
      <label htmlFor={id} className="label">{label}</label>
      <select id={id} value={value} onChange={(e) => onChange(e.target.value)} className="input" style={{ fontFamily: `'${value}', sans-serif` }}>
        {!known ? <option value={value}>{value}</option> : null}
        {(Object.keys(KIND_LABEL) as FontDef["kind"][]).map((k) => (
          <optgroup key={k} label={KIND_LABEL[k]}>
            {FONTS.filter((f) => f.kind === k).map((f) => (
              <option key={f.name} value={f.name} style={{ fontFamily: `'${f.name}', sans-serif` }}>{f.name}</option>
            ))}
          </optgroup>
        ))}
      </select>
      <p className="mt-1.5 truncate text-lg leading-tight text-neutral-800" style={{ fontFamily: `'${value}', sans-serif` }} aria-hidden="true">
        {value} · Aa Bb 123
      </p>
    </div>
  );
}

export function ThemePanel({
  doc, update, template, siteId,
}: {
  doc: ThemeDoc;
  update: Update;
  template?: TemplateSummary;
  siteId: string;
}) {
  const st = doc.settings;
  const set = <K extends keyof GlobalSettings>(key: K, value: GlobalSettings[K], coalesce?: string) =>
    update((d) => ({ ...d, settings: { ...d.settings, [key]: value } }), coalesce);
  const setMotion = <K extends keyof GlobalSettings["motion"]>(key: K, value: GlobalSettings["motion"][K]) =>
    update((d) => ({ ...d, settings: { ...d.settings, motion: { ...d.settings.motion, [key]: value } } }));
  const setColor = (k: SchemeKey, field: keyof Scheme, v: string) =>
    update((d) => ({
      ...d,
      settings: { ...d.settings, schemes: { ...d.settings.schemes, [k]: { ...d.settings.schemes[k], [field]: v } } },
    }), `scheme:${k}:${field}`);

  function applyStyle(styleKey: string) {
    if (!template) return;
    const style = template.styles.find((s) => s.key === styleKey);
    update((d) => {
      const schemes = {} as Record<SchemeKey, Scheme>;
      for (const k of SCHEME_KEYS) schemes[k] = { ...template.schemes[k], ...(style?.schemes?.[k] ?? {}) };
      return { ...d, style: styleKey, settings: { ...d.settings, schemes, fonts: { ...template.fonts, ...(style?.fonts ?? {}) } } };
    });
  }

  return (
    <div className="space-y-5">
      {/* eslint-disable-next-line @next/next/no-page-custom-font */}
      <link rel="stylesheet" href={FONTS_HREF} />

      {template && template.styles.length > 0 ? (
        <Group title="Estilos de la plantilla" hint="Combinaciones de colores y letras listas. Puedes ajustarlas después.">
          <div className="grid grid-cols-2 gap-2">
            {template.styles.map((s) => {
              const base = { ...template.schemes.base, ...(s.schemes?.base ?? {}) };
              const display = s.fonts?.display ?? template.fonts.display;
              const active = doc.style === s.key;
              return (
                <button
                  key={s.key} type="button" onClick={() => applyStyle(s.key)} aria-pressed={active}
                  className={`rounded-lg border p-1.5 text-left transition focus:outline-none focus-visible:ring-2 focus-visible:ring-purple/40 ${
                    active ? "border-purple ring-2 ring-purple/30" : "border-neutral-200 hover:border-neutral-400"
                  }`}
                >
                  <span className="flex h-12 items-end justify-between rounded-md p-2" style={{ background: base.bg, color: base.fg }} aria-hidden="true">
                    <span className="text-base leading-none" style={{ fontFamily: `'${display}', serif` }}>Aa</span>
                    <span className="flex gap-1">
                      <span className="h-3 w-3 rounded-full" style={{ background: base.primary }} />
                      <span className="h-3 w-3 rounded-full" style={{ background: base.accent }} />
                    </span>
                  </span>
                  <span className="mt-1 block text-xs font-semibold text-neutral-800">{s.name}</span>
                </button>
              );
            })}
          </div>
        </Group>
      ) : null}

      <Group title="Colores" hint="Cada sección usa uno de estos cuatro juegos de colores.">
        <div className="space-y-3">
          {SCHEME_KEYS.map((k) => {
            const sc = st.schemes[k];
            return (
              <details key={k} className="group rounded-lg border border-neutral-200 bg-white" open={k === "base"}>
                <summary className="flex cursor-pointer list-none items-center gap-3 rounded-lg p-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-purple/40">
                  <span className="flex h-10 w-16 shrink-0 items-center justify-center gap-1 rounded-md" style={{ background: sc.bg, color: sc.fg, border: `1px solid ${sc.border}` }} aria-hidden="true">
                    <span className="text-sm font-bold">Aa</span>
                    <span className="rounded px-1 text-[9px] font-bold" style={{ background: sc.primary, color: sc.primaryFg }}>OK</span>
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-semibold text-neutral-900">{SCHEME_LABEL[k]}</span>
                    <span className="block truncate text-xs text-neutral-500">{SCHEME_HINT[k]}</span>
                  </span>
                  <span className="text-xs text-neutral-400 transition group-open:rotate-90" aria-hidden="true">›</span>
                </summary>
                <div className="grid grid-cols-2 gap-x-3 gap-y-2.5 border-t border-neutral-100 p-3">
                  {COLOR_FIELDS.map(([f, label]) => (
                    <ColorField key={f} label={label} value={sc[f]} onChange={(v) => setColor(k, f, v)} />
                  ))}
                </div>
              </details>
            );
          })}
        </div>
      </Group>

      <Group title="Letras">
        <FontSelect label="Títulos" value={st.fonts.display} onChange={(v) => set("fonts", { ...st.fonts, display: v })} />
        <FontSelect label="Textos" value={st.fonts.body} onChange={(v) => set("fonts", { ...st.fonts, body: v })} />
        <Choice label="Tamaño de letra" value={st.typeScale} options={TYPE_SCALE} onChange={(v) => set("typeScale", v)} columns={4} />
        <Choice label="Títulos en" value={st.headingCase} options={HEADING_CASE} onChange={(v) => set("headingCase", v)} columns={2} />
        <Choice label="Grosor de los títulos" value={st.headingWeight} options={HEADING_WEIGHT} onChange={(v) => set("headingWeight", v)} columns={4} />
      </Group>

      <Group title="Forma">
        <Choice label="Esquinas" value={st.radius} options={RADIUS} onChange={(v) => set("radius", v)} />
        <Choice label="Botones" value={st.buttons} options={BUTTONS} onChange={(v) => set("buttons", v)} />
        <Choice label="Tarjetas de producto" value={st.cards} options={CARDS} onChange={(v) => set("cards", v)} />
        <Choice label="Forma de las fotos" value={st.cardRatio} options={RATIO} onChange={(v) => set("cardRatio", v)} />
        <Choice label="Ancho de la página" value={st.width} options={WIDTH} onChange={(v) => set("width", v)} columns={4} />
        <Choice label="Textura del fondo" value={st.texture} options={TEXTURE} onChange={(v) => set("texture", v)} columns={4} />
      </Group>

      <Group title="Movimiento" hint="Cómo se animan las secciones y las tarjetas.">
        <Choice label="Al bajar por la página" value={st.motion.reveal} options={REVEAL} onChange={(v) => setMotion("reveal", v)} columns={4} />
        <Choice label="Al pasar el cursor" value={st.motion.hover} options={HOVER} onChange={(v) => setMotion("hover", v)} />
        <Choice label="Intensidad" value={st.motion.intensity} options={INTENSITY} onChange={(v) => setMotion("intensity", v)} />
      </Group>

      <Group title="Logo" hint="Se ve en el encabezado. Si no subes uno, se usa el nombre de la tienda.">
        <ImageUpload
          key={st.logoUrl ?? ""} siteId={siteId} name="logoUrl" folder="theme" label="" aspect="wide"
          defaultValue={st.logoUrl ?? ""} onChange={(url) => set("logoUrl", url || undefined)}
        />
      </Group>
    </div>
  );
}
