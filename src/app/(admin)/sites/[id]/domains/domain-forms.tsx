"use client";

import { useActionState, useTransition } from "react";
import {
  addDomain, forceVerifyDomain, refreshDomain, removeDomain, setPrimaryDomain, type ActionState,
} from "../../../actions";
import { StatusPill } from "@/components/ui";

export function AddDomainForm({ siteId }: { siteId: string }) {
  const [state, action, pending] = useActionState<ActionState, FormData>(addDomain, {});

  return (
    <form action={action} className="card p-5">
      <input type="hidden" name="siteId" value={siteId} />
      <label className="label">Agregar dominio propio</label>
      <div className="flex flex-wrap gap-2">
        <input name="hostname" placeholder="www.cliente.com" className="input flex-1" required />
        <button type="submit" disabled={pending} className="btn-primary">
          {pending ? "Agregando…" : "Agregar"}
        </button>
      </div>
      {state.error ? <p className="mt-3 text-sm text-red-600">{state.error}</p> : null}
      {state.ok ? <p className="mt-3 text-sm text-emerald-700">{state.message}</p> : null}
    </form>
  );
}

export function DomainRow({
  siteId, domain, dns,
}: {
  siteId: string;
  domain: { id: string; hostname: string; status: string; isPrimary: boolean; lastCheckedAt: Date | null };
  dns: { type: string; name: string; value: string; note: string };
}) {
  const [pending, start] = useTransition();

  return (
    <div className="px-5 py-4">
      <div className="flex flex-wrap items-center gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <a
              href={`https://${domain.hostname}`} target="_blank" rel="noreferrer"
              className="truncate text-sm font-medium text-neutral-900 underline-offset-2 hover:underline"
            >
              {domain.hostname}
            </a>
            <StatusPill status={domain.status} />
            {domain.isPrimary ? <span className="text-xs text-neutral-400">principal</span> : null}
          </div>
          {domain.lastCheckedAt ? (
            <p className="mt-0.5 text-xs text-neutral-400">
              Revisado {new Date(domain.lastCheckedAt).toLocaleString("es-MX")}
            </p>
          ) : null}
        </div>

        <div className="flex flex-wrap items-center gap-3 text-xs">
          <button
            disabled={pending}
            onClick={() => start(() => { void refreshDomain(siteId, domain.id); })}
            className="font-medium text-neutral-700 underline-offset-2 hover:underline disabled:opacity-50"
          >
            Revisar
          </button>
          {domain.status !== "verified" ? (
            <button
              disabled={pending}
              onClick={() => start(() => { void forceVerifyDomain(siteId, domain.id); })}
              className="text-neutral-500 underline-offset-2 hover:underline disabled:opacity-50"
            >
              Marcar verificado
            </button>
          ) : null}
          {!domain.isPrimary ? (
            <button
              disabled={pending}
              onClick={() => start(() => { void setPrimaryDomain(siteId, domain.id); })}
              className="text-neutral-500 underline-offset-2 hover:underline disabled:opacity-50"
            >
              Hacer principal
            </button>
          ) : null}
          <button
            disabled={pending}
            onClick={() => {
              if (confirm(`¿Quitar ${domain.hostname}?`)) start(() => { void removeDomain(siteId, domain.id); });
            }}
            className="text-neutral-400 underline-offset-2 hover:text-red-600 hover:underline disabled:opacity-50"
          >
            Quitar
          </button>
        </div>
      </div>

      {domain.status !== "verified" ? (
        <div className="mt-3 rounded-lg border border-neutral-200 bg-neutral-50 p-3">
          <p className="mb-2 text-xs font-medium text-neutral-700">Registro DNS que debe crear el cliente:</p>
          <table className="w-full text-xs">
            <tbody>
              <tr>
                <td className="py-0.5 pr-4 text-neutral-500">Tipo</td>
                <td className="font-mono text-neutral-900">{dns.type}</td>
              </tr>
              <tr>
                <td className="py-0.5 pr-4 text-neutral-500">Nombre</td>
                <td className="font-mono text-neutral-900">{dns.name}</td>
              </tr>
              <tr>
                <td className="py-0.5 pr-4 text-neutral-500">Valor</td>
                <td className="font-mono text-neutral-900">{dns.value}</td>
              </tr>
            </tbody>
          </table>
          <p className="hint mt-2">{dns.note}</p>
        </div>
      ) : null}
    </div>
  );
}
