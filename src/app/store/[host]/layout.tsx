import type { Metadata } from "next";
import { env } from "@/lib/env";
import { blockedPage, maintenancePage, unconfiguredPage } from "@/lib/pages";
import { getStorefront } from "@/lib/storefront";
import { getCartCount } from "@/modules/orders/cart";
import { StoreHeader } from "@/components/storefront/header";
import { StoreFooter } from "@/components/storefront/footer";
import "./storefront.css";

export const dynamic = "force-dynamic";

type Props = { children: React.ReactNode; params: Promise<{ host: string }> };

export async function generateMetadata({ params }: Omit<Props, "children">): Promise<Metadata> {
  const { host } = await params;
  const ctx = await getStorefront(host);
  if (!ctx) return { title: "Tienda" };
  return {
    title: { default: ctx.config.brandName, template: `%s — ${ctx.config.brandName}` },
    robots: ctx.site.status === "live" ? { index: true, follow: true } : { index: false, follow: false },
  };
}

/** Una página de aviso de la plataforma, con el mismo HTML que usan las landings. */
function Notice({ html }: { html: string }) {
  const body = html.replace(/^[\s\S]*?<body[^>]*>/i, "").replace(/<\/body>[\s\S]*$/i, "");
  return <div dangerouslySetInnerHTML={{ __html: body }} />;
}

export default async function StoreLayout({ children, params }: Props) {
  const { host } = await params;
  const ctx = await getStorefront(host);

  if (!ctx) return <Notice html={unconfiguredPage(host)} />;
  const { site, theme, config } = ctx;

  if (site.status === "maintenance" || site.status === "draft") {
    return <Notice html={maintenancePage(site.maintenanceTitle, site.maintenanceMessage)} />;
  }
  if (site.status === "blocked") {
    return <Notice html={blockedPage(site.maintenanceTitle, site.maintenanceMessage)} />;
  }

  const cartCount = ctx.modules.has("orders") ? await getCartCount(site.id).catch(() => 0) : 0;

  return (
    <div className={`sf sf-${theme.template.key}`} style={theme.cssVars as React.CSSProperties} data-radius={site.theme?.radius ?? theme.template.defaults.radius}>
      <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      <link rel="stylesheet" href={theme.fontsHref} />

      {theme.announcement ? (
        <div className="sf-announce">{theme.announcement}</div>
      ) : null}

      <StoreHeader
        brandName={config.brandName}
        logoUrl={theme.logoUrl}
        modules={[...ctx.modules]}
        cartCount={cartCount}
      />

      <main className="sf-main">{children}</main>

      <StoreFooter
        brandName={config.brandName}
        address={config.address}
        phone={config.phone}
        whatsapp={config.whatsapp}
        email={config.email}
        socials={config.socials}
        modules={[...ctx.modules]}
        poweredBy={config.poweredBy ? { name: env.platformName, href: `https://${env.rootDomain}` } : null}
      />
    </div>
  );
}
