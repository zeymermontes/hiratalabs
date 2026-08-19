"use client";

import { useTransition } from "react";
import { deleteSubmission } from "../../../actions";

export function DeleteSubmissionButton({ siteId, id }: { siteId: string; id: string }) {
  const [pending, start] = useTransition();

  return (
    <button
      disabled={pending}
      onClick={() => {
        if (confirm("¿Borrar este mensaje?")) start(() => { void deleteSubmission(siteId, id); });
      }}
      className="text-xs text-neutral-400 underline-offset-2 hover:text-red-600 hover:underline disabled:opacity-50"
    >
      Borrar
    </button>
  );
}
