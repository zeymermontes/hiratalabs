"use client";

import { useEffect, useState } from "react";

export type ShowcaseSlide = { key: string; name: string; giro: string; demoUrl: string };

/**
 * Escaparate del hero: una laptop y un celular con tiendas demo reales. La
 * portada se recorre sola y cada pocos segundos cambia de plantilla.
 */
export function HeroShowcase({ slides }: { slides: ShowcaseSlide[] }) {
  const [i, setI] = useState(0);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (paused || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const t = setInterval(() => setI((v) => (v + 1) % slides.length), 5200);
    return () => clearInterval(t);
  }, [paused, slides.length]);

  const cur = slides[i];

  return (
    <div className="relative" onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)}>
      {/* Laptop */}
      <div className="relative rounded-[14px] border border-white/15 bg-[#1b1838] p-2 shadow-[0_40px_80px_-30px_rgba(0,0,0,.7)]">
        <div className="mb-2 flex items-center gap-1.5 px-1" aria-hidden="true">
          <span className="h-2.5 w-2.5 rounded-full bg-white/25" /><span className="h-2.5 w-2.5 rounded-full bg-white/25" /><span className="h-2.5 w-2.5 rounded-full bg-white/25" />
          <span className="ml-3 truncate rounded-md bg-white/10 px-3 py-0.5 font-mono text-[11px] text-cream/70">demo-{cur.key}.hiratalabs.com</span>
        </div>
        <div className="relative aspect-[16/10] overflow-hidden rounded-lg bg-white" style={{ ["--ld-frame-h" as string]: "100%" }}>
          {slides.map((s, idx) => (
            <div key={s.key} className="ld-slide absolute inset-0" data-on={idx === i} aria-hidden={idx !== i}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={`/plantillas/${s.key}-escritorio.webp`}
                alt={idx === i ? `Portada de la plantilla ${s.name}` : ""}
                className="ld-pan block w-full"
                style={{ ["--ld-frame-h" as string]: "33.3%" }}
                loading={idx < 2 ? "eager" : "lazy"}
              />
            </div>
          ))}
        </div>
      </div>

      {/* Celular */}
      <div className="ld-float absolute -bottom-10 -right-2 w-[30%] min-w-[110px] max-w-[170px] rounded-[26px] border-[5px] border-[#1b1838] bg-[#1b1838] shadow-[0_30px_60px_-20px_rgba(0,0,0,.7)] sm:-right-6">
        <div className="relative aspect-[390/844] overflow-hidden rounded-[20px] bg-white">
          {slides.map((s, idx) => (
            <div key={s.key} className="ld-slide absolute inset-0" data-on={idx === i} aria-hidden="true">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={`/plantillas/${s.key}-celular.webp`} alt="" className="block h-full w-full object-cover object-top" loading={idx < 2 ? "eager" : "lazy"} />
            </div>
          ))}
        </div>
      </div>

      {/* Qué plantilla es y selector */}
      <div className="mt-5 flex flex-wrap items-center gap-3 pr-[34%] sm:pr-[30%]">
        <a href={cur.demoUrl} target="_blank" rel="noreferrer" className="group inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-sm text-cream hover:bg-white/15">
          <span className="font-display text-lg leading-none tracking-wide text-lime">{cur.name}</span>
          <span className="font-mono text-[11px] text-cream/70">{cur.giro}</span>
          <span aria-hidden="true" className="transition group-hover:translate-x-0.5">↗</span>
        </a>
        <div className="flex" role="group" aria-label="Elegir plantilla del ejemplo">
          {slides.map((s, idx) => (
            <button
              key={s.key} type="button" onClick={() => setI(idx)} aria-label={`Ver ${s.name}`} aria-pressed={idx === i}
              className="group flex h-11 items-center px-1"
            >
              <span className={`block h-2.5 rounded-full transition-all ${idx === i ? "w-7 bg-lime" : "w-2.5 bg-white/30 group-hover:bg-white/50"}`} />
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
