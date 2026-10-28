import { eq } from "drizzle-orm";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireSiteAccess } from "@/lib/auth";
import { db } from "@/lib/db";
import { sites } from "@/lib/db/schema";
import { env } from "@/lib/env";
import { siteHost } from "@/lib/host";
import { siteTabs } from "@/lib/site-tabs";
import { Tabs } from "@/components/tabs";
import { KindPill, StatusPill } from "@/components/ui";
import { StatusControls } from "./status-controls";

export const dynamic = "force-dynamic";

export default async function SiteLayout({
  children, params,
}: { children: React.ReactNode; params: Promise<{ id: string }> }) {
  const { id } = await params;
  const access = await requireSiteAccess(id);
  const [site] = await db.select().from(sites).where(eq(sites.id, id));
  if (!site) notFound();

  const host = siteHost(site.slug, env.rootDomain);
  const tabs = await siteTabs(site, access.canManage);

  return (
    <>
      <div className="mb-6">
        <Link href="/" className="text-xs text-neutral-500 hover:text-neutral-800">
          ← {access.isSuperAdmin ? "Todos los sitios" : "Mis sitios"}
        </Link>
        <div className="mt-2 flex flex-wrap items-center justify-between gap-4">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2.5">
              <h1 className="font-display text-4xl leading-none text-neutral-900">{site.name}</h1>
              <KindPill kind={site.kind} />
              <StatusPill status={site.status} />
            </div>
            <a
              href={`https://${host}`} target="_blank" rel="noreferrer"
              className="mt-1 inline-block font-mono text-sm text-purple underline-offset-2 hover:underline"
            >
              {host} ↗
            </a>
          </div>
          {access.canManage ? <StatusControls siteId={site.id} status={site.status} /> : null}
        </div>
      </div>

      <Tabs base={`/sites/${site.id}`} items={tabs} />

      {children}
    </>
  );
}
