"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export function Tabs({ base, items }: { base: string; items: { href: string; label: string }[] }) {
  const pathname = usePathname();

  return (
    <nav className="mb-6 flex flex-wrap gap-1 border-b border-neutral-200">
      {items.map((t) => {
        const href = `${base}${t.href}`;
        const active = pathname === href || (t.href === "" && pathname === base);
        return (
          <Link
            key={t.href}
            href={href}
            className={`-mb-px border-b-2 px-3 py-2 text-sm font-medium transition ${
              active ? "border-neutral-900 text-neutral-900" : "border-transparent text-neutral-500 hover:text-neutral-800"
            }`}
          >
            {t.label}
          </Link>
        );
      })}
    </nav>
  );
}
