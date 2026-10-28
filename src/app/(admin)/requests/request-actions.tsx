"use client";

import { useTransition } from "react";
import { resolveRequest } from "@/app/(admin)/module-actions";

export function RequestActions({ id }: { id: string }) {
  const [pending, start] = useTransition();
  return (
    <div className="flex gap-2">
      <button
        type="button" disabled={pending} className="btn-primary"
        onClick={() => start(() => resolveRequest(id, true))}
      >
        Aprobar y activar
      </button>
      <button
        type="button" disabled={pending} className="btn-secondary"
        onClick={() => start(() => resolveRequest(id, false))}
      >
        Rechazar
      </button>
    </div>
  );
}
