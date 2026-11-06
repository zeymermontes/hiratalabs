import Link from "next/link";
import type { StorefrontContext } from "@/lib/storefront";

/* Piezas compartidas por las secciones de la parte A. Sin hooks: sirven en servidor y cliente. */

export type NavLink = { href: string; label: string };

/** Enlaces de la tienda según los módulos activos. */
export function storeLinks(modules: Set<string> | string[]): NavLink[] {
  const has = (k: string) => (Array.isArray(modules) ? modules.includes(k) : modules.has(k));
  const out: NavLink[] = [];
  if (has("catalog")) out.push({ href: "/productos", label: "Productos" });
  if (has("branches")) out.push({ href: "/sucursales", label: "Sucursales" });
  if (has("faq")) out.push({ href: "/preguntas-frecuentes", label: "Preguntas" });
  out.push({ href: "/contacto", label: "Contacto" });
  return out;
}

export const isInternal = (href: string) => href.startsWith("/") && !href.startsWith("//");

/** Enlace que decide solo: interno con next/link, ancla tal cual, externo en pestaña nueva. */
export function SmartLink({
  href, className, children, ...rest
}: { href: string; className?: string; children: React.ReactNode } & Omit<React.AnchorHTMLAttributes<HTMLAnchorElement>, "href">) {
  if (isInternal(href)) return <Link href={href} className={className} {...rest}>{children}</Link>;
  if (href.startsWith("#") || href.startsWith("tel:") || href.startsWith("mailto:")) {
    return <a href={href} className={className} {...rest}>{children}</a>;
  }
  return <a href={href} className={className} target="_blank" rel="noreferrer" {...rest}>{children}</a>;
}

/** Botón de la sección (texto + enlace); sin texto no se pinta. */
export function SectionButton({ label, href, variant = "primary", className = "" }: { label: string; href: string; variant?: "primary" | "outline"; className?: string }) {
  if (!label) return null;
  return (
    <SmartLink href={href || "/productos"} className={`sf-btn sf-btn-${variant} ${className}`.trim()}>
      {label}
    </SmartLink>
  );
}

/** Imagen o, si no hay, una forma de respaldo (nunca una imagen rota). */
export function Media({ src, alt = "", className = "", eager = false, label }: { src: string; alt?: string; className?: string; eager?: boolean; label?: string }) {
  if (!src) {
    return (
      <div className={`sf-ph ${className}`.trim()} role={label ? "img" : undefined} aria-label={label} aria-hidden={label ? undefined : true}>
        <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.3" aria-hidden="true"><rect x="3" y="4" width="18" height="16" rx="2" /><circle cx="9" cy="10" r="2" /><path d="M21 16l-5-5-9 9" /></svg>
      </div>
    );
  }
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={src} alt={alt} className={className || undefined} loading={eager ? "eager" : "lazy"} decoding="async" />;
}

/** Saltos de línea del textarea como <br/>; *texto* se vuelve énfasis (cursiva). */
export function RichLine({ text, emphasizeLast = false }: { text: string; emphasizeLast?: boolean }) {
  const lines = text.split(/\n+/);
  const hasMarks = /\*[^*]+\*/.test(text);
  return (
    <>
      {lines.map((line, li) => {
        let parts: React.ReactNode[];
        if (hasMarks) {
          parts = line.split(/(\*[^*]+\*)/).map((p, i) => (p.startsWith("*") && p.endsWith("*") && p.length > 2 ? <em key={i}>{p.slice(1, -1)}</em> : p));
        } else if (emphasizeLast && li === lines.length - 1) {
          // Sin marcas: la última palabra va en cursiva, el gesto editorial de siempre.
          const m = line.match(/^(.*\s)?(\S+?)([.!?,;:…]*)$/);
          parts = m ? [m[1] ?? "", <em key="e">{m[2]}</em>, m[3]] : [line];
        } else {
          parts = [line];
        }
        return (
          <span key={li} className="sf-line">
            {parts}
            {li < lines.length - 1 ? <br /> : null}
          </span>
        );
      })}
    </>
  );
}

/** Párrafos separados por línea en blanco. */
export function Paragraphs({ text, className }: { text: string; className?: string }) {
  if (!text) return null;
  return (
    <>
      {text.split(/\n\s*\n/).map((p, i) => <p key={i} className={className}>{p}</p>)}
    </>
  );
}

export const SOCIAL_LABEL: Record<string, string> = {
  instagram: "Instagram", facebook: "Facebook", x: "X", linkedin: "LinkedIn", tiktok: "TikTok",
  youtube: "YouTube", threads: "Threads", pinterest: "Pinterest", github: "GitHub", telegram: "Telegram",
};

export function brandOf(ctx: StorefrontContext) {
  return { name: ctx.config.brandName, logo: ctx.design.doc.settings.logoUrl ?? "" };
}

/* ------------------------------------------------------------ íconos */

type IconName = "search" | "user" | "bag" | "menu" | "close" | "arrow" | "phone" | "chat" | "mail" | "pin" | "play";
const PATHS: Record<IconName, React.ReactNode> = {
  search: <><circle cx="11" cy="11" r="7" /><path d="M20 20l-3.5-3.5" /></>,
  user: <><circle cx="12" cy="8" r="4" /><path d="M4 21a8 8 0 0 1 16 0" /></>,
  bag: <><path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" /><path d="M3 6h18" /><path d="M16 10a4 4 0 0 1-8 0" /></>,
  menu: <path d="M4 7h16M4 12h16M4 17h16" />,
  close: <path d="M6 6l12 12M18 6L6 18" />,
  arrow: <path d="M5 12h14M13 6l6 6-6 6" />,
  phone: <path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1.9.4 1.8.7 2.7a2 2 0 0 1-.5 2.1L8 9.8a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.7.7a2 2 0 0 1 1.7 2z" />,
  chat: <path d="M21 11.5a8.4 8.4 0 0 1-12.3 7.4L3 21l2.1-5.6A8.4 8.4 0 1 1 21 11.5z" />,
  mail: <><rect x="3" y="5" width="18" height="14" rx="2" /><path d="M3 7l9 6 9-6" /></>,
  pin: <><path d="M12 22s7-6.2 7-12a7 7 0 0 0-14 0c0 5.8 7 12 7 12z" /><circle cx="12" cy="10" r="2.5" /></>,
  play: <path d="M8 5v14l11-7z" />,
};

export function Icon({ name, size = 20 }: { name: IconName; size?: number }) {
  return (
    <svg aria-hidden="true" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      {PATHS[name]}
    </svg>
  );
}
