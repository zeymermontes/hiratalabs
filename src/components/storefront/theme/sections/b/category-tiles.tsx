import Link from "next/link";
import { listCategories } from "@/modules/catalog/queries";
import { num, str, type SectionProps } from "../../types";
import { Arrow, SectionHead } from "./shared";

function Media({ src, name, className = "" }: { src: string | null; name: string; className?: string }) {
  return src ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img className={className} src={src} alt="" loading="lazy" />
  ) : (
    <span className={`sf-ph ${className}`} aria-hidden="true">{name.slice(0, 1)}</span>
  );
}

export async function CategoryTilesSection({ ctx, section }: SectionProps) {
  if (!ctx.modules.has("catalog")) return null;
  const c = section.settings;
  const variant = section.variant ?? "tiles";
  const { tree } = await listCategories(ctx.site.id);
  const list = tree.slice(0, Math.min(12, num(c, "limit", 6)));
  if (list.length === 0) return null;
  const title = str(c, "title");

  let body: React.ReactNode;
  if (variant === "circles") {
    body = (
      <ul className="sf-cats-circles">
        {list.map((cat) => (
          <li key={cat.id}>
            <Link href={`/categorias/${cat.slug}`} className="sf-cats-circle">
              <span className="sf-cats-circle-media"><Media src={cat.imageUrl} name={cat.name} /></span>
              <span className="sf-cats-circle-name">{cat.name}</span>
            </Link>
          </li>
        ))}
      </ul>
    );
  } else if (variant === "pills") {
    body = (
      <ul className="sf-cats-pills">
        {list.map((cat) => (
          <li key={cat.id}>
            <Link href={`/categorias/${cat.slug}`} className="sf-cats-pill">
              <span className="sf-cats-pill-media"><Media src={cat.imageUrl} name={cat.name} /></span>
              <span>{cat.name}</span>
              <Arrow size={16} />
            </Link>
          </li>
        ))}
      </ul>
    );
  } else if (variant === "list") {
    body = (
      <ol className="sf-cats-list">
        {list.map((cat, i) => (
          <li key={cat.id}>
            <Link href={`/categorias/${cat.slug}`} className="sf-cats-row">
              <span className="sf-cats-row-n" aria-hidden="true">{String(i + 1).padStart(2, "0")}</span>
              <span className="sf-cats-row-name">{cat.name}</span>
              <span className="sf-cats-row-peek" aria-hidden="true"><Media src={cat.imageUrl} name={cat.name} /></span>
              <span className="sf-cats-row-go" aria-hidden="true"><Arrow dir="up-right" size={22} /></span>
            </Link>
          </li>
        ))}
      </ol>
    );
  } else if (variant === "mosaic") {
    body = (
      <div className="sf-cats-mosaic" data-count={list.length}>
        {list.map((cat) => (
          <Link key={cat.id} href={`/categorias/${cat.slug}`} className="sf-cats-cell">
            <Media src={cat.imageUrl} name={cat.name} className="sf-cats-cell-img" />
            <span className="sf-cats-cell-copy">
              <span className="sf-cats-cell-name">{cat.name}</span>
              <span className="sf-cats-cell-cta">Ver <Arrow size={14} /></span>
            </span>
          </Link>
        ))}
      </div>
    );
  } else {
    body = (
      <div className="sf-cats-tiles">
        {list.map((cat) => (
          <Link key={cat.id} href={`/categorias/${cat.slug}`} className="sf-cats-tile">
            <span className="sf-cats-tile-media"><Media src={cat.imageUrl} name={cat.name} /></span>
            <span className="sf-cats-tile-name">
              {cat.name}
              <Arrow size={16} />
            </span>
          </Link>
        ))}
      </div>
    );
  }

  return (
    <section className={`sf-section sf-cats sf-cats--${variant}`}>
      <div className="sf-wrap">
        <SectionHead title={title} align={variant === "circles" || variant === "pills" ? "center" : "split"} />
        {body}
      </div>
    </section>
  );
}
