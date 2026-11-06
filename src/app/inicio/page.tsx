import type { Metadata } from "next";
import { headers } from "next/headers";
import { signupOpen } from "@/app/start/actions";
import { demoUrl } from "@/themes/demo";
import { THEME_TEMPLATES } from "@/themes/templates";
import { TEMPLATE_CATEGORIES } from "@/themes/types";
import { HeroShowcase } from "./hero-showcase";
import { PORTFOLIO } from "./portfolio";
import { SiteHeader } from "./site-header";
import { TemplateGallery, type GalleryTemplate } from "./template-gallery";
import "./inicio.css";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Tiendas en línea y sitios a la medida — Hirata Labs",
  description: "Crea tu tienda en línea con una de nuestras plantillas, cobra con Mercado Pago y edítala sin código. ¿Necesitas algo más? Lo construimos a la medida.",
  robots: { index: true, follow: true },
  openGraph: {
    title: "Tu tienda en línea, con tu marca, lista hoy — Hirata Labs",
    description: "Plantillas para cada giro, pagos con Mercado Pago y editor visual. También sitios web y software a la medida.",
    images: [{ url: "/plantillas/neon-escritorio.webp", width: 960, height: 1800 }],
    type: "website",
  },
};

const WHATSAPP = "525659128915";
const EMAIL = "contacto@hiratalabs.com";
const wa = (text: string) => `https://wa.me/${WHATSAPP}?text=${encodeURIComponent(text)}`;

const HERO_SLIDES = ["neon", "lumen", "mercado", "cava", "circuito"];

// Orden pensado para la rejilla de 4 columnas: grande+2 | 4 chicas | grande+2.
const FEATURES: { title: string; text: string; icon: keyof typeof ICONS; big?: boolean }[] = [
  { title: "Editor visual, sin código", text: "Mueve secciones, cambia colores y tipografías viendo tu tienda en celular y en escritorio. Publicas cuando quede como quieres.", icon: "editor", big: true },
  { title: "Cobra con Mercado Pago", text: "Tarjetas y más medios de pago, directo a tu cuenta.", icon: "card" },
  { title: "Catálogo completo", text: "Variantes, categorías, ofertas, inventario y productos personalizables.", icon: "box" },
  { title: "Pedidos y clientes", text: "Carrito, cuentas de cliente, historial de pedidos y avisos por correo.", icon: "bag" },
  { title: "Asistente de IA", text: "Te ayuda a escribir descripciones y textos de tu tienda.", icon: "sparkle" },
  { title: "Tu propio dominio", text: "tutienda.com, o empieza con tutienda.hiratalabs.com y conéctalo después.", icon: "globe" },
  { title: "WhatsApp a la mano", text: "Tus clientes te escriben desde la tienda con un toque.", icon: "chat" },
  { title: "Se ve perfecto en celular", text: "Cada plantilla está pensada primero para el teléfono, que es donde compran tus clientes.", icon: "phone", big: true },
  { title: "Versiones guardadas", text: "Cada cambio que publicas queda guardado; regresa a uno anterior con un clic.", icon: "history" },
  { title: "Tu equipo dentro", text: "Invita a quien te ayuda con productos y pedidos, cada quien con su acceso.", icon: "team" },
];

const SERVICES = ["Páginas web y landings", "Software a la medida", "Apps móviles", "Automatización de procesos", "Integraciones y APIs", "Dashboards y reportes", "Agentes de IA"];

