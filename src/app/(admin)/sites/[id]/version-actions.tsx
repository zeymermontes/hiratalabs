"use client";

import { useTransition } from "react";
import { activateVersion, deleteVersion } from "../../actions";

export function VersionActions({
  siteId, versionId, isActive,
}: { siteId: string; versionId: string; isActive: boolean }) {
  const [pending, start] = useTransition();

  if (isActive) {
    return <span className="text-xs font-medium text-emerald-700">Publicada</span>;
  }

  return (
    <div className="flex items-center gap-2">
      <button
        disabled={pending}
        onClick={() => start(() => { void activateVersion(siteId, versionId); })}
        className="text-xs font-medium text-neutral-700 underline-offset-2 hover:underline disabled:opacity-50"
      >
        Publicar
      </button>
      <button
        disabled={pending}
        onClick={() => {
          if (confirm("¿Borrar esta versión y sus archivos?")) {
            start(() => { void deleteVersion(siteId, versionId); });
          }
        }}
        className="text-xs text-neutral-400 underline-offset-2 hover:text-red-600 hover:underline disabled:opacity-50"
      >
        Borrar
      </button>
    </div>
  );
}
