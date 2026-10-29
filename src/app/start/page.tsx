import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { env } from "@/lib/env";
import { TEMPLATES } from "@/lib/theme";
import { signupOpen } from "./actions";
import { StartForm } from "./start-form";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Crea tu tienda — Hirata Labs",
  robots: { index: true, follow: true },
};

export default async function StartPage() {
  const user = await getSessionUser();
  if (user) redirect("/");
  const open = await signupOpen();

  return (
    <main className="min-h-screen bg-ink text-cream">
      <div className="mx-auto flex max-w-5xl flex-col gap-10 px-5 py-10 sm:px-8 lg:py-16">
        <header className="flex flex-wrap items-center justify-between gap-4">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo-wordmark-cream.svg" alt="Hirata Labs" width={130} height={28} className="h-6 w-auto" />
          <a href="/login" className="text-sm font-semibold text-neutral-300 hover:text-white">Ya tengo tienda → entrar</a>
        </header>

        <div className="grid gap-10 lg:grid-cols-[1fr_420px] lg:items-start">
          <div className="flex flex-col gap-5">
            <div className="font-mono text-xs text-lime">tienda en línea · lista en minutos</div>
            <h1 className="font-display text-6xl leading-[0.95] sm:text-7xl">
              Tu tienda,<br />con tu marca,<br /><span className="text-lime">hoy mismo.</span>
            </h1>
            <p className="max-w-md text-base leading-relaxed text-neutral-300">
              Catálogo, carrito, pagos con Mercado Pago y envíos listos. Eliges una plantilla, pones tus colores y
              publicas en <span className="font-mono text-cream">tu-tienda.{env.rootDomain}</span> o en tu propio dominio.
            </p>
            <ul className="grid gap-2 text-sm text-neutral-300 sm:grid-cols-2">
              {[
                "Sin contraseñas: entras con un enlace a tu correo",
                "Plantillas con animaciones, responsivas de fábrica",
                "Asistente de IA para redactar tus productos",
                "Extras cuando los necesites: gift cards, personalización…",
              ].map((t) => (
                <li key={t} className="flex items-start gap-2"><span className="mt-0.5 text-lime">✓</span>{t}</li>
              ))}
            </ul>
          </div>

          <StartForm
            open={open}
            rootDomain={env.rootDomain}
            templates={TEMPLATES.map((t) => ({ key: t.key, name: t.name, description: t.description, tags: t.tags, colors: t.defaults.colors, display: t.defaults.fonts.display ?? "serif" }))}
          />
        </div>
      </div>
    </main>
  );
}
