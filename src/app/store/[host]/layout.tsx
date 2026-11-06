import type { Metadata } from "next";
import { headers } from "next/headers";
import { blockedPage, maintenancePage, unconfiguredPage } from "@/lib/pages";
import { getStorefront } from "@/lib/storefront";
import { Sections } from "@/components/storefront/theme/render";
import { PreviewBridge } from "@/components/storefront/theme/preview-bridge";
import { PREVIEW_HEADER } from "@/themes/preview";
import "./storefront.css";
import "./theme.css";
import "./sections-a.css";
import "./sections-b.css";

export const dynamic = "force-dynamic";

type Props = { children: React.ReactNode; params: Promise<{ host: string }> };

export async function generateMetadata({ params }: Omit<Props, "children">): Promise<Metadata> {
  const { host } = await params;
  const ctx = await getStorefront(host);
  if (!ctx) return { title: "Tienda" };
  return {
    title: { default: ctx.config.brandName, template: `%s — ${ctx.config.brandName}` },
    robots: ctx.site.status === "live" && !ctx.preview ? { index: true, follow: true } : { index: false, follow: false },
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
  const { site, design } = ctx;

  // El dueño ve su borrador en el editor aunque la tienda aún no esté en línea.
  if (!ctx.preview) {
    if (site.status === "maintenance" || site.status === "draft") {
      return <Notice html={maintenancePage(site.maintenanceTitle, site.maintenanceMessage)} />;
    }
    if (site.status === "blocked") {
      return <Notice html={blockedPage(site.maintenanceTitle, site.maintenanceMessage)} />;
    }
  }

  const previewToken = ctx.preview ? (await headers()).get(PREVIEW_HEADER) : null;

  return (
    <div className="sf" style={design.cssVars as React.CSSProperties} {...design.rootAttrs}>
      <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      <link rel="stylesheet" href={design.fontsHref} />
      <style dangerouslySetInnerHTML={{ __html: design.schemeCss }} />

      <Sections list={design.doc.groups.header} ctx={ctx} zone="header" />
      <main className="sf-main">{children}</main>
      <Sections list={design.doc.groups.footer} ctx={ctx} zone="footer" />

      {previewToken ? <PreviewBridge token={previewToken} /> : null}
    </div>
  );
}
