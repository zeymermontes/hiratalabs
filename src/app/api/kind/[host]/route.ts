import { NextResponse } from "next/server";
import { normalizeHost } from "@/lib/host";
import { resolveSiteByHost } from "@/lib/sites";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Le dice al proxy (que corre en el edge, sin base de datos) si un host es una
 * landing o una tienda. Un host desconocido responde "landing": así cae en el
 * renderer de siempre, que ya sabe mostrar la página de "sitio no configurado".
 */
export async function GET(_req: Request, { params }: { params: Promise<{ host: string }> }) {
  const { host } = await params;
  const resolved = await resolveSiteByHost(normalizeHost(host));
  const kind = resolved?.site.kind === "store" ? "store" : "landing";
  return NextResponse.json({ kind }, { headers: { "Cache-Control": "no-store" } });
}
