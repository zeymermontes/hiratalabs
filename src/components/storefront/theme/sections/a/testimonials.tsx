import type { SectionProps } from "../../types";
import { str } from "../../types";

type Quote = { text: string; author: string; detail: string };

function Who({ q }: { q: Quote }) {
  if (!q.author && !q.detail) return null;
  const initial = (q.author || q.detail).trim().charAt(0).toUpperCase();
  return (
    <figcaption className="sf-tm-who">
      <span className="sf-tm-avatar" aria-hidden="true">{initial}</span>
      <span>
        {q.author ? <strong>{q.author}</strong> : null}
        {q.detail ? <span className="sf-tm-detail">{q.detail}</span> : null}
      </span>
    </figcaption>
  );
}

/** Testimonios: una cita enorme, tarjetas o una banda que corre. */
export function Testimonials({ section }: SectionProps) {
  const quotes: Quote[] = (section.blocks ?? [])
    .filter((b) => b.type === "quote")
    .map((b) => ({ text: str(b.settings, "text"), author: str(b.settings, "author"), detail: str(b.settings, "detail") }))
    .filter((q) => q.text);
  if (quotes.length === 0) return null;
  const title = str(section.settings, "title");
  const variant = section.variant ?? "bigquote";

  if (variant === "marquee") {
    return (
      <section className="sf-tm sf-tm--marquee">
        {title ? <div className="sf-wrap"><h2 className="sf-h2 sf-tm-title">{title}</h2></div> : null}
        <div className="sf-tm-band">
          <div className="sf-marquee-track" style={{ "--sf-marquee-dur": `${Math.max(30, quotes.length * 12)}s` } as React.CSSProperties}>
            {[0, 1].map((half) => (
              <div key={half} className="sf-tm-run" aria-hidden={half === 1 ? true : undefined}>
                {[...quotes, ...(quotes.length < 4 ? quotes : [])].map((q, i) => (
                  <figure key={i} className="sf-tm-card">
                    <blockquote><p>“{q.text}”</p></blockquote>
                    <Who q={q} />
                  </figure>
                ))}
              </div>
            ))}
          </div>
        </div>
      </section>
    );
  }

  if (variant === "cards") {
    return (
      <section className="sf-tm sf-tm--cards">
        <div className="sf-wrap">
          {title ? <h2 className="sf-h2 sf-tm-title">{title}</h2> : null}
          <div className="sf-tm-grid">
            {quotes.map((q, i) => (
              <figure key={i} className="sf-tm-card sf-rv">
                <span className="sf-tm-mark sf-display" aria-hidden="true">“</span>
                <blockquote><p>{q.text}</p></blockquote>
                <Who q={q} />
              </figure>
            ))}
          </div>
        </div>
      </section>
    );
  }

  // bigquote: una cita a pantalla; si hay varias se deslizan de lado.
  return (
    <section className="sf-tm sf-tm--bigquote">
      <div className="sf-wrap">
        {title ? <p className="sf-eyebrow sf-tm-eyebrow">{title}</p> : null}
        <div className="sf-tm-slides" data-count={quotes.length} tabIndex={quotes.length > 1 ? 0 : undefined} aria-label={quotes.length > 1 ? "Testimonios, desliza para ver más" : undefined}>
          {quotes.map((q, i) => (
            <figure key={i} className="sf-tm-big">
              <span className="sf-tm-mark sf-display" aria-hidden="true">“</span>
              <blockquote><p className="sf-display">{q.text}</p></blockquote>
              <Who q={q} />
            </figure>
          ))}
        </div>
      </div>
    </section>
  );
}