const FAQ: [string, string][] = [
  ["¿Necesito saber programar?", "No. Eliges una plantilla, subes tus productos y ajustas el diseño desde un editor visual. Todo con clics."],
  ["¿Puedo cambiar de plantilla después?", "Sí, cuando quieras. Tus productos, pedidos y clientes se quedan igual; solo cambia cómo se ve la tienda."],
  ["¿Cómo recibo los pagos?", "Conectas tu cuenta de Mercado Pago y el dinero de cada venta llega directo a ella."],
  ["¿Puedo usar mi propio dominio?", "Sí. Puedes empezar con tutienda.hiratalabs.com y conectar tu dominio cuando lo tengas."],
  ["¿Y si necesito algo que la tienda no hace?", "Para eso está el servicio a la medida: diseñamos y programamos tu sitio, sistema o integración desde cero."],
  ["¿Cuánto cuesta?", "Depende de lo que necesites. Escríbenos por WhatsApp y te mandamos una propuesta clara, sin letras chiquitas."],
];

export default async function InicioPage() {
  const h = await headers();
  const requestHost = h.get("x-forwarded-host") ?? h.get("host");
  const open = await signupOpen();

  const primaryCta = open
    ? { href: "/start", label: "Crea tu tienda" }
    : { href: wa("Hola, quiero abrir mi tienda en línea con Hirata Labs."), label: "Pide tu tienda", external: true };

  const templates: GalleryTemplate[] = THEME_TEMPLATES.map((t) => {
    const base = t.doc.settings.schemes.base;
    return {
      key: t.key, name: t.name, description: t.description, category: t.category, categoryLabel: TEMPLATE_CATEGORIES[t.category],
      tags: t.tags, highlights: t.highlights,
      styles: t.styles.map((s) => {
        const sb = { ...base, ...(s.schemes?.base ?? {}) };
        return { name: s.name, colors: [sb.bg, sb.primary, sb.accent] };
      }),
      demoUrl: demoUrl(t.key, requestHost),
      startUrl: open ? `/start?plantilla=${t.key}` : wa(`Hola, quiero mi tienda con la plantilla ${t.name}.`),
    };
  });
  const categories = Object.entries(TEMPLATE_CATEGORIES).filter(([k]) => templates.some((t) => t.category === k));
  const slides = HERO_SLIDES.map((k) => THEME_TEMPLATES.find((t) => t.key === k)!).map((t) => ({
    key: t.key, name: t.name, giro: t.tags[0], demoUrl: demoUrl(t.key, requestHost),
  }));
  const giros = [...new Set(THEME_TEMPLATES.flatMap((t) => t.tags.slice(0, 2)))];

  return (
    <div className="ld overflow-x-hidden bg-ink text-cream">
      <SiteHeader cta={primaryCta} />

      {/* ------------------------------------------------------------ hero */}
      <section id="inicio" className="relative -mt-[68px] pt-[68px]">
        <div className="ld-grid-bg pointer-events-none absolute inset-0" aria-hidden="true" />
        <div className="relative mx-auto grid max-w-7xl gap-14 px-4 pb-24 pt-10 sm:px-8 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)] lg:items-center lg:pb-32 lg:pt-16">
          <div className="flex min-w-0 flex-col gap-7">
            <p className="ld-rise font-mono text-xs uppercase tracking-[0.18em] text-lime">Tiendas en línea · Sitios a la medida</p>
            <h1 className="ld-rise ld-rise-2 font-display text-[clamp(64px,10vw,132px)] leading-[0.86] tracking-wide">
              Tu tienda en línea,<br />con tu marca,<br /><span className="text-lime">lista hoy.</span>
            </h1>
            <p className="ld-rise ld-rise-3 max-w-xl text-lg leading-relaxed text-cream/80">
              Elige una de {THEME_TEMPLATES.length} plantillas hechas para tu giro, sube tus productos y cobra con Mercado Pago.
              ¿Necesitas algo más grande? Lo construimos a la medida.
            </p>
            <div className="ld-rise ld-rise-4 flex flex-wrap gap-3">
              <a href={primaryCta.href} {...(primaryCta.external ? { target: "_blank", rel: "noreferrer" } : {})}
                className="inline-flex min-h-14 items-center gap-2 rounded-full bg-lime px-7 text-base font-bold text-ink shadow-[0_6px_0_#3e5a05] transition hover:-translate-y-0.5 hover:bg-[#a8c93a] active:translate-y-0.5 active:shadow-[0_2px_0_#3e5a05]">
                {primaryCta.label} <span aria-hidden="true">→</span>
              </a>
              <a href="#plantillas" className="inline-flex min-h-14 items-center rounded-full border border-cream/30 px-7 text-base font-semibold text-cream transition hover:border-cream hover:bg-white/5">
                Ver plantillas
              </a>
            </div>
            <ul className="ld-rise ld-rise-4 flex flex-wrap gap-x-6 gap-y-2 font-mono text-xs text-cream/70">
              <li className="flex items-center gap-2"><Dot />Sin código</li>
              <li className="flex items-center gap-2"><Dot />Pagos con Mercado Pago</li>
              <li className="flex items-center gap-2"><Dot />Celular y escritorio</li>
            </ul>
          </div>
          <div className="ld-rise ld-rise-3 min-w-0 lg:pl-4">
            <HeroShowcase slides={slides} />
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------ giros */}
      <div className="overflow-hidden border-y-2 border-ink bg-lime py-4 text-ink" aria-label="Giros para los que hay plantilla">
        <div className="ld-marquee font-display text-4xl tracking-wide sm:text-5xl">
          {[0, 1].map((n) => (
            <div key={n} className="flex shrink-0 items-center" aria-hidden={n === 1}>
              {giros.map((g) => <span key={g} className="flex items-center whitespace-nowrap px-5">{g}<span className="ml-10 text-purple">✺</span></span>)}
            </div>
          ))}
        </div>
      </div>

      {/* ---------------------------------------------- dos productos */}
      <section className="ld-light bg-cream text-ink">
        <div className="mx-auto max-w-7xl px-4 py-24 sm:px-8">
          <div className="ld-reveal mb-12 max-w-3xl">
            <p className="font-mono text-xs uppercase tracking-[0.18em] text-purple">Dos formas de vender más</p>
            <h2 className="mt-3 font-display text-[clamp(44px,6vw,80px)] leading-[0.9] tracking-wide">Empieza hoy con una tienda. Crece con un sitio hecho para ti.</h2>
          </div>
          <div className="grid gap-6 lg:grid-cols-2">
            <article className="ld-reveal flex flex-col gap-6 rounded-3xl bg-ink p-8 text-cream sm:p-10">
              <span className="w-fit rounded-full bg-lime px-3 py-1 font-mono text-[11px] font-semibold uppercase tracking-wider text-ink">Lista en minutos</span>
              <h3 className="font-display text-5xl leading-none tracking-wide sm:text-6xl">Tienda en línea</h3>
              <p className="text-cream/80">Para negocios que quieren vender ya: eliges plantilla, subes productos y compartes tu liga.</p>
              <ul className="space-y-3 text-sm">
                {["17 plantillas para distintos giros, con 3 estilos de color cada una", "Carrito, pagos con Mercado Pago y pedidos", "Editor visual con vista en celular y escritorio", "Tu dominio o tutienda.hiratalabs.com"].map((x) => (
                  <li key={x} className="flex gap-3"><Check className="text-lime" />{x}</li>
                ))}
              </ul>
              <div className="mt-auto flex flex-wrap gap-3 pt-2">
                <a href={primaryCta.href} {...(primaryCta.external ? { target: "_blank", rel: "noreferrer" } : {})} className="inline-flex min-h-12 items-center rounded-full bg-lime px-6 font-bold text-ink transition hover:bg-[#a8c93a]">{primaryCta.label}</a>
                <a href="#plantillas" className="inline-flex min-h-12 items-center rounded-full border border-cream/30 px-6 font-semibold transition hover:border-cream">Ver plantillas</a>
              </div>
            </article>
            <article className="ld-reveal flex flex-col gap-6 rounded-3xl bg-purple p-8 text-white sm:p-10">
              <span className="w-fit rounded-full bg-white px-3 py-1 font-mono text-[11px] font-semibold uppercase tracking-wider text-purple-dark">Hecho a tu medida</span>
              <h3 className="font-display text-5xl leading-none tracking-wide sm:text-6xl">Sitio web y software</h3>
              <p className="text-white/85">Para proyectos con necesidades propias: diseñamos y programamos desde cero, contigo.</p>
              <ul className="space-y-3 text-sm">
                {["Landings que convierten, con formularios y WhatsApp", "Sistemas, apps y portales para tu operación", "Integraciones con tus herramientas y pagos", "Agentes de IA que atienden y cotizan"].map((x) => (
                  <li key={x} className="flex gap-3"><Check className="text-lime" />{x}</li>
                ))}
              </ul>
              <div className="mt-auto flex flex-wrap gap-3 pt-2">
                <a href={wa("Hola, quiero cotizar un sitio o sistema a la medida.")} target="_blank" rel="noreferrer" className="inline-flex min-h-12 items-center rounded-full bg-white px-6 font-bold text-purple-dark transition hover:bg-cream">Cotizar por WhatsApp</a>
                <a href="#a-la-medida" className="inline-flex min-h-12 items-center rounded-full border border-white/40 px-6 font-semibold transition hover:border-white">Ver ejemplos</a>
              </div>
            </article>
          </div>
        </div>
      </section>

      {/* ------------------------------------------------- plantillas */}
      <section id="plantillas" className="ld-light scroll-mt-16 bg-[#e9ecdd] text-ink">
        <div className="mx-auto max-w-7xl px-4 py-24 sm:px-8">
          <div className="ld-reveal mb-10 flex flex-col justify-between gap-6 lg:flex-row lg:items-end">
            <div className="max-w-3xl">
              <p className="font-mono text-xs uppercase tracking-[0.18em] text-purple">Plantillas</p>
              <h2 className="mt-3 font-display text-[clamp(48px,7vw,96px)] leading-[0.88] tracking-wide">{THEME_TEMPLATES.length} plantillas.<br />Ninguna se parece a otra.</h2>
            </div>
            <p className="max-w-md text-neutral-600">
              Cada una tiene su propio encabezado, portada, tarjetas y animaciones, no solo otros colores.
              Pasa el cursor para recorrerla o abre la tienda demo y navégala como cliente.
            </p>
          </div>
          <TemplateGallery templates={templates} categories={categories} />
        </div>
      </section>

      {/* -------------------------------------------------- funciones */}
      <section id="funciones" className="ld-light scroll-mt-16 bg-cream text-ink">
        <div className="mx-auto max-w-7xl px-4 py-24 sm:px-8">
          <div className="ld-reveal mb-12 max-w-3xl">
            <p className="font-mono text-xs uppercase tracking-[0.18em] text-purple">Qué incluye</p>
            <h2 className="mt-3 font-display text-[clamp(44px,6vw,80px)] leading-[0.9] tracking-wide">Todo para vender, sin pelearte con la tecnología.</h2>
          </div>
          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {FEATURES.map((f) => (
              <li key={f.title} className={`ld-reveal flex flex-col gap-4 rounded-3xl p-7 ${f.big ? "bg-ink text-cream lg:col-span-2" : "bg-white ring-1 ring-ink/10"}`}>
                <span className={`flex h-12 w-12 items-center justify-center rounded-2xl ${f.big ? "bg-lime text-ink" : "bg-purple-tint text-purple"}`}>{ICONS[f.icon]}</span>
                <h3 className={`font-display tracking-wide ${f.big ? "text-4xl" : "text-3xl"} leading-none`}>{f.title}</h3>
                <p className={`text-sm leading-relaxed ${f.big ? "text-cream/80" : "text-neutral-600"}`}>{f.text}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* ------------------------------------------------ cómo funciona */}
      <section className="ld-light bg-lime text-ink">
        <div className="mx-auto max-w-7xl px-4 py-24 sm:px-8">
          <h2 className="ld-reveal mb-12 font-display text-[clamp(44px,6vw,80px)] leading-[0.9] tracking-wide">Así de fácil.</h2>
          <ol className="grid gap-10 md:grid-cols-3">
            {[
              ["Elige tu plantilla", "Escoge la que va con tu giro y uno de sus estilos de color. La puedes cambiar después."],
              ["Sube tus productos", "Fotos, precios y variantes. El asistente de IA te ayuda con las descripciones."],
              ["Comparte y cobra", "Conecta Mercado Pago, comparte tu liga por WhatsApp y redes, y recibe pedidos."],
            ].map(([title, text], i) => (
              <li key={title} className="ld-reveal flex flex-col gap-3 border-t-2 border-ink pt-6">
                <span className="font-display text-7xl leading-none">{String(i + 1).padStart(2, "0")}</span>
                <h3 className="font-display text-4xl leading-none tracking-wide">{title}</h3>
                <p className="max-w-sm text-ink/80">{text}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* ------------------------------------------------- a la medida */}
      <section id="a-la-medida" className="scroll-mt-16 bg-ink">
        <div className="mx-auto max-w-7xl px-4 py-24 sm:px-8">
          <div className="ld-reveal mb-12 grid gap-8 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)] lg:items-end">
            <div>
              <p className="font-mono text-xs uppercase tracking-[0.18em] text-lime">A la medida</p>
              <h2 className="mt-3 font-display text-[clamp(48px,7vw,96px)] leading-[0.88] tracking-wide">Sitios que ya están<br />trabajando.</h2>
            </div>
            <div className="flex flex-col gap-4">
              <p className="text-cream/80">Cuando una plantilla no alcanza, diseñamos y programamos contigo. Estos son algunos proyectos en línea:</p>
              <ul className="flex flex-wrap gap-2">
                {SERVICES.map((s) => <li key={s} className="rounded-full border border-cream/20 px-3 py-1.5 text-xs font-semibold text-cream/85">{s}</li>)}
              </ul>
            </div>
          </div>
          <ul className="grid gap-6 sm:grid-cols-2">
            {PORTFOLIO.map((p) => (
              <li key={p.url} className="ld-reveal">
                <a href={p.url} target="_blank" rel="noreferrer" className="group flex h-full flex-col gap-4 rounded-3xl bg-white/5 p-3 ring-1 ring-white/10 transition hover:bg-white/10">
                  <div className="overflow-hidden rounded-2xl bg-white/10">
                    <div className="flex items-center gap-1.5 bg-[#1b1838] px-3 py-2" aria-hidden="true">
                      <span className="h-2 w-2 rounded-full bg-white/25" /><span className="h-2 w-2 rounded-full bg-white/25" /><span className="h-2 w-2 rounded-full bg-white/25" />
                      <span className="ml-2 truncate font-mono text-[10px] text-cream/60">{p.url.replace("https://", "")}</span>
                    </div>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={`/portafolio/${p.shot}.webp`} alt={`Sitio de ${p.name}`} loading="lazy" className="block aspect-[16/10] w-full object-cover object-top transition duration-700 group-hover:scale-[1.03]" />
                  </div>
                  <div className="flex items-start justify-between gap-3 px-2 pb-2">
                    <div>
                      <span className="font-mono text-[11px] uppercase tracking-wider text-lime">{p.giro}</span>
                      <h3 className={`font-display leading-none tracking-wide text-4xl`}>{p.name}</h3>
                      <p className="mt-2 text-sm text-cream/70">{p.summary}</p>
                    </div>
                    <span aria-hidden="true" className="mt-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/10 transition group-hover:bg-lime group-hover:text-ink">↗</span>
                  </div>
                </a>
              </li>
            ))}
            <li className="ld-reveal">
              <a href={wa("Hola, quiero que mi proyecto sea el siguiente.")} target="_blank" rel="noreferrer"
                className="group flex h-full min-h-64 flex-col justify-between gap-6 rounded-3xl border-2 border-dashed border-lime/50 p-7 transition hover:border-lime hover:bg-lime hover:text-ink">
                <span className="font-mono text-[11px] uppercase tracking-wider text-lime group-hover:text-ink">Tu proyecto</span>
                <span className="font-display text-5xl leading-[0.9] tracking-wide">¿El siguiente<br />es el tuyo?</span>
                <span className="inline-flex items-center gap-2 font-semibold">Cuéntanos tu idea <span aria-hidden="true">→</span></span>
              </a>
            </li>
          </ul>
          <div className="ld-reveal mt-12 flex flex-wrap items-center gap-4">
            <a href={wa("Hola, quiero cotizar un proyecto a la medida.")} target="_blank" rel="noreferrer" className="inline-flex min-h-14 items-center gap-2 rounded-full bg-lime px-7 font-bold text-ink transition hover:bg-[#a8c93a]">
              Cotiza tu proyecto por WhatsApp <span aria-hidden="true">→</span>
            </a>
            <a href={`mailto:${EMAIL}`} className="inline-flex min-h-14 items-center px-2 font-semibold text-cream/85 underline-offset-4 hover:underline">{EMAIL}</a>
          </div>
        </div>
      </section>

      {/* ---------------------------------------------------- preguntas */}
      <section id="preguntas" className="ld-light scroll-mt-16 bg-cream text-ink">
        <div className="mx-auto grid max-w-7xl gap-12 px-4 py-24 sm:px-8 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)]">
          <div className="ld-reveal">
            <p className="font-mono text-xs uppercase tracking-[0.18em] text-purple">Preguntas</p>
            <h2 className="mt-3 font-display text-[clamp(44px,6vw,80px)] leading-[0.9] tracking-wide">Lo que siempre nos preguntan.</h2>
            <p className="mt-4 text-neutral-600">¿Te quedó otra duda? <a className="font-semibold text-purple underline-offset-4 hover:underline" href={wa("Hola, tengo una pregunta sobre las tiendas en línea.")} target="_blank" rel="noreferrer">Escríbenos por WhatsApp</a>.</p>
          </div>
          <div className="divide-y divide-ink/15 border-y border-ink/15">
            {FAQ.map(([q, a]) => (
              <details key={q} className="ld-faq group">
                <summary className="flex min-h-16 items-center justify-between gap-4 py-4 text-lg font-bold">
                  {q}
                  <span className="ld-plus flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-ink text-xl leading-none text-cream" aria-hidden="true">+</span>
                </summary>
                <p className="pb-5 pr-12 leading-relaxed text-neutral-600">{a}</p>
              </details>
            ))}
          </div>
        </div>
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({
          "@context": "https://schema.org", "@type": "FAQPage",
          mainEntity: FAQ.map(([q, a]) => ({ "@type": "Question", name: q, acceptedAnswer: { "@type": "Answer", text: a } })),
        }) }} />
      </section>

      {/* ----------------------------------------------------- cierre */}
      <section className="relative overflow-hidden bg-ink">
        <div className="ld-grid-bg pointer-events-none absolute inset-0" aria-hidden="true" />
        <div className="relative mx-auto flex max-w-7xl flex-col items-start gap-8 px-4 py-28 sm:px-8">
          <h2 className="ld-reveal font-display text-[clamp(56px,10vw,150px)] leading-[0.85] tracking-wide">Tu tienda puede<br />estar en línea <span className="text-lime">hoy.</span></h2>
          <div className="ld-reveal flex flex-wrap gap-3">
            <a href={primaryCta.href} {...(primaryCta.external ? { target: "_blank", rel: "noreferrer" } : {})} className="inline-flex min-h-14 items-center gap-2 rounded-full bg-lime px-7 font-bold text-ink shadow-[0_6px_0_#3e5a05] transition hover:-translate-y-0.5 hover:bg-[#a8c93a]">
              {primaryCta.label} <span aria-hidden="true">→</span>
            </a>
            <a href={wa("Hola, quiero cotizar un sitio o sistema a la medida.")} target="_blank" rel="noreferrer" className="inline-flex min-h-14 items-center rounded-full border border-cream/30 px-7 font-semibold transition hover:border-cream">Cotizar algo a la medida</a>
          </div>
        </div>
      </section>

      <footer className="border-t border-white/10 bg-ink">
        <div className="mx-auto flex max-w-7xl flex-col gap-6 px-4 py-10 text-sm text-cream/70 sm:flex-row sm:items-center sm:justify-between sm:px-8">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo-wordmark-cream.svg" alt="Hirata Labs" width={120} height={26} className="h-5 w-auto" />
          <nav className="flex flex-wrap gap-x-6 gap-y-2" aria-label="Pie de página">
            <a href="#plantillas" className="hover:text-cream">Plantillas</a>
            <a href="#a-la-medida" className="hover:text-cream">A la medida</a>
            <a href="/login" className="hover:text-cream">Entrar</a>
            <a href={`mailto:${EMAIL}`} className="hover:text-cream">{EMAIL}</a>
          </nav>
          <span>© {new Date().getFullYear()} Hirata Labs</span>
        </div>
      </footer>
    </div>
  );
}

function Dot() {
  return <span className="inline-block h-1.5 w-1.5 rounded-full bg-lime" aria-hidden="true" />;
}

function Check({ className = "" }: { className?: string }) {
  return (
    <svg className={`mt-0.5 h-5 w-5 shrink-0 ${className}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M5 12.5l4.5 4.5L19 7.5" />
    </svg>
  );
}

const svg = (d: React.ReactNode) => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{d}</svg>
);
const ICONS = {
  editor: svg(<><rect x="3" y="4" width="18" height="14" rx="2" /><path d="M3 9h18M9 9v9" /><path d="M8 21h8" /></>),
  card: svg(<><rect x="2.5" y="5" width="19" height="14" rx="2" /><path d="M2.5 10h19M6.5 15h4" /></>),
  box: svg(<><path d="M21 8l-9-5-9 5 9 5 9-5z" /><path d="M3 8v8l9 5 9-5V8M12 13v8" /></>),
  bag: svg(<><path d="M6 7h12l1 14H5L6 7z" /><path d="M9 7a3 3 0 0 1 6 0" /></>),
  sparkle: svg(<><path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8L12 3z" /><path d="M19 16l.7 2 2 .7-2 .7-.7 2-.7-2-2-.7 2-.7.7-2z" /></>),
  globe: svg(<><circle cx="12" cy="12" r="9" /><path d="M3 12h18M12 3c2.5 2.6 3.8 5.6 3.8 9S14.5 18.4 12 21c-2.5-2.6-3.8-5.6-3.8-9S9.5 5.6 12 3z" /></>),
  phone: svg(<><rect x="7" y="2.5" width="10" height="19" rx="2.5" /><path d="M11 18.5h2" /></>),
  chat: svg(<><path d="M4 19.5l1.4-4A8 8 0 1 1 8.5 18.6L4 19.5z" /><path d="M9 11h6M9 14h4" /></>),
  history: svg(<><path d="M3 12a9 9 0 1 0 3-6.7L3 8" /><path d="M3 3v5h5M12 8v4l3 2" /></>),
  team: svg(<><circle cx="9" cy="8" r="3.2" /><path d="M3 20a6 6 0 0 1 12 0" /><circle cx="17" cy="9" r="2.6" /><path d="M16 14.2a5 5 0 0 1 5.5 5" /></>),
};
