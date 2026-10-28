"use client";

import { useRef, useState } from "react";

type Img = { url: string; alt?: string; thumbUrl?: string };

/** Galería de la ficha: imagen grande con flechas y deslizar, miniaturas abajo. */
export function ProductGallery({ images, name }: { images: Img[]; name: string }) {
  const [idx, setIdx] = useState(0);
  const startX = useRef<number | null>(null);
  const count = images.length;

  if (count === 0) {
    return (
      <div className="sf-gallery">
        <div className="sf-gallery-main sf-card-media-empty">Sin foto</div>
      </div>
    );
  }
  const go = (n: number) => setIdx(((n % count) + count) % count);
  const current = images[idx] ?? images[0];

  return (
    <div className="sf-gallery">
      <div
        className="sf-gallery-main"
        onTouchStart={(e) => { startX.current = e.touches[0].clientX; }}
        onTouchEnd={(e) => {
          if (startX.current === null) return;
          const dx = e.changedTouches[0].clientX - startX.current;
          if (Math.abs(dx) > 40) go(idx + (dx < 0 ? 1 : -1));
          startX.current = null;
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img key={current.url} src={current.url} alt={current.alt ?? name} />
        {count > 1 ? (
          <>
            <button type="button" className="sf-gallery-nav" data-dir="prev" aria-label="Imagen anterior" onClick={() => go(idx - 1)}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M15 6l-6 6 6 6" /></svg>
            </button>
            <button type="button" className="sf-gallery-nav" data-dir="next" aria-label="Imagen siguiente" onClick={() => go(idx + 1)}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M9 6l6 6-6 6" /></svg>
            </button>
          </>
        ) : null}
      </div>
      {count > 1 ? (
        <div className="sf-thumbs" role="tablist" aria-label="Imágenes del producto">
          {images.map((im, i) => (
            <button key={im.url + i} type="button" role="tab" className="sf-thumb" aria-current={i === idx} aria-label={`Imagen ${i + 1}`} onClick={() => setIdx(i)}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={im.thumbUrl ?? im.url} alt="" loading="lazy" />
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
