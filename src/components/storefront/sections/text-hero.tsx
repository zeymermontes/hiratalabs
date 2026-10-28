import Link from "next/link";

export type TextHeroProps = {
  eyebrow?: string;
  title: string;
  intro?: string;
  imageUrl?: string;
  primary?: { label: string; href: string } | null;
  secondary?: { label: string; href: string } | null;
};

function Btn({ label, href, cls }: { label: string; href: string; cls: string }) {
  const internal = href.startsWith("/") && !href.startsWith("//");
  return internal
    ? <Link href={href} className={`sf-btn ${cls}`}>{label}</Link>
    : <a href={href} className={`sf-btn ${cls}`} target="_blank" rel="noreferrer">{label}</a>;
}

/** Hero de texto: el de siempre cuando no hay banners. */
export function TextHero({ eyebrow, title, intro, imageUrl, primary, secondary }: TextHeroProps) {
  return (
    <section className="sf-hero">
      <div className="sf-hero-copy sf-reveal">
        {eyebrow ? <div className="sf-eyebrow">{eyebrow}</div> : null}
        <h1>{title}</h1>
        {intro ? <p>{intro}</p> : null}
        {primary || secondary ? (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 12 }}>
            {primary ? <Btn label={primary.label} href={primary.href} cls="sf-btn-primary" /> : null}
            {secondary ? <Btn label={secondary.label} href={secondary.href} cls="sf-btn-outline" /> : null}
          </div>
        ) : null}
      </div>
      <div className="sf-hero-media sf-reveal" aria-hidden="true">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        {imageUrl ? <img src={imageUrl} alt="" /> : null}
      </div>
    </section>
  );
}
