"use client";

import { useActionState, useTransition } from "react";
import { addMember, removeMember, type ActionState } from "@/app/(admin)/module-actions";

export function AddMemberForm({ siteId }: { siteId: string }) {
  const [state, action, pending] = useActionState<ActionState, FormData>(addMember, {});
  return (
    <form action={action} className="card space-y-3 p-4">
      <input type="hidden" name="siteId" value={siteId} />
      <div>
        <label className="label" htmlFor="m-email">Correo</label>
        <input id="m-email" name="email" type="email" required className="input" placeholder="dueño@negocio.com" />
      </div>
      <div>
        <label className="label" htmlFor="m-name">Nombre</label>
        <input id="m-name" name="name" className="input" placeholder="Opcional" />
      </div>
      <div>
        <label className="label" htmlFor="m-role">Rol</label>
        <select id="m-role" name="role" defaultValue="owner" className="input">
          <option value="owner">Dueño</option>
          <option value="staff">Staff</option>
        </select>
      </div>
      {state.error ? <p className="text-xs text-red-600">{state.error}</p> : null}
      {state.message ? <p className="text-xs text-emerald-700">{state.message}</p> : null}
      <button type="submit" disabled={pending} className="btn-primary w-full">
        {pending ? "Guardando…" : "Dar acceso"}
      </button>
    </form>
  );
}

export function RemoveMemberButton({ siteId, memberId }: { siteId: string; memberId: string }) {
  const [pending, start] = useTransition();
  return (
    <button
      type="button" disabled={pending} className="btn-danger"
      onClick={() => { if (confirm("¿Quitar el acceso de esta persona?")) start(() => removeMember(siteId, memberId)); }}
    >
      Quitar
    </button>
  );
}
