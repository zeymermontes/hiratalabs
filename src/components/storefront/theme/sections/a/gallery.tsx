import type { SectionProps } from "../../types";
import { str } from "../../types";
import { Media, SmartLink } from "./shared";

type Photo = { image: string; caption: string; href: string };

/** Galería de fotos: rejilla, muro tipo masonry o tira con desplazamiento. */
export function Gallery({ section }: SectionProps) {
  const photos: Photo[] = (section.blocks ?? [])
    .filter((b) => b.type === "image")
    .map((b) => ({ image: str(b.settings, "image"), caption: str(b.settings, "caption"), href: str(b.settings, "href") }))
    .filter((p) => p.image || p.caption);
  if (photos.length === 0) return null;
  const title = str(section.settings, "title");
  const variant = ["grid", "masonry", "strip"].includes(section.variant ?? "") ? section.variant! : "grid";

  return (
    <section className={`sf-gal sf-gal--${variant}`}>
      <div className="sf-wrap">
        {title ? <h2 className="sf-h2 sf-gal-title">{title}</h2> : null}
      </div>
      <div className={variant === "strip" ? "sf-gal-strip-outer" : "sf-wrap"}>
        <ul className="sf-gal-list" tabIndex={variant === "strip" ? 0 : undefined} aria-label={variant === "strip" ? "Galería, desliza para ver más" : undefined}>
          {photos.map((p, i) => {
            const inner = (
              <>
                <Media src={p.image} alt={p.caption} className="sf-gal-img" label={p.caption || undefined} />
                {p.caption ? <span className="sf-gal-cap">{p.caption}</span> : null}
              </>
            );
            return (
              <li key={i} className="sf-gal-item sf-rv" data-i={i % 6}>
                {p.href ? <SmartLink href={p.href} className="sf-gal-fig">{inner}</SmartLink> : <div className="sf-gal-fig">{inner}</div>}
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
