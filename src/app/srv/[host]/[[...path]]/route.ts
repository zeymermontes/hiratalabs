import { and, eq } from "drizzle-orm";
import { NextResponse, type NextRequest } from "next/server";
import { db } from "@/lib/db";
import { siteFiles } from "@/lib/db/schema";
import { cacheGet, cacheSet } from "@/lib/filecache";
import { injectIntoHtml } from "@/lib/inject";
import { isHtml } from "@/lib/mime";
import { blockedPage, emptySitePage, maintenancePage, notFoundPage, unconfiguredPage } from "@/lib/pages";
import { resolveSiteByHost } from "@/lib/sites";
import { downloadFile } from "@/lib/storage";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Params = { params: Promise<{ host: string; path?: string[] }> };

function html(body: string, status: number) {
  return new NextResponse(body, {
    status,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}

/** Maps a request path onto a file in the version, the way a static host would. */
async function findFile(versionId: string, requested: string) {
  const clean = requested.replace(/^\/+/, "").split("?")[0];
  const candidates = clean === "" || clean.endsWith("/")
    ? [`${clean}index.html`]
    : [clean, `${clean}.html`, `${clean}/index.html`];

  for (const path of candidates) {
    const [row] = await db
      .select()
      .from(siteFiles)
      .where(and(eq(siteFiles.versionId, versionId), eq(siteFiles.path, path)));
    if (row) return row;
  }
  return null;
}

async function handle(req: NextRequest, { params }: Params, headOnly: boolean) {
  const { host, path } = await params;
  const requested = (path ?? []).map(decodeURIComponent).join("/");

  const resolved = await resolveSiteByHost(host);
  if (!resolved) return html(unconfiguredPage(host), 404);

  const { site, version, config } = resolved;

  if (site.status === "maintenance" || site.status === "draft") {
    return html(maintenancePage(site.maintenanceTitle, site.maintenanceMessage), 503);
  }
  if (site.status === "blocked") {
    return html(blockedPage(site.maintenanceTitle, site.maintenanceMessage), 403);
  }
  if (!version) return html(emptySitePage(site.name), 503);

  let file = await findFile(version.id, requested);
  let status = 200;

  if (!file) {
    file = await findFile(version.id, "404.html");
    status = 404;
    if (!file) return html(notFoundPage(), 404);
  }

  const cacheKey = `${version.id}/${file.path}`;
  let bytes = cacheGet(cacheKey);
  if (!bytes) {
    bytes = await downloadFile(version.storagePrefix, file.path);
    if (!bytes) return html(notFoundPage("El archivo ya no está disponible."), 404);
    cacheSet(cacheKey, bytes);
  }

  if (isHtml(file.path)) {
    // Rendered per request so settings edits appear instantly, no re-upload.
    const out = injectIntoHtml(new TextDecoder().decode(bytes), config);
    return new NextResponse(headOnly ? null : out, {
      status,
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Cache-Control": "no-cache, must-revalidate",
        "X-Site-Slug": site.slug,
      },
    });
  }

  const etag = `"${file.etag}"`;
  if (req.headers.get("if-none-match") === etag) {
    return new NextResponse(null, { status: 304, headers: { ETag: etag } });
  }

  return new NextResponse(headOnly ? null : (bytes as unknown as BodyInit), {
    status,
    headers: {
      "Content-Type": file.contentType,
      "Content-Length": String(file.size),
      "Cache-Control": "public, max-age=300, stale-while-revalidate=86400",
      ETag: etag,
    },
  });
}

export async function GET(req: NextRequest, ctx: Params) {
  return handle(req, ctx, false);
}

export async function HEAD(req: NextRequest, ctx: Params) {
  return handle(req, ctx, true);
}
