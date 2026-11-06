import { str, type SectionProps } from "../../types";
import { Arrow, SmartLink } from "./shared";

export function CtaBandSection({ ctx, section }: SectionProps) {
  const c = section.settings;
  const variant = section.variant ?? "band";
  const title = str(c, "title");
  if (!title) return null;
  const subtitle = str(c, "subtitle");
  const label = str(c, "buttonLabel");
  const href = str(c, "buttonHref") || ctx.config.whatsappHref || "/contacto";
  const image = str(c, "image");

  const copy = (
    <div className="sf-cta2-copy">
      <h2 className="sf-h2">{title}</h2>
      {subtitle ? <p className="sf-lead">{subtitle}</p> : null}
    </div>
  );
  const button = label ? (
    <SmartLink href={href} className="sf-btn sf-cta2-btn">{label} <Arrow size={16} /></SmartLink>
  ) : null;

  if (variant === "split") {
    return (
      <section className="sf-section sf-cta2 sf-cta2--split">
        <div className="sf-wrap">
          <div className="sf-cta2-box">
            <div className="sf-cta2-media">
              {image ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={image} alt="" loading="lazy" />
              ) : <span className="sf-ph" aria-hidden="true">Imagen</span>}
            </div>
            <div className="sf-cta2-body">{copy}{button}</div>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className={`sf-section sf-cta2 sf-cta2--${variant}`}>
      <div className="sf-wrap">
        <div className="sf-cta2-box">
          {copy}
          {button}
        </div>
      </div>
    </section>
  );
}
