"use client";

import { useActionState, useState, useTransition } from "react";
import { Field } from "@/components/ui";
import { ImageUpload } from "@/components/admin/image-upload";
import { deleteSection, moveSection, saveSection, seedDefaultSections, toggleSection, type ActionState } from "./actions";
import { SECTION_HINT, SECTION_LABEL, SECTION_TYPES, type SectionType } from "./section-types";

export type SectionRow = { id: string; type: SectionType; title: string; config: Record<string, unknown>; active: boolean };
type Cat = { slug: string; name: string };

export function SectionsManager({ siteId, sections, categories }: { siteId: string; sections: SectionRow[]; categories: Cat[] }) {
  const [editing, setEditing] = useState<string | null>(null);
  const [busy, start] = useTransition();

  return (
    <section className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-sm font-semibold text-neutral-900">Secciones de la portada</h3>
        {sections.length === 0 ? (
          <button type="button" disabled={busy} onClick={() => start(() => seedDefaultSections(siteId))} className="btn-secondary">
            {busy ? "Creando…" : "Usar portada sugerida"}
          </button>
        ) : null}
      </div>

      {sections.length === 0 ? (
        <p className="card p-5 text-sm text-neutral-500">
          Sin secciones, la tienda muestra una portada básica (texto, destacados y categorías). Agrega secciones para armarla a tu gusto.
        </p>
      ) : (
        <ol className="stagger space-y-2">
          {sections.map((s, i) => (
            <li key={s.id} className={`card p-4 ${s.active ? "" : "opacity-60"}`}>
              {editing === s.id ? (
                <SectionForm siteId={siteId} section={s} categories={categories} onDone={() => setEditing(null)} />
              ) : (
                <div className="flex flex-wrap items-center gap-3">
                  <span className="font-display text-2xl leading-none text-neutral-400">{i + 1}</span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-neutral-900">
                      {SECTION_LABEL[s.type]}
                      {s.title ? <span className="ml-2 font-normal text-neutral-500">“{s.title}”</span> : null}
                      {!s.active ? <span className="ml-2 pill bg-neutral-100 text-neutral-500">Oculta</span> : null}
                    </p>
                    <p className="hint">{SECTION_HINT[s.type]}</p>
                  </div>
                  <div className="flex items-center gap-1">
                    <button type="button" disabled={i === 0 || busy} aria-label="Subir" onClick={() => start(() => moveSection(siteId, s.id, -1))} className="btn-secondary px-2 disabled:opacity-30">↑</button>
                    <button type="button" disabled={i === sections.length - 1 || busy} aria-label="Bajar" onClick={() => start(() => moveSection(siteId, s.id, 1))} className="btn-secondary px-2 disabled:opacity-30">↓</button>
                    <button type="button" disabled={busy} onClick={() => start(() => toggleSection(siteId, s.id, !s.active))} className="btn-secondary">{s.active ? "Ocultar" : "Mostrar"}</button>
                    <button type="button" onClick={() => setEditing(s.id)} className="btn-secondary">Editar</button>
                    <button type="button" disabled={busy} aria-label="Quitar" onClick={() => { if (confirm("¿Quitar esta sección de la portada?")) start(() => deleteSection(siteId, s.id)); }} className="btn-danger px-2">×</button>
                  </div>
                </div>
              )}
            </li>
          ))}
        </ol>
      )}

      <div className="card p-4">
        {editing === "new" ? (
          <SectionForm siteId={siteId} categories={categories} onDone={() => setEditing(null)} />
        ) : (
          <button type="button" onClick={() => setEditing("new")} className="btn-primary">+ Agregar sección</button>
        )}
      </div>
    </section>
  );
}

