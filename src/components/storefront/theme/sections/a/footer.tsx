import Link from "next/link";
import { env } from "@/lib/env";
import type { SectionProps } from "../../types";
import { bool, str } from "../../types";
import { Icon, SOCIAL_LABEL, brandOf, type NavLink } from "./shared";

/** Pie de página: marca, contacto, enlaces según módulos, redes y el sello de la plataforma. */
export function Footer({ ctx, section }: SectionProps) {
  const s = section.settings;
  const variant = section.variant ?? "columns";
  const { config, modules } = ctx;
  const brand = brandOf(ctx);
  const tagline = str(s, "tagline") || config.custom.tagline || "";
  const year = new Date().getFullYear();

  const shop: NavLink[] = [];
  if (modules.has("catalog")) shop.push({ href: "/productos", label: "Productos" });
  if (modules.has("gift_cards")) shop.push({ href: "/gift-cards", label: "Gift cards" });
  if (modules.has("branches")) shop.push({ href: "/sucursales", label: "Sucursales" });
  const help: NavLink[] = [];
  if (modules.has("faq")) help.push({ href: "/preguntas-frecuentes", label: "Preguntas frecuentes" });
  help.push({ href: "/contacto", label: "Contacto" });
  help.push({ href: "/aviso-privacidad", label: "Aviso de privacidad" });

  const contact = [
    config.address ? { key: "pin", href: config.addressHref, label: config.address, icon: "pin" as const, ext: true } : null,
    config.phoneHref ? { key: "tel", href: config.phoneHref, label: config.phone, icon: "phone" as const, ext: false } : null,
    config.whatsappHref ? { key: "wa", href: config.whatsappHref, label: "WhatsApp", icon: "chat" as const, ext: true } : null,
    config.emailHref ? { key: "mail", href: config.emailHref, label: config.email, icon: "mail" as const, ext: false } : null,
  ].filter((c): c is NonNullable<typeof c> => c !== null);

  const socials = bool(s, "showSocial", true) ? Object.entries(config.socials).filter(([, v]) => v) : [];

  const contactList = contact.length > 0 ? (
    <ul className="sf-ftr-contact">
      {contact.map((c) => (
        <li key={c.key}>
          <a href={c.href} {...(c.ext ? { target: "_blank", rel: "noreferrer" } : {})}><Icon name={c.icon} size={16} /><span>{c.label}</span></a>
        </li>
      ))}
    </ul>
  ) : null;

  const socialList = socials.length > 0 ? (
    <ul className="sf-ftr-social" aria-label="Redes sociales">
      {socials.map(([k, v]) => <li key={k}><a href={v} target="_blank" rel="noreferrer">{SOCIAL_LABEL[k] ?? k}</a></li>)}
    </ul>
  ) : null;

  const linkList = (list: NavLink[], label?: string) => (
    <ul className="sf-ftr-links" aria-label={label}>
      {list.map((l) => <li key={l.href}><Link href={l.href}>{l.label}</Link></li>)}
    </ul>
  );

  const powered = config.poweredBy ? (
    <a className="sf-powered sf-ftr-powered" href={`https://${env.rootDomain}`} target="_blank" rel="noreferrer">
      Tienda hecha con {env.platformName}
    </a>
  ) : null;

  const bottom = (
    <div className="sf-ftr-bottom">
      <span>© {year} {brand.name}</span>
      {powered}
    </div>
  );

  const logo = brand.logo ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img className="sf-ftr-logo" src={brand.logo} alt={brand.name} loading="lazy" />
  ) : (
    <strong className="sf-ftr-brand sf-display">{brand.name}</strong>
  );

  if (variant === "minimal") {
    return (
      <footer className="sf-ftr sf-ftr--minimal">
        <div className="sf-wrap sf-ftr-row">
          <Link href="/" className="sf-ftr-brand sf-display">{brand.name}</Link>
          <nav aria-label="Pie de página" className="sf-ftr-inline">
            {[...shop, ...help].map((l) => <Link key={l.href} href={l.href}>{l.label}</Link>)}
            {socials.map(([k, v]) => <a key={k} href={v} target="_blank" rel="noreferrer">{SOCIAL_LABEL[k] ?? k}</a>)}
          </nav>
          <div className="sf-ftr-row-end">
            <span>© {year}</span>
            {powered}
          </div>
        </div>
      </footer>
    );
  }

  if (variant === "centered") {
    return (
      <footer className="sf-ftr sf-ftr--centered">
        <div className="sf-wrap sf-ftr-center">
          {logo}
          {tagline ? <p className="sf-ftr-tagline">{tagline}</p> : null}
          <nav aria-label="Pie de página" className="sf-ftr-inline">
            {[...shop, ...help].map((l) => <Link key={l.href} href={l.href}>{l.label}</Link>)}
          </nav>
          {contactList}
          {socialList}
          {bottom}
        </div>
      </footer>
    );
  }

  if (variant === "bigbrand") {
    return (
      <footer className="sf-ftr sf-ftr--bigbrand">
        <div className="sf-wrap">
          <div className="sf-ftr-bb-top">
            <div className="sf-ftr-bb-intro">
              {tagline ? <p className="sf-ftr-tagline sf-display">{tagline}</p> : null}
              {contactList}
            </div>
            <div className="sf-ftr-bb-cols">
              <div><p className="sf-ftr-title">Tienda</p>{linkList([...shop, ...help.slice(0, 1)], "Tienda")}</div>
              <div><p className="sf-ftr-title">Ayuda</p>{linkList(help.slice(1), "Ayuda")}</div>
              {socialList ? <div><p className="sf-ftr-title">Síguenos</p>{socialList}</div> : null}
            </div>
          </div>
        </div>
        <div className="sf-ftr-giant" aria-hidden="true" style={{ "--sf-n": Math.max(brand.name.length, 4) } as React.CSSProperties}>
          <span className="sf-display">{brand.name}</span>
        </div>
        <div className="sf-wrap">{bottom}</div>
      </footer>
    );
  }

  // columns
  return (
    <footer className="sf-ftr sf-ftr--columns">
      <div className="sf-wrap">
        <div className="sf-ftr-grid">
          <div className="sf-ftr-about">
            {logo}
            {tagline ? <p className="sf-ftr-tagline">{tagline}</p> : null}
            {socialList}
          </div>
          {shop.length > 0 ? <div><p className="sf-ftr-title">Tienda</p>{linkList(shop, "Tienda")}</div> : null}
          <div><p className="sf-ftr-title">Ayuda</p>{linkList(help, "Ayuda")}</div>
          {contactList ? <div><p className="sf-ftr-title">Contacto</p>{contactList}</div> : null}
        </div>
        {bottom}
      </div>
    </footer>
  );
}
