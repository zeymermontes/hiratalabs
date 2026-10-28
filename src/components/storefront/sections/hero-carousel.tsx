"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

export type Slide = {
  id: string;
  title: string;
  subtitle: string | null;
  imageUrl: string;
  mobileImageUrl: string | null;
  linkUrl: string | null;
  ctaLabel: string | null;
};

function isInternal(href: string) {
  return href.startsWith("/") && !href.startsWith("//");
}

/** Carrusel de portada: cambia solo, se pausa al pasar el mouse, se desliza en celular. */
export function HeroCarousel({ slides, autoplayMs = 6000 }: { slides: Slide[]; autoplayMs?: number }) {
  const [idx, setIdx] = useState(0);
  const [paused, setPaused] = useState(false);
  const startX = useRef<number | null>(null);
  const count = slides.length;

  useEffect(() => {
    if (count <= 1 || paused || autoplayMs <= 0) return;
    if (typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const t = setInterval(() => setIdx((i) => (i + 1) % count), autoplayMs);
    return () => clearInterval(t);
  }, [count, paused, autoplayMs]);

  if (count === 0) return null;
  const go = (n: number) => setIdx(((n % count) + count) % count);

  return (
    <section
      className="sf-carousel sf-reveal"
      aria-roledescription="carrusel"
      aria-label="Novedades"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onTouchStart={(e) => { startX.current = e.touches[0].clientX; setPaused(true); }}
      onTouchEnd={(e) => {
        if (startX.current !== null) {
          const dx = e.changedTouches[0].clientX - startX.current;
          if (Math.abs(dx) > 40) go(idx + (dx < 0 ? 1 : -1));
        }
        startX.current = null;
        setPaused(false);
      }}
    >
      {slides.map((s, i) => {
        const active = i === idx;
        const body = (
          <>
            <picture>
              {s.mobileImageUrl ? <source media="(max-width: 639px)" srcSet={s.mobileImageUrl} /> : null}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={s.imageUrl} alt={s.title} loading={i === 0 ? "eager" : "lazy"} />
            </picture>
            {s.title || s.subtitle ? (
              <div className="sf-slide-copy">
                <h2>{s.title}</h2>
                {s.subtitle ? <p>{s.subtitle}</p> : null}
                {s.ctaLabel && s.linkUrl ? <span className="sf-btn sf-btn-primary">{s.ctaLabel}</span> : null}
              </div>
            ) : null}
          </>
        );
        const cls = "sf-slide";
        if (s.linkUrl) {
          return isInternal(s.linkUrl) ? (
            <Link key={s.id} href={s.linkUrl} className={cls} data-active={active} aria-hidden={!active} tabIndex={active ? 0 : -1}>{body}</Link>
          ) : (
            <a key={s.id} href={s.linkUrl} className={cls} data-active={active} aria-hidden={!active} tabIndex={active ? 0 : -1} target="_blank" rel="noreferrer">{body}</a>
          );
        }
        return <div key={s.id} className={cls} data-active={active} aria-hidden={!active}>{body}</div>;
      })}

      {count > 1 ? (
        <>
          <button type="button" className="sf-gallery-nav" data-dir="prev" aria-label="Anterior" onClick={() => go(idx - 1)}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M15 6l-6 6 6 6" /></svg>
          </button>
          <button type="button" className="sf-gallery-nav" data-dir="next" aria-label="Siguiente" onClick={() => go(idx + 1)}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M9 6l6 6-6 6" /></svg>
          </button>
          <div className="sf-dots">
            {slides.map((s, i) => (
              <button key={s.id} type="button" className="sf-dot" aria-current={i === idx} aria-label={`Ir al banner ${i + 1}`} onClick={() => go(i)} />
            ))}
          </div>
        </>
      ) : null}
    </section>
  );
}