function SectionForm({ siteId, section, categories, onDone }: { siteId: string; section?: SectionRow; categories: Cat[]; onDone: () => void }) {
  const [state, action, pending] = useActionState<ActionState, FormData>(async (prev, fd) => {
    const r = await saveSection(prev, fd);
    if (r.ok) onDone();
    return r;
  }, {});
  const [type, setType] = useState<SectionType>(section?.type ?? "featured_products");
  const c = section?.config ?? {};
  const s = (k: string) => String(c[k] ?? "");

  return (
    <form action={action} className="grid gap-4">
      <input type="hidden" name="siteId" value={siteId} />
      {section ? <input type="hidden" name="sectionId" value={section.id} /> : null}
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Tipo de sección" hint={SECTION_HINT[type]}>
          <select name="type" value={type} onChange={(e) => setType(e.target.value as SectionType)} className="input">
            {SECTION_TYPES.map((t) => <option key={t} value={t}>{SECTION_LABEL[t]}</option>)}
          </select>
        </Field>
        <Field label="Título visible" hint="Opcional. Encabeza la sección en la tienda.">
          <input name="title" defaultValue={section?.title ?? ""} className="input" placeholder="Ej. Lo más vendido" />
        </Field>
      </div>

      {type === "hero_banners" ? (
        <div className="grid gap-4 rounded-lg border border-neutral-200 bg-neutral-50/60 p-4">
          <p className="hint">Si hay banners con posición “Principal”, se muestran en carrusel. Si no, se usa este texto e imagen.</p>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Título"><input name="heroTitle" defaultValue={s("title")} className="input" placeholder="Ej. Regalos que se recuerdan" /></Field>
            <Field label="Tiempo entre banners (ms)" hint="6000 = 6 segundos. 0 desactiva el cambio automático."><input name="autoplayMs" inputMode="numeric" defaultValue={Number(c.autoplayMs) || 6000} className="input" /></Field>
          </div>
          <Field label="Texto"><textarea name="heroSubtitle" rows={2} defaultValue={s("subtitle")} className="input" /></Field>
          <ImageUpload siteId={siteId} name="heroImageUrl" folder="home" defaultValue={s("imageUrl")} label="Imagen (opcional)" hint="Recomendado 1200×900 px." />
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Botón principal · texto"><input name="primaryLabel" defaultValue={s("primaryLabel")} className="input" placeholder="Ver productos" /></Field>
            <Field label="Botón principal · destino"><input name="primaryHref" defaultValue={s("primaryHref")} className="input font-mono" placeholder="/productos" /></Field>
            <Field label="Botón secundario · texto"><input name="secondaryLabel" defaultValue={s("secondaryLabel")} className="input" placeholder="Escríbenos" /></Field>
            <Field label="Botón secundario · destino"><input name="secondaryHref" defaultValue={s("secondaryHref")} className="input font-mono" placeholder="/contacto" /></Field>
          </div>
        </div>
      ) : null}

      {type === "featured_products" || type === "carousel" ? (
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Cuántos productos"><input name="limit" inputMode="numeric" defaultValue={Number(c.limit) || (type === "carousel" ? 12 : 8)} className="input" /></Field>
          <Field label="Cuáles">
            <select name="source" defaultValue={s("source") || (type === "carousel" ? "newest" : "featured")} className="input">
              <option value="featured">Los destacados</option>
              <option value="newest">Los más nuevos</option>
            </select>
          </Field>
          {type === "carousel" ? (
            <Field label="Solo de una categoría" hint="Opcional.">
              <select name="categorySlug" defaultValue={s("categorySlug")} className="input">
                <option value="">— Todas —</option>
                {categories.map((cat) => <option key={cat.slug} value={cat.slug}>{cat.name}</option>)}
              </select>
            </Field>
          ) : null}
        </div>
      ) : null}

      {type === "category_grid" ? (
        <Field label="Cuántas categorías"><input name="limit" inputMode="numeric" defaultValue={Number(c.limit) || 6} className="input sm:w-40" /></Field>
      ) : null}

      {type === "cta_band" ? (
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Título"><input name="ctaTitle" defaultValue={s("title")} className="input" placeholder="¿Tienes un proyecto especial?" /></Field>
          <Field label="Texto"><input name="ctaSubtitle" defaultValue={s("subtitle")} className="input" /></Field>
          <Field label="Botón · texto"><input name="buttonLabel" defaultValue={s("buttonLabel")} className="input" placeholder="Cotizar" /></Field>
          <Field label="Botón · destino" hint="Ruta interna (/contacto) o enlace externo."><input name="buttonHref" defaultValue={s("buttonHref")} className="input font-mono" placeholder="/contacto" /></Field>
        </div>
      ) : null}

      {type === "custom_html" ? (
        <Field label="HTML" hint="Se inserta tal cual en la portada. Nada de scripts.">
          <textarea name="html" rows={8} defaultValue={s("html")} className="input font-mono text-xs" />
        </Field>
      ) : null}

      {type === "banner_strip" ? (
        <p className="hint">Muestra los banners con posición “Banda”. Agrégalos abajo, en Banners.</p>
      ) : null}

      <div className="flex items-center gap-2">
        <button type="submit" disabled={pending} className="btn-primary">{pending ? "Guardando…" : section ? "Guardar" : "Agregar"}</button>
        <button type="button" onClick={onDone} className="btn-secondary">Cancelar</button>
        {state.error ? <span className="text-sm text-red-600">{state.error}</span> : null}
      </div>
    </form>
  );
}
