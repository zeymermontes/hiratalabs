import type { SectionProps } from "../../types";
import { str } from "../../types";
import { CountdownTimer } from "./countdown-client";
import { RichLine, SectionButton } from "./shared";

/** "YYYY-MM-DDTHH:mm" sin zona se toma como hora de la Ciudad de México (-06:00). */
export function parseEndsAt(raw: string): number | null {
  const v = raw.trim();
  if (!v) return null;
  let iso = v.replace(" ", "T");
  if (/^\d{4}-\d{2}-\d{2}$/.test(iso)) iso += "T00:00";
  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(iso)) iso += ":00";
  if (!/(Z|[+-]\d{2}:?\d{2})$/i.test(iso)) iso += "-06:00";
  const t = Date.parse(iso);
  return Number.isFinite(t) ? t : null;
}

/** Cuenta regresiva para lanzamientos y ofertas con fecha. */
export function Countdown({ section }: SectionProps) {
  const s = section.settings;
  const target = parseEndsAt(str(s, "endsAt"));
  const title = str(s, "title");
  const eyebrow = str(s, "eyebrow");
  const label = str(s, "buttonLabel");
  const href = str(s, "buttonHref") || "/productos";
  if (!target && !title) return null;
  const variant = section.variant === "inline" ? "inline" : "boxes";

  return (
    <section className={`sf-cd sf-cd--${variant}`}>
      <div className="sf-wrap sf-cd-inner">
        <div className="sf-cd-copy">
          {eyebrow ? <p className="sf-eyebrow">{eyebrow}</p> : null}
          {title ? <h2 className="sf-h2"><RichLine text={title} /></h2> : null}
        </div>
        {target ? (
          <CountdownTimer target={target} variant={variant} button={label ? <SectionButton label={label} href={href} /> : null} />
        ) : label ? <SectionButton label={label} href={href} /> : null}
      </div>
    </section>
  );
}
