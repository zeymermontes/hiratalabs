import type { SectionProps } from "../../types";
import { bool, str } from "../../types";

const DUR: Record<string, string> = { slow: "60s", normal: "34s", fast: "18s" };

/** Banda de texto que corre de lado a lado; el contenido va duplicado para que no se note el corte. */
export function Marquee({ section }: SectionProps) {
  const s = section.settings;
  const text = str(s, "text");
  if (!text) return null;
  const phrases = text.split("·").map((p) => p.trim()).filter(Boolean);
  const size = ["md", "lg", "xl"].includes(str(s, "size")) ? str(s, "size") : "lg";
  const variant = section.variant === "outline" ? "outline" : "band";
  // Repetimos la frase lo suficiente para cubrir pantallas anchas.
  const reps = Math.max(2, Math.ceil(8 / phrases.length));
  const run = Array.from({ length: reps }, () => phrases).flat();

  return (
    <section
      className={`sf-mq sf-mq--${variant}`}
      data-size={size}
      data-tilt={bool(s, "tilt", false)}
      style={{ "--sf-marquee-dur": DUR[str(s, "speed")] ?? DUR.normal } as React.CSSProperties}
      aria-label={phrases.join(" · ")}
    >
      <div className="sf-mq-band">
        <div className="sf-marquee-track" aria-hidden="true">
          {[0, 1].map((half) => (
            <div key={half} className="sf-mq-run">
              {run.map((p, i) => (
                <span key={i} className="sf-mq-item">
                  <span className="sf-display">{p}</span>
                  <span className="sf-mq-sep">✺</span>
                </span>
              ))}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
