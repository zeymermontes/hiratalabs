"use client";

import { useActionState, useTransition } from "react";
import { deleteSite, updateSiteMeta, type ActionState } from "../../actions";
import { Field } from "@/components/ui";

export function MetaForm({
  site, rootDomain,
}: {
  site: { id: string; name: string; slug: string; maintenanceTitle: string | null; maintenanceMessage: string | null; notes: string | null };
  rootDomain: string;
}) {
  const [state, action, pending] = useActionState<ActionState, FormData>(updateSiteMeta, {});
  const [deleting, startDelete] = useTransition();

  return (
    <div className="space-y-4">
      <form action={action} className="card space-y-4 p-5">
        <input type="hidden" name="siteId" value={site.id} />

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Nombre">
            <input name="name" defaultValue={site.name} required className="input" />
          </Field>
          <Field label="Subdominio" hint={`Quedará en <slug>.${rootDomain}. Con "www" responde en ${rootDomain}.`}>
            <input name="slug" defaultValue={site.slug} required className="input" />
          </Field>
        </div>

        <div className="border-t border-neutral-200 pt-4">
          <p className="mb-3 text-xs font-medium uppercase tracking-wide text-neutral-500">
            Aviso de mantenimiento / bloqueo
          </p>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Título" hint="Vacío = texto por defecto.">
              <input name="maintenanceTitle" defaultValue={site.maintenanceTitle ?? ""} placeholder="En mantenimiento" className="input" />
            </Field>
            <Field label="Mensaje">
              <input
                name="maintenanceMessage" defaultValue={site.maintenanceMessage ?? ""}
                placeholder="Volvemos en un momento." className="input"
              />
            </Field>
          </div>
        </div>

        <Field label="Notas internas" hint="Solo visible en este panel.">
          <textarea name="notes" defaultValue={site.notes ?? ""} rows={2} className="input" />
        </Field>

        <div className="flex items-center gap-3">
          <button type="submit" disabled={pending} className="btn-primary">
            {pending ? "Guardando…" : "Guardar"}
          </button>
          {state.error ? <span className="text-sm text-red-600">{state.error}</span> : null}
          {state.ok ? <span className="text-sm text-emerald-700">{state.message}</span> : null}
        </div>
      </form>

      <div className="card flex flex-wrap items-center justify-between gap-3 border-red-200 p-5">
        <div>
          <p className="text-sm font-medium text-neutral-900">Eliminar sitio</p>
          <p className="hint">Borra el sitio, sus versiones, archivos, dominios y mensajes. No se puede deshacer.</p>
        </div>
        <button
          disabled={deleting}
          onClick={() => {
            if (confirm(`Escribe OK para confirmar. ¿Eliminar "${site.name}" y todo su contenido?`)) {
              startDelete(() => { void deleteSite(site.id); });
            }
          }}
          className="btn-danger"
        >
          {deleting ? "Eliminando…" : "Eliminar"}
        </button>
      </div>
    </div>
  );
}
