"use client";

import { useActionState, useState, useTransition } from "react";
import { Field } from "@/components/ui";
import { ImageUpload } from "@/components/admin/image-upload";
import { deleteCategory, saveCategory, type ActionState } from "../products/actions";

export type CategoryRow = {
  id: string; name: string; slug: string; description: string; parentId: string | null;
  sortOrder: number; imageUrl: string; showInHeader: boolean; depth: number; products: number;
};
type Option = { id: string; name: string; depth: number };

function slugify(raw: string) {
  return raw.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim()
    .replace(/[^a-z0-9-]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 80);
}

export function CategoriesManager({ siteId, rows, options, canManage }: {
  siteId: string; rows: CategoryRow[]; options: Option[]; canManage: boolean;
}) {
  const [editing, setEditing] = useState<string | null>(null);
  const [busy, start] = useTransition();

  return (
    <div className="space-y-4">
      {rows.length === 0 ? (
        <p className="card p-5 text-sm text-neutral-500">Aún no hay categorías. Crea la primera abajo.</p>
      ) : (
        <div className="card overflow-x-auto">
          <table className="w-full min-w-[640px] text-sm">
            <thead className="bg-neutral-50 text-left text-xs uppercase tracking-wide text-neutral-500">
              <tr>
                <th className="px-4 py-2.5" />
                <th className="px-2 py-2.5">Categoría</th>
                <th className="px-2 py-2.5">Productos</th>
                <th className="px-2 py-2.5">Orden</th>
                <th className="px-2 py-2.5">En el menú</th>
                <th className="px-4 py-2.5" />
              </tr>
            </thead>
            <tbody className="stagger divide-y divide-neutral-100">
              {rows.map((c) => (
                editing === c.id ? (
                  <tr key={c.id}>
                    <td colSpan={6} className="p-4">
                      <CategoryForm siteId={siteId} category={c} options={options.filter((o) => o.id !== c.id)} onDone={() => setEditing(null)} />
                    </td>
                  </tr>
                ) : (
                  <tr key={c.id} className="hover:bg-neutral-50/60">
                    <td className="px-4 py-2">
                      <div className="h-10 w-10 overflow-hidden rounded-md bg-neutral-100">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        {c.imageUrl ? <img src={c.imageUrl} alt="" className="h-full w-full object-cover" /> : null}
                      </div>
                    </td>
                    <td className="px-2 py-2" style={{ paddingLeft: 8 + c.depth * 20 }}>
                      <span className="font-medium text-neutral-900">{c.depth > 0 ? "↳ " : ""}{c.name}</span>
                      <div className="font-mono text-xs text-neutral-500">{c.slug}</div>
                    </td>
                    <td className="px-2 py-2 text-neutral-600">{c.products}</td>
                    <td className="px-2 py-2 text-neutral-600">{c.sortOrder}</td>
                    <td className="px-2 py-2">{c.showInHeader ? <span className="pill bg-lime-tint text-lime-dark">Sí</span> : <span className="pill bg-neutral-100 text-neutral-500">No</span>}</td>
                    <td className="px-4 py-2 text-right">
                      <div className="flex justify-end gap-1">
                        <button type="button" onClick={() => setEditing(c.id)} className="btn-secondary">Editar</button>
                        {canManage ? (
                          <button
                            type="button" disabled={busy} className="btn-danger px-2" aria-label="Eliminar"
                            onClick={() => { if (confirm(`¿Eliminar "${c.name}"? Los productos no se borran, solo dejan de estar en esta categoría.`)) start(() => deleteCategory(siteId, c.id)); }}
                          >×</button>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                )
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="card p-5">
        {editing === "new" ? (
          <CategoryForm siteId={siteId} options={options} onDone={() => setEditing(null)} />
        ) : (
          <button type="button" onClick={() => setEditing("new")} className="btn-primary">+ Nueva categoría</button>
        )}
      </div>
    </div>
  );
}

function CategoryForm({ siteId, category, options, onDone }: {
  siteId: string; category?: CategoryRow; options: Option[]; onDone: () => void;
}) {
  const [state, action, pending] = useActionState<ActionState, FormData>(async (prev, fd) => {
    const r = await saveCategory(prev, fd);
    if (r.ok) onDone();
    return r;
  }, {});
  const [name, setName] = useState(category?.name ?? "");
  const [slug, setSlug] = useState(category?.slug ?? "");
  const [touched, setTouched] = useState(Boolean(category));

  return (
    <form action={action} className="grid gap-4">
      <input type="hidden" name="siteId" value={siteId} />
      {category ? <input type="hidden" name="categoryId" value={category.id} /> : null}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Field label="Nombre">
          <input name="name" required value={name} className="input" placeholder="Ej. Tazas"
            onChange={(e) => { setName(e.target.value); if (!touched) setSlug(slugify(e.target.value)); }} />
        </Field>
        <Field label="Enlace (slug)">
          <input name="slug" value={slug} className="input font-mono" onChange={(e) => { setTouched(true); setSlug(slugify(e.target.value)); }} />
        </Field>
        <Field label="Dentro de" hint="Vacío = categoría principal.">
          <select name="parentId" defaultValue={category?.parentId ?? ""} className="input">
            <option value="">— Ninguna —</option>
            {options.map((o) => <option key={o.id} value={o.id}>{"— ".repeat(o.depth)}{o.name}</option>)}
          </select>
        </Field>
        <Field label="Orden" hint="Menor = primero.">
          <input name="sortOrder" inputMode="numeric" defaultValue={category?.sortOrder ?? 0} className="input" />
        </Field>
      </div>
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_280px]">
        <div className="space-y-4">
          <Field label="Descripción" hint="Se muestra arriba de los productos de la categoría.">
            <textarea name="description" rows={3} defaultValue={category?.description ?? ""} className="input" />
          </Field>
          <label className="flex cursor-pointer items-center gap-2 text-sm">
            <input type="checkbox" name="showInHeader" defaultChecked={category?.showInHeader ?? true} className="h-4 w-4 rounded border-neutral-300" />
            Mostrar en el menú de la tienda
          </label>
        </div>
        <ImageUpload siteId={siteId} name="imageUrl" folder="categories" defaultValue={category?.imageUrl ?? ""} label="Imagen" aspect="video" hint="Recomendado 1200×675 px." />
      </div>
      <div className="flex items-center gap-2">
        <button type="submit" disabled={pending} className="btn-primary">{pending ? "Guardando…" : category ? "Guardar" : "Crear categoría"}</button>
        <button type="button" onClick={onDone} className="btn-secondary">Cancelar</button>
        {state.error ? <span className="text-sm text-red-600">{state.error}</span> : null}
      </div>
    </form>
  );
}
