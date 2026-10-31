import { listBanners, listCategories } from "@/modules/catalog/queries";
import { HeroCarousel } from "@/components/storefront/sections/hero-carousel";
import type { SectionProps } from "../../types";
import { str } from "../../types";
import { Icon, Media, RichLine, SectionButton, SmartLink } from "./shared";

type Cfg = Record<string, unknown>;
type HeroData = {
  eyebrow: string;
  title: string;
  subtitle: string;
  primary: { label: string; href: string } | null;
  secondary: { label: string; href: string } | null;
  image: string;
  shape: "rect" | "arch" | "circle" | "blob";
  height: "auto" | "tall" | "screen";
  align: "left" | "center";
  overlay: number;
};

const pick = <T extends string>(v: string, allowed: readonly T[], d: T): T => ((allowed as readonly string[]).includes(v) ? (v as T) : d);

function heroData(s: Cfg, ctx: SectionProps["ctx"]): HeroData {
  const { config, modules } = ctx;
  const primaryLabel = str(s, "primaryLabel");
  const secondaryLabel = str(s, "secondaryLabel");
  const ov = Number(s.overlay);
  return {
    eyebrow: str(s, "eyebrow"),
    title: str(s, "title") || config.custom.tagline || `Bienvenido a ${config.brandName}`,
    subtitle: str(s, "subtitle") || config.custom.intro || "",
    primary: primaryLabel
      ? { label: primaryLabel, href: str(s, "primaryHref") || "/productos" }
      : modules.has("catalog") ? { label: "Ver productos", href: "/productos" } : null,
    secondary: secondaryLabel ? { label: secondaryLabel, href: str(s, "secondaryHref") || "/contacto" } : null,
    image: str(s, "image") || config.custom.heroImage || "",
    shape: pick(str(s, "shape"), ["rect", "arch", "circle", "blob"] as const, "rect"),
    height: pick(str(s, "height"), ["auto", "tall", "screen"] as const, "auto"),
    align: pick(str(s, "align"), ["left", "center"] as const, "left"),
    overlay: Number.isFinite(ov) ? Math.min(80, Math.max(0, ov)) : 35,
  };
}

function Buttons({ d, invert = false }: { d: HeroData; invert?: boolean }) {
  if (!d.primary && !d.secondary) return null;
  return (
    <div className="sf-hero-btns">
      {d.primary ? <SectionButton label={d.primary.label} href={d.primary.href} /> : null}
      {d.secondary ? <SectionButton label={d.secondary.label} href={d.secondary.href} variant="outline" className={invert ? "sf-hero-btn-inv" : ""} /> : null}
    </div>
  );
}

function Copy({ d, h = "h1", emphasizeLast = false, invert = false }: { d: HeroData; h?: "h1" | "h2"; emphasizeLast?: boolean; invert?: boolean }) {
  const H = h;
  return (
    <div className="sf-hero-copy2">
      {d.eyebrow ? <p className="sf-eyebrow sf-hero-eyebrow">{d.eyebrow}</p> : null}
      <H className="sf-h1 sf-hero-title"><RichLine text={d.title} emphasizeLast={emphasizeLast} /></H>
      {d.subtitle ? <p className="sf-lead sf-hero-sub">{d.subtitle}</p> : null}
      <Buttons d={d} invert={invert} />
    </div>
  );
}

function ShapedMedia({ d, className = "" }: { d: HeroData; className?: string }) {
  return (
    <div className={`sf-hero-frame sf-shape--${d.shape} ${className}`.trim()}>
      <Media src={d.image} eager className="sf-hero-img" />
    </div>
  );
}

/* ------------------------------------------------------------- variantes */

function Split({ d }: { d: HeroData }) {
  return (
    <section className="sf-hero2 sf-hero--split" data-height={d.height} data-align={d.align}>
      <div className="sf-wrap sf-hero-split-grid">
        <Copy d={d} />
        <ShapedMedia d={d} />
      </div>
    </section>
  );
}

function Fullbleed({ d }: { d: HeroData }) {
  return (
    <section className="sf-hero2 sf-hero--fullbleed" data-height={d.height} data-align={d.align} data-has-image={Boolean(d.image)}>
      <div className="sf-hero-bg" aria-hidden="true">
        {d.image ? <Media src={d.image} eager className="sf-hero-img" /> : <div className="sf-ph sf-hero-bg-ph" />}
      </div>
      {d.image ? <div className="sf-hero-shade" style={{ "--sf-ov": d.overlay / 100 } as React.CSSProperties} aria-hidden="true" /> : null}
      <div className="sf-wrap sf-hero-fb-inner">
        <Copy d={d} invert={Boolean(d.image)} />
      </div>
    </section>
  );
}

function Editorial({ d }: { d: HeroData }) {
  const shape = d.shape === "rect" ? "arch" : d.shape;
  return (
    <section className="sf-hero2 sf-hero--editorial" data-height={d.height} data-align={d.align}>
      <div className="sf-wrap">
        {d.eyebrow ? <p className="sf-hero-ed-eyebrow"><span aria-hidden="true" />{d.eyebrow}</p> : null}
        <h1 className="sf-hero-ed-title"><RichLine text={d.title} emphasizeLast /></h1>
        <div className="sf-hero-ed-row">
          <div className="sf-hero-ed-copy">
            {d.subtitle ? <p className="sf-lead">{d.subtitle}</p> : null}
            <Buttons d={d} />
          </div>
          <ShapedMedia d={{ ...d, shape }} className="sf-hero-ed-media" />
        </div>
      </div>
    </section>
  );
}

