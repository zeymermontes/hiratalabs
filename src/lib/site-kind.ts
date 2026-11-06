import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { domains, sites } from "@/lib/db/schema";
import { slugFromHost } from "@/lib/host";

/**
 * ¿Este host es una landing o una tienda? Consulta mínima (solo la columna
 * kind) para el proxy. En Next 16 el proxy corre en Node, así que puede leer
 * la base directo; antes se llamaba a /api/kind por HTTP y en Render esa
 * llamada del servidor a sí mismo fallaba, y toda tienda caía como landing.
 */
export async function siteKindForHost(host: string): Promise<"landing" | "store" | null> {
  const slug = slugFromHost(host);
  if (slug) {
    const [row] = await db.select({ kind: sites.kind }).from(sites).where(eq(sites.slug, slug));
    if (row) return row.kind;
  }
  const [row] = await db.select({ kind: sites.kind }).from(domains)
    .innerJoin(sites, eq(sites.id, domains.siteId))
    .where(and(eq(domains.hostname, host), eq(domains.status, "verified")));
  return row?.kind ?? null;
}
