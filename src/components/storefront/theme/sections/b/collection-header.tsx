import Link from "next/link";
import { listBanners } from "@/modules/catalog/queries";
import { str, type CollectionData, type SectionProps } from "../../types";

function Crumbs({ data }: { data: CollectionData }) {
  const { active, all } = data;
  const parent = active?.parentId ? all.find((c) => c.id === active.parentId) ?? null : null;
  return (
    <nav className="sf-crumbs sf-ch-crumbs" aria-label="Ruta">
      <Link href="/">Inicio</Link><span aria-hidden="true">/</span>
      {active || data.q ? <Link href="/productos">Productos</Link> : <span>Productos</span>}
      {parent ? <><span aria-hidden="true">/</span><Link href={`/categorias/${parent.slug}`}>{parent.name}</Link></> : null}
      {active ? <><span aria-hidden="true">/</span><span aria-current="page">{active.name}</span></> : null}
    </nav>
  );
}

const countLabel = (n: number) => (n === 1 ? "1 producto" : `${n.toLocaleString("es-MX")} productos`);

export async function CollectionHeaderSection({ ctx, section, collection: data }: SectionProps) {
  if (!data) return null;
  const variant = section.variant ?? "simple";
  const { active, q } = data;
  const title = active ? active.name : q ? `Resultados para “${q}”` : "Productos";
  const description = active?.description ?? "";
  const eyebrow = str(section.settings, "eyebrow", "Catálogo");
  const total = data.list.total;

  if (variant === "banner") {
    // Banner de categoría que enlaza a esta categoría; si no, su imagen; si no, la de respaldo.
    let cover = "";
    let bannerTitle = "";
    let bannerSub = "";
    if (active) {
      const banners = await listBanners(ctx.site.id, "category");
      const b = banners.find((x) => x.linkUrl === `/categorias/${active.slug}`);
      if (b) { cover = b.imageUrl; bannerTitle = b.title; bannerSub = b.subtitle ?? ""; }
      cover = cover || active.imageUrl || "";
    }
    cover = cover || str(section.settings, "image");
    return (
      <section className="sf-ch sf-ch--banner">
        <div className="sf-wrap">
          <Crumbs data={data} />
          <div className={`sf-ch-banner${cover ? "" : " sf-ph"}`}>
            {cover ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={cover} alt="" />
            ) : null}
            <div className="sf-ch-banner-copy">
              {eyebrow ? <div className="sf-ch-eyebrow">{eyebrow}</div> : null}
              <h1 className="sf-h1">{bannerTitle || title}</h1>
              {bannerSub || description ? <p className="sf-lead">{bannerSub || description}</p> : null}
            </div>
          </div>
        </div>
      </section>
    );
  }

  if (variant === "bigtype") {
    return (
      <section className="sf-ch sf-ch--bigtype">
        <div className="sf-wrap">
          <Crumbs data={data} />
          <div className="sf-ch-big">
            <h1 className="sf-ch-bigtitle">
              {title}
              <sup className="sf-ch-count">{total}</sup>
            </h1>
            <div className="sf-ch-big-meta">
              {eyebrow ? <div className="sf-eyebrow">{eyebrow}</div> : null}
              {description ? <p className="sf-lead">{description}</p> : <p className="sf-lead">{countLabel(total)}</p>}
            </div>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="sf-ch sf-ch--simple">
      <div className="sf-wrap">
        <Crumbs data={data} />
        <div className="sf-ch-simple">
          {eyebrow ? <div className="sf-eyebrow">{eyebrow}</div> : null}
          <h1 className="sf-h2">{title}</h1>
          {description ? <p className="sf-lead">{description}</p> : null}
          <span className="sf-ch-meta">{countLabel(total)}</span>
        </div>
      </div>
    </section>
  );
}
