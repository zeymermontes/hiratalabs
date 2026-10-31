import { str, type SectionProps } from "../../types";
import { SmartLink } from "./shared";

export function ImageTextSection({ section }: SectionProps) {
  const c = section.settings;
  const variant = section.variant ?? "left";
  const eyebrow = str(c, "eyebrow");
  const title = str(c, "title");
  const text = str(c, "text");
  const label = str(c, "buttonLabel");
  const href = str(c, "buttonHref") || "/productos";
  const image = str(c, "image");
  if (!title && !text && !image) return null;

  const media = image ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={image} alt="" loading="lazy" />
  ) : <span className="sf-ph" aria-hidden="true">Imagen</span>;

  const copy = (
    <div className="sf-it-copy">
      {eyebrow ? <div className="sf-eyebrow">{eyebrow}</div> : null}
      {title ? <h2 className="sf-h2">{title}</h2> : null}
      {text ? <p className="sf-lead sf-it-text">{text}</p> : null}
      {label ? <SmartLink href={href} className={`sf-btn ${variant === "full" ? "sf-it-btn-invert" : "sf-btn-primary"}`}>{label}</SmartLink> : null}
    </div>
  );

  if (variant === "full") {
    return (
      <section className="sf-it sf-it--full">
        <div className="sf-it-bg">{media}</div>
        <div className="sf-wrap sf-it-inner">{copy}</div>
      </section>
    );
  }

  return (
    <section className={`sf-section sf-it sf-it--${variant}`}>
      <div className="sf-wrap">
        <div className="sf-it-layout">
          <div className="sf-it-media">{media}</div>
          {copy}
        </div>
      </div>
    </section>
  );
}
