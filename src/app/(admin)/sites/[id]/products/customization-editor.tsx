"use client";

import { useActionState, useState, useTransition } from "react";
import { Field } from "@/components/ui";
import { deleteCustomizationField, moveCustomizationField, saveCustomizationField, type ActionState } from "./actions";

export type FieldRow = {
  id: string;
  type: "text" | "textarea" | "number" | "dropdown" | "file";
  name: string;
  label: string;
  required: boolean;
  options: { value: string; label: string; priceDeltaCents?: number }[] | null;
  variantIds: string[] | null;
};

const TYPE_LABEL: Record<FieldRow["type"], string> = {
  text: "Texto corto", textarea: "Texto largo", number: "Número", dropdown: "Lista de opciones", file: "Archivo",
};

function optionsToText(options: FieldRow["options"]) {
  return (options ?? []).map((o) => (o.priceDeltaCents ? `${o.label} | ${(o.priceDeltaCents / 100).toFixed(2)}` : o.label)).join("\n");
}

/**
 * Campos que el cliente llena al comprar (módulo "Personalización de producto").
 * Se muestra solo cuando el módulo está activo en el sitio.
 */
export function CustomizationEditor({ siteId, productId, fields, variants }: {
  siteId: string; productId: string; fields: FieldRow[]; variants: { id: string; name: string }[];
}) {
  const [editing, setEditing] = useState<string | null>(null);
  const [busy, start] = useTransition();

  return (
    <section className="card p-5">
      <h3 className="mb-1 text-sm font-semibold text-neutral-900">Personalización</h3>
      <p className="hint mb-4">
        Lo que el cliente escribe o sube al comprar: un nombre para grabar, una medida, su foto. Se guarda con el pedido.
      </p>

      {fields.length > 0 ? (
        <ul className="mb-4 divide-y divide-neutral-100 rounded-lg border border-neutral-200">
          {fields.map((f, i) => (
            <li key={f.id} className="p-3">
              {editing === f.id ? (
                <FieldForm siteId={siteId} productId={productId} field={f} variants={variants} onDone={() => setEditing(null)} />
              ) : (
                <div className="flex flex-wrap items-center gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-neutral-900">
                      {f.label} {f.required ? <span className="text-red-600">*</span> : null}
                      <span className="ml-2 pill bg-neutral-100 text-neutral-600">{TYPE_LABEL[f.type]}</span>
                    </p>
                    <p className="hint font-mono">
                      {f.name}
                      {f.type === "dropdown" && f.options ? ` · ${f.options.length} opciones` : ""}
                      {f.variantIds?.length ? ` · solo ${f.variantIds.length} variante(s)` : ""}
                    </p>
                  </div>
                  <div className="flex items-center gap-1">
                    <button type="button" disabled={i === 0 || busy} aria-label="Subir" onClick={() => start(() => moveCustomizationField(siteId, productId, f.id, -1))} className="btn-secondary px-2 disabled:opacity-30">↑</button>
                    <button type="button" disabled={i === fields.length - 1 || busy} aria-label="Bajar" onClick={() => start(() => moveCustomizationField(siteId, productId, f.id, 1))} className="btn-secondary px-2 disabled:opacity-30">↓</button>
                    <button type="button" onClick={() => setEditing(f.id)} className="btn-secondary">Editar</button>
                    <button type="button" disabled={busy} aria-label="Quitar" onClick={() => { if (confirm(`¿Quitar el campo "${f.label}"?`)) start(() => deleteCustomizationField(siteId, productId, f.id)); }} className="btn-danger px-2">×</button>
                  </div>
                </div>
              )}
            </li>
          ))}
        </ul>
      ) : null}

      {editing === "new" ? (
        <FieldForm siteId={siteId} productId={productId} variants={variants} onDone={() => setEditing(null)} />
      ) : (
        <button type="button" onClick={() => setEditing("new")} className="btn-secondary">+ Agregar campo</button>
      )}
    </section>
  );
}

function FieldForm({ siteId, productId, field, variants, onDone }: {
  siteId: string; productId: string; field?: FieldRow; variants: { id: string; name: string }[]; onDone: () => void;
}) {
  const [state, action, pending] = useActionState<ActionState, FormData>(async (prev, fd) => {
    const r = await saveCustomizationField(prev, fd);
    if (r.ok) onDone();
    return r;
  }, {});
  const [type, setType] = useState<FieldRow["type"]>(field?.type ?? "text");

  return (
    <form action={action} className="grid gap-3 rounded-lg border border-dashed border-neutral-300 bg-neutral-50/50 p-3">
      <input type="hidden" name="siteId" value={siteId} />
      <input type="hidden" name="productId" value={productId} />
      {field ? <input type="hidden" name="fieldId" value={field.id} /> : null}

      <div className="grid gap-3 sm:grid-cols-3">
        <Field label="Tipo">
          <select name="type" value={type} onChange={(e) => setType(e.target.value as FieldRow["type"])} className="input">
            {(Object.keys(TYPE_LABEL) as FieldRow["type"][]).map((t) => <option key={t} value={t}>{TYPE_LABEL[t]}</option>)}
          </select>
        </Field>
        <Field label="Etiqueta" hint="Lo que ve el cliente.">
          <input name="label" required defaultValue={field?.label ?? ""} placeholder="Ej. Nombre a grabar" className="input" />
        </Field>
        <Field label="Clave interna" hint="Vacío = se genera de la etiqueta.">
          <input name="name" defaultValue={field?.name ?? ""} placeholder="nombre_grabar" className="input font-mono" />
        </Field>
      </div>

      {type === "dropdown" ? (
        <Field label="Opciones" hint='Una por línea. Para cobrar extra: "Dorado | 50" (suma $50 MXN).'>
          <textarea name="options" rows={4} defaultValue={optionsToText(field?.options ?? null)} className="input font-mono" placeholder={"Plateado\nDorado | 50"} />
        </Field>
      ) : null}

      <div className="flex flex-wrap items-center gap-4">
        <label className="flex cursor-pointer items-center gap-2 text-sm">
          <input type="checkbox" name="required" defaultChecked={field?.required ?? false} className="h-4 w-4 rounded border-neutral-300" />
          Obligatorio
        </label>
        {variants.length > 0 ? (
          <details className="text-sm">
            <summary className="cursor-pointer text-neutral-600">Solo para ciertas opciones del producto</summary>
            <div className="mt-2 flex flex-wrap gap-3">
              {variants.map((v) => (
                <label key={v.id} className="flex items-center gap-1.5">
                  <input type="checkbox" name="variantIds" value={v.id} defaultChecked={field?.variantIds?.includes(v.id) ?? false} className="h-4 w-4 rounded border-neutral-300" />
                  {v.name}
                </label>
              ))}
            </div>
            <p className="hint mt-1">Sin marcar ninguna, el campo aplica a todas.</p>
          </details>
        ) : null}
      </div>

      <div className="flex items-center gap-2">
        <button type="submit" disabled={pending} className="btn-primary">{pending ? "Guardando…" : field ? "Guardar campo" : "Agregar campo"}</button>
        <button type="button" onClick={onDone} className="btn-secondary">Cancelar</button>
        {state.error ? <span className="text-sm text-red-600">{state.error}</span> : null}
      </div>
    </form>
  );
}
