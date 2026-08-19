import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { env } from "@/lib/env";
import { signOut } from "@/app/login/actions";

const NAV = [
  { href: "/", label: "Sitios" },
  { href: "/ai", label: "Llaves de IA" },
  { href: "/usage", label: "Consumo" },
  { href: "/guide", label: "Guía para IA" },
];

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await requireAdmin();

  return (
    <div className="min-h-screen">
      <header className="border-b border-neutral-200 bg-white">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-6 gap-y-3 px-6 py-3">
          <Link href="/" className="flex items-center gap-2.5">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo-wordmark.svg" alt="Hirata Labs" width={96} height={24} className="h-5 w-auto" />
            <span className="h-4 w-px bg-neutral-300" aria-hidden="true" />
            <span className="text-sm font-medium tracking-tight text-neutral-700">Landings</span>
          </Link>

          <nav className="flex items-center gap-1">
            {NAV.map((n) => (
              <Link
                key={n.href}
                href={n.href}
                className="rounded-lg px-2.5 py-1.5 text-sm text-neutral-600 transition hover:bg-neutral-100 hover:text-neutral-900"
              >
                {n.label}
              </Link>
            ))}
          </nav>

          <div className="ml-auto flex items-center gap-3">
            <span className="hidden text-xs text-neutral-400 sm:inline">{env.rootDomain}</span>
            <span className="text-xs text-neutral-500">{user.email}</span>
            <form
              action={async () => {
                "use server";
                await signOut();
              }}
            >
              <button className="text-xs text-neutral-400 underline-offset-2 hover:text-neutral-700 hover:underline">
                Salir
              </button>
            </form>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-8">{children}</main>
    </div>
  );
}
