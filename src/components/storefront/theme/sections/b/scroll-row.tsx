"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";

/**
 * Fila con desplazamiento horizontal (carruseles). En teléfono se desliza con
 * el dedo; en escritorio aparecen flechas. Las tarjetas llegan ya pintadas
 * desde el servidor como children.
 */
export function ScrollRow({ children, label }: { children: ReactNode; label: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [edge, setEdge] = useState({ start: true, end: false });

  const update = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    setEdge({ start: el.scrollLeft <= 4, end: el.scrollLeft + el.clientWidth >= el.scrollWidth - 4 });
  }, []);

  useEffect(() => {
    update();
    const el = ref.current;
    if (!el) return;
    el.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    return () => { el.removeEventListener("scroll", update); window.removeEventListener("resize", update); };
  }, [update]);

  const go = (dir: 1 | -1) => {
    const el = ref.current;
    if (!el) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    el.scrollBy({ left: dir * el.clientWidth * 0.85, behavior: reduce ? "auto" : "smooth" });
  };

  return (
    <div className="sf-scroller" data-start={edge.start} data-end={edge.end}>
      <div ref={ref} className="sf-scroller-track" role="region" aria-label={label} tabIndex={0}>
        {children}
      </div>
      <div className="sf-scroller-nav">
        <button type="button" className="sf-scroller-btn" aria-label="Anterior" disabled={edge.start} onClick={() => go(-1)}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M15 6l-6 6 6 6" /></svg>
        </button>
        <button type="button" className="sf-scroller-btn" aria-label="Siguiente" disabled={edge.end} onClick={() => go(1)}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M9 6l6 6-6 6" /></svg>
        </button>
      </div>
    </div>
  );
}
