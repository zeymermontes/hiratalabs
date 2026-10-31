import type { SectionProps } from "../../types";
import { str } from "../../types";
import { Paragraphs, RichLine, SectionButton } from "./shared";

/** Texto libre: centrado, a la izquierda o como cita grande. */
export function RichText({ section }: SectionProps) {
  const s = section.settings;
  const eyebrow = str(s, "eyebrow");
  const title = str(s, "title");
  const text = str(s, "text");
  const label = str(s, "buttonLabel");
  if (!eyebrow && !title && !text) return null;
  const variant = ["center", "left", "quote"].includes(section.variant ?? "") ? section.variant! : "center";
  const button = label ? <SectionButton label={label} href={str(s, "buttonHref")} /> : null;

  if (variant === "quote") {
    return (
      <section className="sf-rt sf-rt--quote">
        <div className="sf-wrap">
          <figure className="sf-rt-figure">
            {eyebrow ? <p className="sf-eyebrow">{eyebrow}</p> : null}
            <blockquote>
              <p className="sf-rt-quote sf-display">
                <span className="sf-rt-mark" aria-hidden="true">“</span>
                <RichLine text={title || text} />
              </p>
            </blockquote>
            {title && text ? <figcaption className="sf-rt-cap">— {text}</figcaption> : null}
            {button}
          </figure>
        </div>
      </section>
    );
  }

  if (variant === "left") {
    return (
      <section className="sf-rt sf-rt--left">
        <div className="sf-wrap sf-rt-grid">
          <div className="sf-rt-head">
            {eyebrow ? <p className="sf-eyebrow">{eyebrow}</p> : null}
            {title ? <h2 className="sf-h2"><RichLine text={title} /></h2> : null}
          </div>
          <div className="sf-rt-body">
            <Paragraphs text={text} className="sf-lead" />
            {button}
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="sf-rt sf-rt--center">
      <div className="sf-wrap sf-rt-center">
        {eyebrow ? <p className="sf-eyebrow">{eyebrow}</p> : null}
        {title ? <h2 className="sf-h2"><RichLine text={title} /></h2> : null}
        <Paragraphs text={text} className="sf-lead" />
        {button}
      </div>
    </section>
  );
}
