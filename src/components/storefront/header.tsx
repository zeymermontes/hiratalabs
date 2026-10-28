"use client";

import Link from "next/link";
import { useState } from "react";

type NavLink = { href: string; label: string };

/**
 * Cabecera del storefront. Los enlaces dependen de los módulos activos; el
 * carrito y la cuenta aparecen solo cuando existen sus módulos.
 */
export function StoreHeader({
  brandName, logoUrl, modules, cartCount = 0,
}: {
  brandName: string;
  logoUrl: string | null;
  modules: string[];
  cartCount?: number;
}) {
  const [open, setOpen] = useState(false);
  const has = (k: string) => modules.includes(k);

  const links: NavLink[] = [];
  if (has("catalog")) links.push({ href: "/productos", label: "Productos" });
  if (has("branches")) links.push({ href: "/sucursales", label: "Sucursales" });
  if (has("faq")) links.push({ href: "/preguntas-frecuentes", label: "Preguntas" });
  links.push({ href: "/contacto", label: "Contacto" });

  return (
    <header className="sf-header">
      <div className="sf-wrap sf-header-row">
        <Link href="/" className="sf-brand" aria-label={brandName}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          {logoUrl ? <img src={logoUrl} alt="" /> : null}
          <span>{brandName}</span>
        </Link>

        <nav className="sf-nav" aria-label="Tienda">
          {links.map((l) => <Link key={l.href} href={l.href}>{l.label}</Link>)}
        </nav>

        <div className="sf-icons">
          {has("customers") ? (
            <Link href="/mi-cuenta" className="sf-iconbtn" aria-label="Mi cuenta">
              <svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="8" r="4" /><path d="M4 21a8 8 0 0 1 16 0" /></svg>
            </Link>
          ) : null}
          {has("orders") ? (
            <Link href="/carrito" className="sf-iconbtn" aria-label={`Carrito, ${cartCount} artículos`}>
              <svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" /><path d="M3 6h18" /><path d="M16 10a4 4 0 0 1-8 0" /></svg>
              {cartCount > 0 ? <span className="sf-badge">{cartCount}</span> : null}
            </Link>
          ) : null}
          <button
            type="button"
            className="sf-iconbtn sf-menu-btn"
            aria-expanded={open}
            aria-controls="sf-mobile-nav"
            aria-label={open ? "Cerrar menú" : "Abrir menú"}
            onClick={() => setOpen((v) => !v)}
          >
            {open ? (
              <svg aria-hidden="true" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M6 6l12 12M18 6L6 18" /></svg>
            ) : (
              <svg aria-hidden="true" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M4 7h16M4 12h16M4 17h16" /></svg>
            )}
          </button>
        </div>
      </div>
      {open ? (
        <nav id="sf-mobile-nav" className="sf-wrap sf-mobile-nav" aria-label="Tienda">
          {links.map((l) => <Link key={l.href} href={l.href} onClick={() => setOpen(false)}>{l.label}</Link>)}
        </nav>
      ) : null}
    </header>
  );
}
