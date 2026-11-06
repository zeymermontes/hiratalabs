import { str, type SectionProps } from "../../types";
import { JsonLd, SectionHead, SmartLink } from "./shared";

export function FaqSection({ ctx, section }: SectionProps) {
  const c = section.settings;
  const variant = section.variant ?? "accordion";
  const items = (section.blocks ?? [])
    .filter((b) => b.type === "item")
    .map((b) => ({ id: b.id, q: str(b.settings, "question"), a: str(b.settings, "answer") }))
    .filter((f) => f.q && f.a);
  if (items.length === 0) return null;
  const title = str(c, "title") || "Preguntas frecuentes";
  const subtitle = str(c, "subtitle");
  const contact = ctx.config.whatsappHref || "/contacto";

  const list = (
    <div className="sf-faq-list">
      {items.map((f, i) => (
        <details key={f.id} className="sf-faq-item" open={variant === "accordion" && i === 0 ? true : undefined}>
          <summary className="sf-faq-q">
            <span>{f.q}</span>
            <span className="sf-faq-plus" aria-hidden="true" />
          </summary>
          <div className="sf-faq-a"><p>{f.a}</p></div>
        </details>
      ))}
    </div>
  );

  const ld = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: items.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })),
  };

  return (
    <section className={`sf-section sf-faq sf-faq--${variant}`}>
      <div className="sf-wrap">
        {variant === "twocol" ? (
          <div className="sf-faq-cols">
            <div className="sf-faq-aside">
              <SectionHead title={title} subtitle={subtitle} />
              <div className="sf-faq-help">
                <span>¿No encuentras tu respuesta?</span>
                <SmartLink href={contact} className="sf-btn sf-btn-outline">Escríbenos</SmartLink>
              </div>
            </div>
            {list}
          </div>
        ) : (
          <div className="sf-faq-narrow">
            <SectionHead title={title} subtitle={subtitle} align="center" />
            {list}
          </div>
        )}
      </div>
      <JsonLd data={ld} />
    </section>
  );
}
