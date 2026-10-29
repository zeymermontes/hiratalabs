import { NextResponse, type NextRequest } from "next/server";
import { accessFor, getSessionUser } from "@/lib/auth";
import { AssetError, ensurePublicBucket, uploadPublicAsset } from "@/lib/storage";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Subida de imágenes del panel (productos, banners, categorías). Multipart con
 * `siteId`, `folder` y `file`. Solo quien tiene acceso al sitio (staff basta).
 * Responde { ok: true, url, path } o { ok: false, error }.
 */
export async function POST(req: NextRequest) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ ok: false, error: "Inicia sesión de nuevo." }, { status: 401 });

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ ok: false, error: "Envía el archivo como multipart/form-data." }, { status: 400 });
  }

  const siteId = String(form.get("siteId") ?? "");
  const folder = String(form.get("folder") ?? "uploads");
  const file = form.get("file");

  if (!UUID.test(siteId)) return NextResponse.json({ ok: false, error: "Sitio inválido." }, { status: 400 });
  if (!accessFor(user, siteId)) return NextResponse.json({ ok: false, error: "No tienes acceso a este sitio." }, { status: 403 });
  if (!(file instanceof File)) return NextResponse.json({ ok: false, error: "Falta el archivo." }, { status: 400 });

  try {
    await ensurePublicBucket().catch(() => null);
    const out = await uploadPublicAsset(siteId, file, folder);
    return NextResponse.json({ ok: true, ...out });
  } catch (e) {
    const status = e instanceof AssetError ? e.status : 500;
    const error = e instanceof Error ? e.message : "No se pudo subir la imagen.";
    return NextResponse.json({ ok: false, error }, { status });
  }
}
