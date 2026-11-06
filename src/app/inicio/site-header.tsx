"use client";

import { useEffect, useState } from "react";

const LINKS = [
  { href: "#plantillas", label: "Plantillas" },
  { href: "#funciones", label: "Qué incluye" },
  { href: "#a-la-medida", label: "A la medida" },
  { href: "#preguntas", label: "Preguntas" },
];

export function SiteHeader({ cta }: { cta: { href: string; label: string; external?: boolean } }) {
  const [open, setOpen] = useState(false);
  const [solid, setSolid] = useState(false);

  useEffect(() => {
    const onScroll = () => setSolid(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <header className={`sticky top-0 z-40 transition-colors duration-300 ${solid || open ? "bg-ink/90 backdrop-blur-md" : "bg-transparent"}`}>
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-8">
        <a href="#inicio" className="flex min-h-11 items-center" aria-label="Hirata Labs, inicio">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo-wordmark-cream.svg" alt="" width={130} height={28} className="h-6 w-auto" />
        </a>
        <nav className="hidden items-center gap-7 text-sm font-semibold text-cream/80 lg:flex" aria-label="Secciones">
          {LINKS.map((l) => <a key={l.href} href={l.href} className="transition hover:text-lime">{l.label}</a>)}
        </nav>
        <div className="flex items-center gap-2">
          <a href="/login" className="hidden min-h-11 items-center rounded-full px-4 text-sm font-semibold text-cream/90 hover:text-cream sm:inline-flex">Entrar</a>
          <a
            href={cta.href} {...(cta.external ? { target: "_blank", rel: "noreferrer" } : {})}
            className="inline-flex min-h-11 items-center rounded-full bg-lime px-4 text-sm font-bold text-ink transition hover:bg-[#a8c93a]"
          >
            {cta.label}
          </a>
          <button
            type="button" onClick={() => setOpen((v) => !v)} aria-expanded={open} aria-controls="ld-mobile-nav" aria-label={open ? "Cerrar menú" : "Abrir menú"}
            className="flex h-11 w-11 items-center justify-center rounded-full text-cream hover:bg-white/10 lg:hidden"
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
              {open ? <path d="M6 6l12 12M18 6L6 18" /> : <path d="M4 7h16M4 12h16M4 17h16" />}
            </svg>
          </button>
        </div>
      </div>
      {open ? (
        <nav id="ld-mobile-nav" className="border-t border-white/10 px-4 pb-4 lg:hidden" aria-label="Secciones">
          {LINKS.map((l) => (
            <a key={l.href} href={l.href} onClick={() => setOpen(false)} className="flex min-h-12 items-center font-display text-3xl tracking-wide text-cream">{l.label}</a>
          ))}
          <a href="/login" className="flex min-h-12 items-center font-display text-3xl tracking-wide text-lime">Entrar a mi panel</a>
        </nav>
      ) : null}
    </header>
  );
}
