"use client";

import Link from "next/link";
import { useEffect, useId, useRef, useState } from "react";
import { Icon, type NavLink } from "./shared";

export type HeaderVariant = "classic" | "centered" | "minimal" | "search" | "pill" | "transparent";

type Props = {
  variant: HeaderVariant;
  brand: { name: string; logo: string };
  links: NavLink[];
  categories: NavLink[];
  sticky: boolean;
  showSearch: boolean;
  menuLabel: string;
  account: boolean;
  /** null cuando la tienda no tiene carrito. */
  cartCount: number | null;
  contact: { phone: string; phoneHref: string; whatsappHref: string };
  /** Alto del logo en px; null deja el tamaño de cada variante. */
  logoSize?: number | null;
};

function Logo({ brand }: { brand: Props["brand"] }) {
  return (
    <Link href="/" className="sf-hdr-logo" aria-label={`${brand.name}, inicio`}>
      {brand.logo ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={brand.logo} alt="" />
      ) : (
        <span className="sf-display">{brand.name}</span>
      )}
    </Link>
  );
}

function SearchForm({ big = false, id, autoFocus = false }: { big?: boolean; id: string; autoFocus?: boolean }) {
  return (
    <form action="/productos" method="get" role="search" className={`sf-hdr-search${big ? " sf-hdr-search--big" : ""}`}>
      <label htmlFor={id} className="sf-sr">Buscar productos</label>
      <Icon name="search" size={big ? 20 : 18} />
      <input id={id} name="q" type="search" placeholder="¿Qué estás buscando?" autoComplete="off" autoFocus={autoFocus} />
      <button type="submit" className="sf-hdr-search-go">Buscar</button>
    </form>
  );
}

/**
 * Encabezado de la tienda en sus seis variantes. Todas comparten el menú de
 * celular (panel o pantalla completa), la búsqueda desplegable y Escape para cerrar.
 */
