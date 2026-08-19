import { eq } from "drizzle-orm";
import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { sites } from "@/lib/db/schema";
import { env } from "@/lib/env";
import { siteHost } from "@/lib/host";
import { Tabs } from "@/components/tabs";
import { StatusPill } from "@/components/ui";
import { StatusControls } from "./status-controls";

export const dynamic = "force-dynamic";

export default async function SiteLayout({
  children, params,
}: { children: React.ReactNode; params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [site] = await db.select().from(sites).where(eq(sites.id, id));
  if (!site) notFound();

  const host = siteHost(site.slug, env.rootDomain);

  return (
    <>
      <div className="mb-6">
        <Link href="/" className="text-xs text-neutral-400 hover:text-neutral-700">
          ← Todos los sitios
        </Link>
        <div className="mt-2 flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-xl font-semibold tracking-tight">{site.name}</h1>
              <StatusPill status={site.status} />
            </div>
            <a
              href={`https://${host}`} target="_blank" rel="noreferrer"
              className="mt-1 inline-block text-sm text-neutral-500 underline-offset-2 hover:text-neutral-800 hover:underline"
            >
              {host} ↗
            </a>
          </div>
          <StatusControls siteId={site.id} status={site.status} />
        </div>
      </div>

      <Tabs
        base={`/sites/${site.id}`}
        items={[
          { href: "", label: "Publicación" },
          { href: "/settings", label: "Contacto" },
          { href: "/chat", label: "Chat IA" },
          { href: "/domains", label: "Dominios" },
          { href: "/submissions", label: "Mensajes" },
          { href: "/reports", label: "Reportes" },
        ]}
      />

      {children}
    </>
  );
}