function TypeHero({ d, uid }: { d: HeroData; uid: string }) {
  // La última línea (o la última palabra) va con contorno.
  const lines = d.title.split(/\n+/).filter(Boolean);
  let solid = lines.slice(0, -1).join(" ");
  let outline = lines[lines.length - 1] ?? "";
  if (lines.length === 1) {
    const words = outline.split(/\s+/);
    if (words.length > 1) {
      outline = words.pop() ?? "";
      solid = words.join(" ");
    }
  }
  const badge = d.primary;
  return (
    <section className="sf-hero2 sf-hero--type" data-height={d.height} data-align={d.align}>
      <div className="sf-wrap">
        {d.eyebrow ? <p className="sf-eyebrow sf-hero-eyebrow">{d.eyebrow}</p> : null}
        <h1 className="sf-hero-type-title">
          {solid ? <span className="sf-hero-type-solid">{solid}</span> : null}
          <span className="sf-hero-type-outline">{outline}</span>
        </h1>
        <div className="sf-hero-type-foot">
          {d.subtitle ? <p className="sf-lead">{d.subtitle}</p> : <span />}
          <div className="sf-hero-type-actions">
            <Buttons d={d} />
            {badge ? (
              <SmartLink href={badge.href} className="sf-hero-badge" aria-label={badge.label}>
                <svg viewBox="0 0 120 120" aria-hidden="true">
                  <defs><path id={`sf-hc-${uid}`} d="M60,60 m-46,0 a46,46 0 1,1 92,0 a46,46 0 1,1 -92,0" /></defs>
                  <text><textPath href={`#sf-hc-${uid}`} textLength="286" lengthAdjust="spacing">{`${badge.label} · ${badge.label} · `.toUpperCase()}</textPath></text>
                </svg>
                <span className="sf-hero-badge-icon"><Icon name="arrow" size={22} /></span>
              </SmartLink>
            ) : null}
          </div>
        </div>
      </div>
    </section>
  );
}

type Tile = { eyebrow: string; title: string; subtitle: string; image: string; href: string };

function Bento({ d, tiles }: { d: HeroData; tiles: Tile[] }) {
  return (
    <section className="sf-hero2 sf-hero--bento" data-height={d.height}>
      <div className="sf-wrap">
        <div className="sf-bento" data-count={tiles.length}>
          {tiles.map((t, i) => {
            const inner = (
              <>
                <Media src={t.image} eager={i === 0} className="sf-bento-img" />
                <span className="sf-bento-copy">
                  {t.eyebrow ? <span className="sf-bento-eyebrow">{t.eyebrow}</span> : null}
                  {t.title ? (i === 0 ? <span className="sf-bento-title sf-h2 sf-display"><RichLine text={t.title} /></span> : <span className="sf-bento-title sf-h3 sf-display">{t.title}</span>) : null}
                  {t.subtitle ? <span className="sf-bento-sub">{t.subtitle}</span> : null}
                  {t.href ? <span className="sf-bento-go" aria-hidden="true"><Icon name="arrow" size={18} /></span> : null}
                </span>
              </>
            );
            const cls = `sf-bento-tile${t.image ? " sf-bento-tile--img" : ""}`;
            return t.href ? (
              <SmartLink key={i} href={t.href} className={cls}>{inner}</SmartLink>
            ) : (
              <div key={i} className={cls}>{inner}</div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

/** Portada principal: seis variantes con los mismos ajustes. */
export async function Hero({ ctx, section }: SectionProps) {
  const d = heroData(section.settings, ctx);
  const variant = section.variant ?? "split";

  if (variant === "carousel") {
    let banners: Awaited<ReturnType<typeof listBanners>> = [];
    try {
      banners = await listBanners(ctx.site.id, "hero");
    } catch {
      banners = [];
    }
    if (banners.length === 0) return <Split d={d} />;
    return (
      <section className="sf-hero2 sf-hero--carousel">
        <div className="sf-wrap">
          <HeroCarousel
            slides={banners.map((b) => ({
              id: b.id, title: b.title, subtitle: b.subtitle, imageUrl: b.imageUrl, mobileImageUrl: b.mobileImageUrl,
              linkUrl: b.linkUrl, ctaLabel: b.ctaLabel,
            }))}
          />
        </div>
      </section>
    );
  }

  if (variant === "bento") {
    const tiles: Tile[] = (section.blocks ?? [])
      .filter((b) => b.type === "tile")
      .map((b) => ({
        eyebrow: str(b.settings, "eyebrow"), title: str(b.settings, "title"), subtitle: str(b.settings, "subtitle"),
        image: str(b.settings, "image"), href: str(b.settings, "href"),
      }))
      .filter((t) => t.title || t.image);
    const fromBlocks = tiles.length > 0;
    if (!fromBlocks) {
      // Sin mosaicos: el principal sale de los ajustes y el resto de las categorías.
      tiles.push({ eyebrow: d.eyebrow, title: d.title, subtitle: d.subtitle, image: d.image, href: d.primary?.href ?? "" });
      if (ctx.modules.has("catalog")) {
        try {
          const { tree } = await listCategories(ctx.site.id);
          for (const c of tree.slice(0, 3)) tiles.push({ eyebrow: "Categoría", title: c.name, subtitle: "", image: c.imageUrl ?? "", href: `/categorias/${c.slug}` });
        } catch {
          /* sin categorías: queda solo el mosaico principal */
        }
      }
    }
    if (!fromBlocks && tiles.length === 1) return <Split d={d} />;
    return <Bento d={d} tiles={tiles.slice(0, 4)} />;
  }

  if (variant === "fullbleed") return <Fullbleed d={d} />;
  if (variant === "editorial") return <Editorial d={d} />;
  if (variant === "type") return <TypeHero d={d} uid={section.id.replace(/[^a-zA-Z0-9_-]/g, "")} />;
  return <Split d={d} />;
}
