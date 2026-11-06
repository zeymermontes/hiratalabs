"use client";

import Link from "next/link";
import { useId, useRef, useState, type KeyboardEvent, type ReactNode } from "react";

export type ProductTab = { key: string; label: string; href: string; panel: ReactNode };

/**
 * Pestañas por categoría. Todos los paneles vienen ya pintados del servidor;
 * aquí solo se cambia cuál se ve (sin pedir nada a la red).
 */
export function ProductTabs({ tabs, viewAll }: { tabs: ProductTab[]; viewAll: boolean }) {
  const [active, setActive] = useState(0);
  const refs = useRef<(HTMLButtonElement | null)[]>([]);
  const base = useId();

  const focus = (i: number) => {
    const n = (i + tabs.length) % tabs.length;
    setActive(n);
    refs.current[n]?.focus();
  };
  const onKey = (e: KeyboardEvent<HTMLButtonElement>, i: number) => {
    if (e.key === "ArrowRight") { e.preventDefault(); focus(i + 1); }
    else if (e.key === "ArrowLeft") { e.preventDefault(); focus(i - 1); }
    else if (e.key === "Home") { e.preventDefault(); focus(0); }
    else if (e.key === "End") { e.preventDefault(); focus(tabs.length - 1); }
  };
  const current = tabs[active] ?? tabs[0];

  return (
    <div className="sf-pg-tabs">
      <div className="sf-pg-tabbar">
        <div className="sf-pg-tablist" role="tablist" aria-label="Categorías">
          {tabs.map((t, i) => (
            <button
              key={t.key}
              ref={(el) => { refs.current[i] = el; }}
              type="button"
              role="tab"
              id={`${base}-t${i}`}
              aria-selected={i === active}
              aria-controls={`${base}-p${i}`}
              tabIndex={i === active ? 0 : -1}
              className="sf-pg-tab"
              onClick={() => setActive(i)}
              onKeyDown={(e) => onKey(e, i)}
            >
              {t.label}
            </button>
          ))}
        </div>
        {viewAll && current ? (
          <Link href={current.href} className="sf-bhead-more">
            Ver todo
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5 12h14m-6-6 6 6-6 6" /></svg>
          </Link>
        ) : null}
      </div>
      {tabs.map((t, i) => (
        <div
          key={t.key}
          role="tabpanel"
          id={`${base}-p${i}`}
          aria-labelledby={`${base}-t${i}`}
          hidden={i !== active}
          className="sf-pg-panel"
          tabIndex={0}
        >
          {t.panel}
        </div>
      ))}
    </div>
  );
}
