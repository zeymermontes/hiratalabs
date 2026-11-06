import { str, type SectionProps } from "../../types";
import { FeatureIcon } from "./icons";
import { SectionHead } from "./shared";

export function FeaturesSection({ section }: SectionProps) {
  const c = section.settings;
  const variant = section.variant ?? "row";
  const items = (section.blocks ?? [])
    .filter((b) => b.type === "feature")
    .map((b) => ({ id: b.id, icon: str(b.settings, "icon", "sparkle") || "sparkle", title: str(b.settings, "title"), text: str(b.settings, "text") }))
    .filter((f) => f.title || f.text);
  if (items.length === 0) return null;
  const title = str(c, "title");
  const subtitle = str(c, "subtitle");

  return (
    <section className={`sf-section sf-feat sf-feat--${variant}`}>
      <div className="sf-wrap">
        <SectionHead title={title} subtitle={subtitle} align={variant === "row" ? "split" : "center"} />
        <ol className="sf-feat-list" data-count={items.length} style={{ "--n": items.length } as React.CSSProperties}>
          {items.map((f, i) => (
            <li key={f.id} className="sf-feat-item">
              {variant === "steps" ? (
                <span className="sf-feat-num" aria-hidden="true">{String(i + 1).padStart(2, "0")}</span>
              ) : (
                <span className="sf-feat-icon"><FeatureIcon name={f.icon} /></span>
              )}
              <div className="sf-feat-copy">
                {f.title ? <h3 className="sf-feat-title">{f.title}</h3> : null}
                {f.text ? <p className="sf-feat-text">{f.text}</p> : null}
              </div>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
