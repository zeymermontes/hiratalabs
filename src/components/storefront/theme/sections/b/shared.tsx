import Link from "next/link";
import type { CSSProperties, ReactNode } from "react";

/** Enlace que decide solo: interno con <Link>, externo en pestaña nueva. */
export function SmartLink({ href, className, children, ariaLabel }: { href: string; className?: string; children: ReactNode; ariaLabel?: string }) {
  if (href.startsWith("/") || href.startsWith("#")) {
    return <Link href={href} className={className} aria-label={ariaLabel}>{children}</Link>;
  }
  const external = /^https?:\/\//i.test(href) || href.startsWith("mailto:") || href.startsWith("tel:");
  if (!external) return <Link href={`/${href.replace(/^\/+/, "")}`} className={className} aria-label={ariaLabel}>{children}</Link>;
  return (
    <a href={href} className={className} aria-label={ariaLabel} target={href.startsWith("http") ? "_blank" : undefined} rel="noreferrer">
      {children}
    </a>
  );
}

/** Encabezado de sección: etiqueta, título, texto y enlace “Ver todo”. */
export function SectionHead({
  eyebrow, title, subtitle, more, align = "split", as: Tag = "h2",
}: {
  eyebrow?: string; title?: string; subtitle?: string; more?: { href: string; label: string } | null;
  align?: "split" | "center"; as?: "h1" | "h2";
}) {
  if (!title && !subtitle && !eyebrow && !more) return null;
  return (
    <div className={`sf-bhead sf-bhead--${align}`}>
      <div className="sf-bhead-copy">
        {eyebrow ? <div className="sf-eyebrow">{eyebrow}</div> : null}
        {title ? <Tag className="sf-h2">{title}</Tag> : null}
        {subtitle ? <p className="sf-lead">{subtitle}</p> : null}
      </div>
      {more ? (
        <Link href={more.href} className="sf-bhead-more">
          {more.label} <Arrow />
        </Link>
      ) : null}
    </div>
  );
}

export function Arrow({ dir = "right", size = 16 }: { dir?: "right" | "left" | "up-right"; size?: number }) {
  const d = dir === "left" ? "M19 12H5m6-6-6 6 6 6" : dir === "up-right" ? "M7 17 17 7M9 7h8v8" : "M5 12h14m-6-6 6 6-6 6";
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={d} />
    </svg>
  );
}

/** Columnas en escritorio como variable CSS (--cols). */
export function colsStyle(value: string, fallback = 4): CSSProperties {
  const n = Math.min(5, Math.max(2, Number(value) || fallback));
  return { "--cols": String(n) } as CSSProperties;
}

/** JSON-LD seguro para incrustar en <script>. */
export function JsonLd({ data }: { data: unknown }) {
  const json = JSON.stringify(data).replace(/</g, "\\u003c");
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: json }} />;
}