export function HeaderClient(p: Props) {
  const { variant } = p;
  const uid = useId().replace(/[^a-zA-Z0-9_-]/g, "");
  const panelId = `sf-hdr-panel-${uid}`;
  const searchId = `sf-hdr-q-${uid}`;
  const [open, setOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [solid, setSolid] = useState(false);
  const menuBtn = useRef<HTMLButtonElement>(null);
  const closeBtn = useRef<HTMLButtonElement>(null);

  // Escape cierra lo que esté abierto y regresa el foco al botón.
  useEffect(() => {
    if (!open && !searchOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      setOpen(false);
      setSearchOpen(false);
      menuBtn.current?.focus();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, searchOpen]);

  // Transparente: se vuelve sólido después de ~40 px de scroll.
  useEffect(() => {
    if (variant !== "transparent") return;
    const onScroll = () => setSolid(window.scrollY > 40);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [variant]);

  // Menú a pantalla completa: bloquea el scroll de atrás y enfoca el botón de cerrar.
  useEffect(() => {
    if (variant !== "minimal" || !open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeBtn.current?.focus();
    return () => { document.body.style.overflow = prev; };
  }, [variant, open]);

  // Al pasar a escritorio el panel de celular se cierra solo.
  useEffect(() => {
    if (variant === "minimal" || !open) return;
    const mq = window.matchMedia("(min-width: 768px)");
    const onChange = () => { if (mq.matches) setOpen(false); };
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, [variant, open]);

  const close = () => setOpen(false);
  const allLinks = [...p.links, ...p.categories];

  const accountIcon = p.account ? (
    <Link href="/mi-cuenta" className="sf-iconbtn sf-hdr-account" aria-label="Mi cuenta"><Icon name="user" /></Link>
  ) : null;
  const cartIcon = p.cartCount !== null ? (
    <Link href="/carrito" className="sf-iconbtn" aria-label={`Carrito, ${p.cartCount} ${p.cartCount === 1 ? "artículo" : "artículos"}`}>
      <Icon name="bag" />
      {p.cartCount > 0 ? <span className="sf-badge">{p.cartCount > 99 ? "99+" : p.cartCount}</span> : null}
    </Link>
  ) : null;
  const searchToggle = p.showSearch && variant !== "search" ? (
    <button
      type="button"
      className="sf-iconbtn sf-hdr-search-toggle"
      aria-label={searchOpen ? "Cerrar búsqueda" : "Buscar"}
      aria-expanded={searchOpen}
      onClick={() => { setSearchOpen((v) => !v); setOpen(false); }}
    >
      <Icon name={searchOpen ? "close" : "search"} />
    </button>
  ) : null;
  const burger = (
    <button
      ref={menuBtn}
      type="button"
      className={variant === "minimal" ? "sf-hdr-menubtn" : "sf-iconbtn sf-hdr-burger"}
      aria-expanded={open}
      aria-controls={panelId}
      aria-label={variant === "minimal" ? undefined : open ? "Cerrar menú" : "Abrir menú"}
      onClick={() => { setOpen((v) => !v); setSearchOpen(false); }}
    >
      {variant === "minimal" ? (
        <>
          <span className="sf-hdr-menubtn-lines" aria-hidden="true"><i /><i /></span>
          <span>{p.menuLabel}</span>
        </>
      ) : (
        <Icon name={open ? "close" : "menu"} size={22} />
      )}
    </button>
  );

  const nav = (list: NavLink[], cls = "sf-hdr-nav") =>
    list.length > 0 ? (
      <nav className={cls} aria-label="Principal">
        {list.map((l) => <Link key={l.href} href={l.href}>{l.label}</Link>)}
      </nav>
    ) : null;

  /* ------------------------------------------------- filas por variante */
  let bar: React.ReactNode;
  if (variant === "centered") {
    const half = Math.ceil(p.links.length / 2);
    bar = (
      <>
        <div className="sf-wrap sf-hdr-bar sf-hdr-bar--centered">
          <div className="sf-hdr-side sf-hdr-side--start">
            {burger}
            {nav(p.links.slice(0, half))}
          </div>
          <Logo brand={p.brand} />
          <div className="sf-hdr-side sf-hdr-side--end">
            {nav(p.links.slice(half))}
            <div className="sf-hdr-actions">{searchToggle}{accountIcon}{cartIcon}</div>
          </div>
        </div>
        {p.categories.length > 0 ? (
          <div className="sf-hdr-catrow sf-hdr-catrow--centered">
            <div className="sf-wrap">{nav(p.categories, "sf-hdr-cats")}</div>
          </div>
        ) : null}
      </>
    );
  } else if (variant === "minimal") {
    bar = (
      <div className="sf-wrap sf-hdr-bar sf-hdr-bar--minimal">
        <Logo brand={p.brand} />
        <div className="sf-hdr-actions">{searchToggle}{cartIcon}{burger}</div>
      </div>
    );
  } else if (variant === "search") {
    const hasContact = p.contact.whatsappHref || p.contact.phoneHref;
    bar = (
      <>
        <div className="sf-hdr-util">
          <div className="sf-wrap sf-hdr-util-row">
            <span className="sf-hdr-util-msg">
              {hasContact ? (
                <>
                  ¿Dudas?{" "}
                  {p.contact.whatsappHref ? (
                    <a href={p.contact.whatsappHref} target="_blank" rel="noreferrer">Escríbenos por WhatsApp</a>
                  ) : (
                    <a href={p.contact.phoneHref}>Llámanos al {p.contact.phone}</a>
                  )}
                </>
              ) : "Te ayudamos a encontrar lo que buscas"}
            </span>
            {nav(p.links.filter((l) => l.href !== "/productos"), "sf-hdr-util-nav")}
          </div>
        </div>
        <div className="sf-wrap sf-hdr-bar sf-hdr-bar--search">
          {burger}
          <Logo brand={p.brand} />
          {p.showSearch ? <div className="sf-hdr-bigsearch"><SearchForm big id={`${searchId}-big`} /></div> : <span className="sf-hdr-grow" />}
          <div className="sf-hdr-actions">{accountIcon}{cartIcon}</div>
        </div>
        {p.categories.length > 0 || p.links[0]?.href === "/productos" ? (
          <div className="sf-hdr-catrow">
            <div className="sf-wrap">
              <nav className="sf-hdr-cats sf-hdr-cats--scroll" aria-label="Categorías">
                {p.links[0]?.href === "/productos" ? <Link href="/productos" className="sf-hdr-cat-all">Todo</Link> : null}
                {p.categories.map((l) => <Link key={l.href} href={l.href}>{l.label}</Link>)}
              </nav>
            </div>
          </div>
        ) : null}
      </>
    );
  } else {
    // classic, pill y transparent comparten la fila: logo, menú y acciones.
    bar = (
      <div className={`sf-wrap sf-hdr-bar sf-hdr-bar--${variant}`}>
        <Logo brand={p.brand} />
        {nav(allLinks)}
        <div className="sf-hdr-actions">{searchToggle}{accountIcon}{cartIcon}{burger}</div>
      </div>
    );
  }

  /* --------------------------------------------- menú de celular / overlay */
  const panel = variant === "minimal" ? (
    <div id={panelId} className="sf-hdr-overlay" data-open={open} hidden={!open} role="dialog" aria-modal="true" aria-label="Menú">
      <div className="sf-wrap sf-hdr-overlay-top">
        <Logo brand={p.brand} />
        <button ref={closeBtn} type="button" className="sf-hdr-menubtn" onClick={() => { close(); menuBtn.current?.focus(); }}>
          <span className="sf-hdr-menubtn-lines" data-x="true" aria-hidden="true"><i /><i /></span>
          <span>Cerrar</span>
        </button>
      </div>
      <div className="sf-wrap sf-hdr-overlay-body">
        <nav className="sf-hdr-huge" aria-label="Principal">
          {p.links.map((l, i) => (
            <Link key={l.href} href={l.href} onClick={close} style={{ "--i": i } as React.CSSProperties}>
              <span className="sf-hdr-huge-n" aria-hidden="true">{String(i + 1).padStart(2, "0")}</span>
              <span className="sf-display">{l.label}</span>
            </Link>
          ))}
        </nav>
        <div className="sf-hdr-overlay-aside">
          {p.categories.length > 0 ? (
            <div>
              <p className="sf-eyebrow">Categorías</p>
              <nav className="sf-hdr-overlay-cats" aria-label="Categorías">
                {p.categories.map((l) => <Link key={l.href} href={l.href} onClick={close}>{l.label}</Link>)}
              </nav>
            </div>
          ) : null}
          {p.account ? <Link href="/mi-cuenta" className="sf-hdr-overlay-link" onClick={close}><Icon name="user" /> Mi cuenta</Link> : null}
          {p.contact.whatsappHref ? <a href={p.contact.whatsappHref} target="_blank" rel="noreferrer" className="sf-hdr-overlay-link"><Icon name="chat" /> WhatsApp</a> : null}
        </div>
      </div>
    </div>
  ) : (
    <div id={panelId} className="sf-hdr-panel" hidden={!open}>
      <div className="sf-wrap sf-hdr-panel-inner">
        {p.showSearch && variant !== "search" ? <SearchForm id={`${searchId}-m`} /> : null}
        <nav className="sf-hdr-panel-nav" aria-label="Principal">
          {p.links.map((l) => <Link key={l.href} href={l.href} onClick={close}>{l.label}<Icon name="arrow" size={18} /></Link>)}
        </nav>
        {p.categories.length > 0 ? (
          <>
            <p className="sf-eyebrow">Categorías</p>
            <nav className="sf-hdr-panel-cats" aria-label="Categorías">
              {p.categories.map((l) => <Link key={l.href} href={l.href} onClick={close}>{l.label}</Link>)}
            </nav>
          </>
        ) : null}
        {p.account ? <Link href="/mi-cuenta" className="sf-hdr-panel-account" onClick={close}><Icon name="user" /> Mi cuenta</Link> : null}
      </div>
    </div>
  );

  return (
    <header
      className={`sf-hdr sf-hdr--${variant}`}
      data-sticky={p.sticky}
      data-solid={variant === "transparent" ? solid || open || searchOpen : undefined}
      data-open={open}
      style={p.logoSize ? ({ "--sf-logo-h": `${p.logoSize}px`, "--sf-logo-w": `${p.logoSize * 5}px` } as React.CSSProperties) : undefined}
    >
      <div className="sf-hdr-shell">
        {bar}
        {p.showSearch && variant !== "search" ? (
          <div className="sf-hdr-searchbar" hidden={!searchOpen}>
            <div className="sf-wrap">{searchOpen ? <SearchForm big id={searchId} autoFocus /> : null}</div>
          </div>
        ) : null}
        {variant !== "minimal" ? panel : null}
      </div>
      {variant === "minimal" ? panel : null}
    </header>
  );
}
