import Link from "next/link";
import type { StorefrontContext } from "@/lib/storefront";
import type { HomeSection } from "@/modules/catalog/schema";
import { listBanners, listCategories, listProducts } from "@/modules/catalog/queries";
import { ProductCard } from "@/components/storefront/product-card";
import { HeroCarousel } from "./hero-carousel";
import { TextHero } from "./text-hero";

type Cfg = Record<string, unknown>;
const s = (c: Cfg, k: string) => (typeof c[k] === "string" ? (c[k] as string).trim() : "");
const n = (c: Cfg, k: string, d: number) => (Number.isFinite(Number(c[k])) && Number(c[k]) > 0 ? Number(c[k]) : d);

function SectionShell({ title, more, children }: { title?: string | null; more?: { href: string; label: string }; children: React.ReactNode }) {
  return (
    <section className="sf-section sf-reveal">
      {title || more ? (
        <div className="sf-section-head">
          {title ? <h2>{title}</h2> : <span />}
          {more ? <Link href={more.href} className="sf-link">{more.label} →</Link> : null}
        </div>
      ) : null}
      {children}
    </section>
  );
}

/* ----------------------------------------------------------- secciones */

export async function HeroBanners({ ctx, section }: { ctx: StorefrontContext; section: Pick<HomeSection, "config"> }) {
  const c = section.config as Cfg;
  const slides = await listBanners(ctx.site.id, "hero");
  if (slides.length > 0) {
    return (
      <div style={{ paddingTop: 16 }}>
        <HeroCarousel
          autoplayMs={c.autoplayMs === 0 ? 0 : n(c, "autoplayMs", 6000)}
          slides={slides.map((b) => ({
            id: b.id, title: b.title, subtitle: b.subtitle, imageUrl: b.imageUrl, mobileImageUrl: b.mobileImageUrl,
            linkUrl: b.linkUrl, ctaLabel: b.ctaLabel,
          }))}
        />
      </div>
    );
  }
  return <DefaultTextHero ctx={ctx} override={c} />;
}

/** Hero de texto con los datos del sitio; la sección puede sobreescribir cada parte. */
export function DefaultTextHero({ ctx, override = {} }: { ctx: StorefrontContext; override?: Cfg }) {
  const { config, modules } = ctx;
  const primaryLabel = s(override, "primaryLabel");
  const secondaryLabel = s(override, "secondaryLabel");
  const primary = primaryLabel
    ? { label: primaryLabel, href: s(override, "primaryHref") || "/productos" }
    : modules.has("catalog") ? { label: "Ver productos", href: "/productos" } : null;
  const secondary = secondaryLabel
    ? { label: secondaryLabel, href: s(override, "secondaryHref") || "/contacto" }
    : config.whatsappHref ? { label: "Escribir por WhatsApp", href: config.whatsappHref } : { label: "Contacto", href: "/contacto" };
  return (
    <TextHero
      eyebrow={config.address || undefined}
      title={s(override, "title") || config.custom.tagline || `Bienvenido a ${config.brandName}`}
      intro={s(override, "subtitle") || config.custom.intro || undefined}
      imageUrl={s(override, "imageUrl") || config.custom.heroImage || undefined}
      primary={primary}
      secondary={secondary}
    />
  );
}

export async function FeaturedProducts({ ctx, section }: { ctx: StorefrontContext; section: Pick<HomeSection, "config" | "title"> }) {
  const c = section.config as Cfg;
  const limit = n(c, "limit", 8);
  const featuredOnly = s(c, "source") !== "newest";
  let { items } = await listProducts(ctx.site.id, { status: "active", featured: featuredOnly ? true : undefined, limit });
  // Sin destacados aún: enseña los más nuevos para que la portada no quede vacía.
  if (items.length === 0 && featuredOnly) ({ items } = await listProducts(ctx.site.id, { status: "active", limit }));
  if (items.length === 0) return null;
  return (
    <SectionShell title={section.title ?? "Destacados"} more={{ href: "/productos", label: "Ver todo" }}>
      <div className="sf-grid">{items.map((p) => <ProductCard key={p.id} product={p} />)}</div>
    </SectionShell>
  );
}

export async function ProductCarousel({ ctx, section }: { ctx: StorefrontContext; section: Pick<HomeSection, "config" | "title"> }) {
  const c = section.config as Cfg;
  const { items } = await listProducts(ctx.site.id, {
    status: "active", limit: n(c, "limit", 12),
    featured: s(c, "source") === "featured" ? true : undefined,
    categorySlug: s(c, "categorySlug") || undefined,
  });
  if (items.length === 0) return null;
  const slug = s(c, "categorySlug");
  return (
    <SectionShell title={section.title} more={{ href: slug ? `/categorias/${slug}` : "/productos", label: "Ver todo" }}>
      <div className="sf-row">{items.map((p) => <ProductCard key={p.id} product={p} />)}</div>
    </SectionShell>
  );
}

