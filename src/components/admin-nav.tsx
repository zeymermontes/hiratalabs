"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

export type NavItem = { href: string; label: string; icon: IconName };
type IconName = "sites" | "modules" | "requests" | "ai" | "mcp" | "usage" | "guide";

function Icon({ name }: { name: IconName }) {
  const common = {
    width: 18, height: 18, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor",
    strokeWidth: 2, strokeLinecap: "round" as const, strokeLinejoin: "round" as const, "aria-hidden": true,
  };
  switch (name) {
    case "sites":
      return <svg {...common}><path d="M3 9l9-6 9 6v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /><path d="M9 22V12h6v10" /></svg>;
    case "modules":
      return <svg {...common}><rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" /><rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" /></svg>;
    case "requests":
      return <svg {...common}><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /></svg>;
    case "ai":
      return <svg {...common}><path d="M12 3l1.8 4.6L18.5 9l-4.7 1.4L12 15l-1.8-4.6L5.5 9l4.7-1.4z" /><path d="M19 16l.8 2 2 .8-2 .8-.8 2-.8-2-2-.8 2-.8z" /></svg>;
    case "mcp":
      return <svg {...common}><path d="M9 17H7a4 4 0 0 1 0-8h2" /><path d="M15 7h2a4 4 0 0 1 0 8h-2" /><path d="M8 12h8" /></svg>;
    case "usage":
      return <svg {...common}><path d="M12 20V10" /><path d="M18 20V4" /><path d="M6 20v-4" /></svg>;
    case "guide":
      return <svg {...common}><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" /><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" /></svg>;
  }
}

/**
 * Barra lateral del panel. En pantallas chicas se vuelve una barra superior con
 * un botón que despliega el menú.
 */
export function AdminNav({
  items, email, roleLabel, rootDomain, signOut,
}: {
  items: NavItem[];
  email: string;
  roleLabel: string;
  rootDomain: string;
  signOut: () => Promise<void>;
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  // Cierra el menú al navegar.
  useEffect(() => { setOpen(false); }, [pathname]);

  function isActive(href: string) {
    if (href === "/") return pathname === "/" || pathname.startsWith("/sites");
    return pathname === href || pathname.startsWith(`${href}/`);
  }

  const links = (
    <ul className="flex flex-col gap-1">
      {items.map((n) => (
        <li key={n.href}>
          <Link
            href={n.href}
            className={`flex min-h-11 items-center gap-2.5 rounded-lg px-3 text-sm font-medium transition ${
              isActive(n.href)
                ? "bg-purple text-white"
                : "text-neutral-200 hover:bg-neutral-700 hover:text-white"
            }`}
          >
            <Icon name={n.icon} />
            {n.label}
          </Link>
        </li>
      ))}
    </ul>
  );

  const footer = (
    <div className="border-t border-neutral-700 pt-4 text-xs">
      <div className="truncate font-semibold text-white">{email}</div>
      <div className="mt-0.5 flex items-center justify-between gap-2 text-neutral-400">
        <span>{roleLabel} · {rootDomain}</span>
        <form action={signOut}>
          <button className="min-h-8 font-semibold text-lime hover:underline">Salir</button>
        </form>
      </div>
    </div>
  );

  return (
    <>
      {/* Escritorio */}
      <aside className="hidden w-60 shrink-0 flex-col bg-ink p-4 text-cream lg:flex lg:min-h-screen lg:sticky lg:top-0 lg:h-screen">
        <Link href="/" className="mb-6 flex items-center gap-2.5 px-2 pt-1">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo-wordmark-cream.svg" alt="Hirata Labs" width={110} height={24} className="h-5 w-auto" />
          <span className="h-4 w-px bg-neutral-600" aria-hidden="true" />
          <span className="text-[11px] font-bold uppercase tracking-[0.12em] text-lime">Plataforma</span>
        </Link>
        <nav aria-label="Principal" className="flex-1">{links}</nav>
        {footer}
      </aside>

      {/* Móvil */}
      <div className="sticky top-0 z-30 bg-ink text-cream lg:hidden">
        <div className="flex items-center justify-between px-4 py-3">
          <Link href="/" className="flex items-center gap-2.5">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo-wordmark-cream.svg" alt="Hirata Labs" width={96} height={22} className="h-5 w-auto" />
          </Link>
          <button
            type="button"
            aria-expanded={open}
            aria-controls="mobile-nav"
            aria-label={open ? "Cerrar menú" : "Abrir menú"}
            onClick={() => setOpen((v) => !v)}
            className="flex h-11 w-11 items-center justify-center rounded-lg text-cream hover:bg-neutral-700"
          >
            {open ? (
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" /></svg>
            ) : (
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><path d="M4 7h16M4 12h16M4 17h16" /></svg>
            )}
          </button>
        </div>
        {open ? (
          <div id="mobile-nav" className="border-t border-neutral-700 px-4 pb-4 pt-3">
            <nav aria-label="Principal">{links}</nav>
            <div className="mt-4">{footer}</div>
          </div>
        ) : null}
      </div>
    </>
  );
}
