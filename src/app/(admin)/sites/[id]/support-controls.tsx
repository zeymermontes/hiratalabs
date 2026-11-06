"use client";

import { useTransition } from "react";
import { enterSupport, exitSupport } from "../../support-actions";

/** Botón para que un super admin entre a ver el sitio como su dueño. */
export function SupportButton({ siteId }: { siteId: string }) {
  const [pending, start] = useTransition();
  return (
    <button
      type="button" disabled={pending} onClick={() => start(() => enterSupport(siteId))}
      title="Ve y edita este sitio con los mismos permisos y pantallas que su dueño"
      className="btn-secondary text-xs disabled:opacity-50"
    >
      {pending ? "Entrando…" : "Ver como dueño"}
    </button>
  );
}

/** Aviso fijo mientras el modo soporte está prendido. */
export function SupportBanner({ siteId, siteName }: { siteId: string; siteName: string }) {
  const [pending, start] = useTransition();
  return (
    <div role="status" className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900">
      <p>
        <strong>Modo soporte.</strong> Estás viendo <strong>{siteName}</strong> como su dueño: lo que cambies se guarda en su sitio.
      </p>
      <button
        type="button" disabled={pending} onClick={() => start(() => exitSupport(siteId))}
        className="rounded-lg bg-amber-900 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-amber-800 disabled:opacity-50"
      >
        {pending ? "Saliendo…" : "Salir del modo soporte"}
      </button>
    </div>
  );
}