export async function CategoryGrid({ ctx, section }: { ctx: StorefrontContext; section: Pick<HomeSection, "config" | "title"> }) {
  const c = section.config as Cfg;
  const { tree } = await listCategories(ctx.site.id);
  const list = tree.slice(0, n(c, "limit", 6));
  if (list.length === 0) return null;
  return (
    <SectionShell title={section.title ?? "Categorías"}>
      <div className="sf-cat-grid">
        {list.map((cat) => (
          <Link key={cat.id} href={`/categorias/${cat.slug}`} className={`sf-cat-card${cat.imageUrl ? "" : " sf-cat-card-text"}`}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            {cat.imageUrl ? <img src={cat.imageUrl} alt="" loading="lazy" /> : null}
            <span>{cat.name}</span>
          </Link>
        ))}
      </div>
    </SectionShell>
  );
}

export async function BannerStrip({ ctx, section }: { ctx: StorefrontContext; section: Pick<HomeSection, "title"> }) {
  const list = await listBanners(ctx.site.id, "strip");
  if (list.length === 0) return null;
  return (
    <SectionShell title={section.title}>
      <div className="sf-strip">
        {list.map((b) => {
          const inner = (
            <>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={b.imageUrl} alt={b.title} loading="lazy" />
              <div className="sf-strip-copy"><strong>{b.title}</strong>{b.subtitle ? <span>{b.subtitle}</span> : null}</div>
            </>
          );
          if (!b.linkUrl) return <div key={b.id} className="sf-strip-item">{inner}</div>;
          return b.linkUrl.startsWith("/")
            ? <Link key={b.id} href={b.linkUrl} className="sf-strip-item">{inner}</Link>
            : <a key={b.id} href={b.linkUrl} className="sf-strip-item" target="_blank" rel="noreferrer">{inner}</a>;
        })}
      </div>
    </SectionShell>
  );
}

export function CtaBand({ ctx, section }: { ctx: StorefrontContext; section: Pick<HomeSection, "config" | "title"> }) {
  const c = section.config as Cfg;
  const title = s(c, "title") || section.title;
  if (!title) return null;
  const label = s(c, "buttonLabel");
  const href = s(c, "buttonHref") || ctx.config.whatsappHref || "/contacto";
  return (
    <section className="sf-section sf-reveal">
      <div className="sf-cta">
        <div>
          <h2>{title}</h2>
          {s(c, "subtitle") ? <p>{s(c, "subtitle")}</p> : null}
        </div>
        {label ? (
          href.startsWith("/")
            ? <Link href={href} className="sf-btn">{label}</Link>
            : <a href={href} className="sf-btn" target="_blank" rel="noreferrer">{label}</a>
        ) : null}
      </div>
    </section>
  );
}

/** Quita lo que puede ejecutar código; lo demás se inserta tal cual. */
export function sanitizeHtml(html: string): string {
  return html
    .replace(/<\s*(script|iframe|object|embed|style|link|meta|base|form)[^>]*>[\s\S]*?<\s*\/\s*\1\s*>/gi, "")
    .replace(/<\s*(script|iframe|object|embed|style|link|meta|base|form)[^>]*\/?>/gi, "")
    .replace(/\son[a-z]+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, "")
    .replace(/(href|src|xlink:href)\s*=\s*("|')\s*javascript:[^"']*\2/gi, '$1=$2#$2');
}

export function CustomHtml({ section }: { section: Pick<HomeSection, "config" | "title"> }) {
  const html = s(section.config as Cfg, "html");
  if (!html) return null;
  return (
    <SectionShell title={section.title}>
      <div className="sf-html" dangerouslySetInnerHTML={{ __html: sanitizeHtml(html) }} />
    </SectionShell>
  );
}

/* ---------------------------------------------------------------- render */

export function HomeSectionView({ ctx, section }: { ctx: StorefrontContext; section: HomeSection }) {
  switch (section.type) {
    case "hero_banners": return <HeroBanners ctx={ctx} section={section} />;
    case "featured_products": return <FeaturedProducts ctx={ctx} section={section} />;
    case "category_grid": return <CategoryGrid ctx={ctx} section={section} />;
    case "banner_strip": return <BannerStrip ctx={ctx} section={section} />;
    case "cta_band": return <CtaBand ctx={ctx} section={section} />;
    case "carousel": return <ProductCarousel ctx={ctx} section={section} />;
    case "custom_html": return <CustomHtml section={section} />;
    default: return null;
  }
}
