"use client";

import { useOptimistic, useTransition } from "react";
import { toggleFeatured } from "./actions";

/** Estrella de "destacado" en el listado; cambia al instante y se guarda atrás. */
export function FeaturedToggle({ siteId, productId, featured }: { siteId: string; productId: string; featured: boolean }) {
  const [pending, start] = useTransition();
  const [value, setValue] = useOptimistic(featured);

  return (
    <button
      type="button"
      disabled={pending}
      aria-pressed={value}
      aria-label={value ? "Quitar de destacados" : "Marcar como destacado"}
      title={value ? "Destacado en la portada" : "Marcar como destacado"}
      onClick={() => start(async () => { setValue(!value); await toggleFeatured(siteId, productId, !value); })}
      className={`inline-flex h-8 w-8 items-center justify-center rounded-full text-lg transition ${value ? "text-amber-700" : "text-neutral-300 hover:text-neutral-500"}`}
    >
      {value ? "★" : "☆"}
    </button>
  );
}
