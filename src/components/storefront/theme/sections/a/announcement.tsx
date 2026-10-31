import type { SectionProps } from "../../types";
import { str } from "../../types";
import { RotatingMessages } from "./announcement-client";
import { SmartLink } from "./shared";

/** Barra de anuncio: fija, corriendo o rotando entre mensajes (uno por línea). */
export function Announcement({ section }: SectionProps) {
  const messages = str(section.settings, "text").split("\n").map((m) => m.trim()).filter(Boolean);
  if (messages.length === 0) return null;
  const href = str(section.settings, "href");
  const variant = section.variant ?? "static";

  let body: React.ReactNode;
  if (variant === "marquee") {
    // Se repite el contenido para que la vuelta sea continua.
    const run = [...messages, ...messages, ...messages];
    body = (
      <div className="sf-ann-marquee" aria-label={messages.join(" · ")} role="marquee">
        <div className="sf-marquee-track" aria-hidden="true">
          {[0, 1].map((half) => (
            <div key={half} className="sf-ann-run">
              {run.map((m, i) => <span key={i} className="sf-ann-item">{m}<span className="sf-ann-dot" aria-hidden="true">✦</span></span>)}
            </div>
          ))}
        </div>
      </div>
    );
  } else if (variant === "rotating" && messages.length > 1) {
    body = <RotatingMessages messages={messages} />;
  } else {
    body = <p className="sf-ann-static">{messages.join("  ·  ")}</p>;
  }

  return (
    <div className={`sf-ann sf-ann--${variant}`}>
      {href ? <SmartLink href={href} className="sf-ann-link">{body}</SmartLink> : body}
    </div>
  );
}
