"use client";

import { useActionState, useState, useTransition } from "react";
import { Field } from "@/components/ui";
import { MultiImageUpload } from "@/components/admin/image-upload";
import { deleteProduct, saveProduct, type ActionState } from "./actions";

export type ProductFormValues = {
  id?: string;
  name: string;
  slug: string;
  description: string;
  priceCents: number;
  compareAtCents: number | null;
  status: "draft" | "active" | "archived";
  stock: number | null;
  sku: string;
  featured: boolean;
  isCustomizable: boolean;
  requiresFile: boolean;
  images: string[];
  categoryIds: string[];
};

export type CategoryOption = { id: string; name: string; depth: number };

function slugify(raw: string) {
  return raw
    .normalize("NFD").replace(/[̀-ͯ]/g, "")
    .toLowerCase().trim()
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

const toMXN = (cents: number | null) => (cents === null ? "" : (cents / 100).toFixed(2));

export function ProductForm({
  siteId, values, categories, canManage, storeHost, customizationEnabled,
}: {
  siteId: string;
  values: ProductFormValues;
  categories: CategoryOption[];
  canManage: boolean;
  storeHost: string;
  customizationEnabled: boolean;
}) {
  const [state, action, pending] = useActionState<ActionState, FormData>(saveProduct, {});
  const [deleting, startDelete] = useTransition();
  const [name, setName] = useState(values.name);
  const [slug, setSlug] = useState(values.slug);
  const [slugTouched, setSlugTouched] = useState(Boolean(values.id));
  const isNew = !values.id;

  return (
    <form action={action} className="space-y-5">
      <input type="hidden" name="siteId" value={siteId} />
      {values.id ? <input type="hidden" name="productId" value={values.id} /> : null}

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
        {/* Columna principal */}
        <div className="space-y-5">
          <section className="card space-y-4 p-5">
            <Field label="Nombre">
              <input
                name="name" required className="input" value={name} placeholder="Ej. Taza personalizada 11 oz"
                onChange={(e) => { setName(e.target.value); if (!slugTouched) setSlug(slugify(e.target.value)); }}
              />
            </Field>
            <Field label="Enlace (slug)" hint={`Quedará en ${storeHost}/productos/${slug || "…"}`}>
              <input
                name="slug" className="input font-mono" value={slug}
                onChange={(e) => { setSlugTouched(true); setSlug(slugify(e.target.value)); }}
              />
            </Field>
            <Field label="Descripción" hint="Se muestra tal cual, con tus saltos de línea.">
              <textarea name="description" rows={6} defaultValue={values.description} className="input" placeholder="Qué es, de qué está hecho, medidas, tiempos de entrega…" />
            </Field>
          </section>

          <section className="card space-y-3 p-5">
            <MultiImageUpload
              siteId={siteId} name="images" folder="products" defaultValue={values.images}
              label="Fotos" hint="Recomendado: cuadradas o 4:5, mínimo 1000 px. La primera es la portada."
            />
          </section>

          <section className="card p-5">
            <h3 className="mb-1 text-sm font-semibold text-neutral-900">Precio e inventario</h3>
            <p className="hint mb-4">En pesos mexicanos. Si pones un precio anterior mayor, se muestra tachado como oferta.</p>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <Field label="Precio (MXN)">
                <input name="price" inputMode="decimal" required defaultValue={toMXN(values.priceCents)} placeholder="0.00" className="input" />
              </Field>
              <Field label="Precio anterior" hint="Opcional, para ofertas.">
                <input name="compareAt" inputMode="decimal" defaultValue={toMXN(values.compareAtCents)} placeholder="—" className="input" />
              </Field>
              <Field label="Inventario" hint="Vacío = no se controla.">
                <input name="stock" inputMode="numeric" defaultValue={values.stock ?? ""} placeholder="∞" className="input" />
              </Field>
              <Field label="SKU" hint="Tu clave interna.">
                <input name="sku" defaultValue={values.sku} className="input font-mono" />
              </Field>
            </div>
          </section>
        </div>

        {/* Columna lateral */}
        <div className="space-y-5">
          <section className="card space-y-4 p-5">
            <Field label="Estado">
              <select name="status" defaultValue={values.status} className="input">
                <option value="draft">Borrador · solo lo ves tú</option>
                <option value="active">Publicado · visible en la tienda</option>
                <option value="archived">Archivado · oculto, se conserva</option>
              </select>
            </Field>
            <label className="flex cursor-pointer items-start gap-3">
              <input type="checkbox" name="featured" defaultChecked={values.featured} className="mt-0.5 h-4 w-4 rounded border-neutral-300" />
              <span>
                <span className="text-sm font-medium text-neutral-900">Destacado</span>
                <span className="hint block">Aparece en la sección de destacados de la portada.</span>
              </span>
            </label>
            {customizationEnabled ? (
              <>
                <label className="flex cursor-pointer items-start gap-3">
                  <input type="checkbox" name="isCustomizable" defaultChecked={values.isCustomizable} className="mt-0.5 h-4 w-4 rounded border-neutral-300" />
                  <span>
                    <span className="text-sm font-medium text-neutral-900">Personalizable</span>
                    <span className="hint block">El cliente llena campos al comprar (se configuran abajo).</span>
                  </span>
                </label>
                <label className="flex cursor-pointer items-start gap-3">
                  <input type="checkbox" name="requiresFile" defaultChecked={values.requiresFile} className="mt-0.5 h-4 w-4 rounded border-neutral-300" />
                  <span>
                    <span className="text-sm font-medium text-neutral-900">Pide un archivo</span>
                    <span className="hint block">El cliente debe subir su diseño o foto.</span>
                  </span>
                </label>
              </>
            ) : null}
          </section>

          <section className="card p-5">
            <h3 className="mb-1 text-sm font-semibold text-neutral-900">Categorías</h3>
            {categories.length === 0 ? (
              <p className="hint">Aún no hay categorías. Créalas desde el botón “Categorías”.</p>
            ) : (
              <div className="mt-2 max-h-64 space-y-1 overflow-y-auto">
                {categories.map((c) => (
                  <label key={c.id} className="flex cursor-pointer items-center gap-2 rounded-md px-1 py-1 text-sm hover:bg-neutral-50" style={{ paddingLeft: 4 + c.depth * 16 }}>
                    <input type="checkbox" name="categoryIds" value={c.id} defaultChecked={values.categoryIds.includes(c.id)} className="h-4 w-4 rounded border-neutral-300" />
                    {c.name}
                  </label>
                ))}
              </div>
            )}
          </section>

          <div className="card space-y-3 p-5">
            <button type="submit" disabled={pending} className="btn-primary w-full">
              {pending ? "Guardando…" : isNew ? "Crear producto" : "Guardar cambios"}
            </button>
            {state.error ? <p className="text-sm text-red-600">{state.error}</p> : null}
            {state.ok ? <p className="text-sm text-emerald-700">{state.message}</p> : null}
            {!isNew && canManage ? (
              <button
                type="button" disabled={deleting} className="btn-danger w-full"
                onClick={() => {
                  if (confirm(`¿Eliminar "${values.name}"? También se borran sus opciones y campos. No se puede deshacer.`)) {
                    startDelete(() => { void deleteProduct(siteId, values.id!); });
                  }
                }}
              >
                {deleting ? "Eliminando…" : "Eliminar producto"}
              </button>
            ) : null}
          </div>
        </div>
      </div>
    </form>
  );
}
