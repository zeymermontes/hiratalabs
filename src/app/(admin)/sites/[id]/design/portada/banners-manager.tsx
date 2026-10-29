"use client";

import { useActionState, useState, useTransition } from "react";
import { Field } from "@/components/ui";
import { ImageUpload } from "@/components/admin/image-upload";
import { deleteBanner, saveBanner, toggleBanner, type ActionState } from "./actions";

export type BannerRow = {
  id: string; title: string; subtitle: string; imageUrl: string; mobileImageUrl: string; linkUrl: string; ctaLabel: string;
  position: "hero" | "strip" | "category"; sortOrder: number; active: boolean; startsAt: string; endsAt: string;
  scheduled: boolean; expired: boolean;
};

const POSITION_LABEL: Record<BannerRow["position"], string> = {
  hero: "Principal (hero)", strip: "Banda", category: "Categoría",
};

export function BannersManager({ siteId, banners }: { siteId: string; banners: BannerRow[] }) {
  const [editing, setEditing] = useState<string | null>(null);
  const [busy, start] = useTransition();

  return (
    <section className="space-y-3">
      <div>
        <h3 className="text-sm font-semibold text-neutral-900">Banners</h3>
        <p className="hint">Imágenes grandes con texto y enlace. “Principal” va en el carrusel de arriba; “Banda” en la sección de banda. Puedes programarlos por fechas.</p>
      </div>

      {banners.length > 0 ? (
        <div className="stagger grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {banners.map((b) => (
            editing === b.id ? (
              <div key={b.id} className="card p-4 sm:col-span-2 lg:col-span-3">
                <BannerForm siteId={siteId} banner={b} onDone={() => setEditing(null)} />
              </div>
            ) : (
              <article key={b.id} className={`card overflow-hidden ${b.active && !b.expired ? "" : "opacity-60"}`}>
                <div className="aspect-[16/7] bg-neutral-100">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={b.imageUrl} alt="" className="h-full w-full object-cover" />
                </div>
                <div className="space-y-2 p-3">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="pill bg-purple-tint text-purple-dark">{POSITION_LABEL[b.position]}</span>
                    {!b.active ? <span className="pill bg-neutral-100 text-neutral-500">Apagado</span> : null}
                    {b.scheduled ? <span className="pill bg-amber-50 text-amber-700">Programado</span> : null}
                    {b.expired ? <span className="pill bg-red-50 text-red-700">Vencido</span> : null}
                  </div>
                  <p className="truncate text-sm font-medium text-neutral-900">{b.title}</p>
                  {b.subtitle ? <p className="truncate hint">{b.subtitle}</p> : null}
                  <div className="flex flex-wrap gap-1 pt-1">
                    <button type="button" onClick={() => setEditing(b.id)} className="btn-secondary">Editar</button>
                    <button type="button" disabled={busy} onClick={() => start(() => toggleBanner(siteId, b.id, !b.active))} className="btn-secondary">{b.active ? "Apagar" : "Encender"}</button>
                    <button type="button" disabled={busy} aria-label="Eliminar" onClick={() => { if (confirm(`¿Eliminar el banner "${b.title}"?`)) start(() => deleteBanner(siteId, b.id)); }} className="btn-danger px-2">×</button>
                  </div>
                </div>
              </article>
            )
          ))}
        </div>
      ) : null}

      <div className="card p-4">
        {editing === "new" ? (
          <BannerForm siteId={siteId} onDone={() => setEditing(null)} />
        ) : (
          <button type="button" onClick={() => setEditing("new")} className="btn-primary">+ Nuevo banner</button>
        )}
      </div>
    </section>
  );
}

function BannerForm({ siteId, banner, onDone }: { siteId: string; banner?: BannerRow; onDone: () => void }) {
  const [state, action, pending] = useActionState<ActionState, FormData>(async (prev, fd) => {
    const r = await saveBanner(prev, fd);
    if (r.ok) onDone();
    return r;
  }, {});

  return (
    <form action={action} className="grid gap-4">
      <input type="hidden" name="siteId" value={siteId} />
      {banner ? <input type="hidden" name="bannerId" value={banner.id} /> : null}

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <ImageUpload siteId={siteId} name="imageUrl" folder="banners" defaultValue={banner?.imageUrl ?? ""} label="Imagen" aspect="wide" hint="Recomendado 1920×720 px (JPG o WEBP)." />
        <ImageUpload siteId={siteId} name="mobileImageUrl" folder="banners" defaultValue={banner?.mobileImageUrl ?? ""} label="Imagen para celular (opcional)" aspect="square" hint="Recomendado 1080×1080 px. Si no la subes, se usa la grande." />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Field label="Título"><input name="title" required defaultValue={banner?.title ?? ""} className="input" placeholder="Ej. Envío gratis en octubre" /></Field>
        <Field label="Subtítulo"><input name="subtitle" defaultValue={banner?.subtitle ?? ""} className="input" /></Field>
        <Field label="Posición">
          <select name="position" defaultValue={banner?.position ?? "hero"} className="input">
            <option value="hero">Principal (hero)</option>
            <option value="strip">Banda</option>
            <option value="category">Categoría</option>
          </select>
        </Field>
        <Field label="Enlace" hint="A dónde lleva al tocarlo. Ruta interna o URL."><input name="linkUrl" defaultValue={banner?.linkUrl ?? ""} className="input font-mono" placeholder="/productos" /></Field>
        <Field label="Texto del botón" hint="Opcional. Sin texto, todo el banner es el enlace."><input name="ctaLabel" defaultValue={banner?.ctaLabel ?? ""} className="input" placeholder="Ver más" /></Field>
        <Field label="Orden" hint="Menor = primero."><input name="sortOrder" inputMode="numeric" defaultValue={banner?.sortOrder ?? 0} className="input" /></Field>
        <Field label="Desde" hint="Opcional. Se muestra a partir de esta fecha."><input type="datetime-local" name="startsAt" defaultValue={banner?.startsAt ?? ""} className="input" /></Field>
        <Field label="Hasta" hint="Opcional. Se oculta después de esta fecha."><input type="datetime-local" name="endsAt" defaultValue={banner?.endsAt ?? ""} className="input" /></Field>
        <label className="flex cursor-pointer items-center gap-2 self-end pb-2 text-sm">
          <input type="checkbox" name="active" defaultChecked={banner?.active ?? true} className="h-4 w-4 rounded border-neutral-300" />
          Encendido
        </label>
      </div>

      <div className="flex items-center gap-2">
        <button type="submit" disabled={pending} className="btn-primary">{pending ? "Guardando…" : banner ? "Guardar" : "Crear banner"}</button>
        <button type="button" onClick={onDone} className="btn-secondary">Cancelar</button>
        {state.error ? <span className="text-sm text-red-600">{state.error}</span> : null}
      </div>
    </form>
  );
}
