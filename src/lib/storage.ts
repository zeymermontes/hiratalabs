import { createHash } from "node:crypto";
import { env } from "@/lib/env";
import { supabaseAdmin } from "@/lib/supabase/admin";
import type { ExtractedFile } from "@/lib/zip";

export function storagePrefix(siteId: string, versionId: string) {
  return `sites/${siteId}/${versionId}`;
}

export function etagFor(bytes: Uint8Array): string {
  return createHash("sha1").update(bytes).digest("hex").slice(0, 20);
}

/** Uploads all files of a version, in small concurrent batches. */
export async function uploadVersionFiles(prefix: string, files: ExtractedFile[]) {
  const sb = supabaseAdmin();
  const bucket = sb.storage.from(env.bucket);
  const BATCH = 8;

  for (let i = 0; i < files.length; i += BATCH) {
    const batch = files.slice(i, i + BATCH);
    const results = await Promise.all(
      batch.map((f) =>
        bucket.upload(`${prefix}/${f.path}`, f.bytes as unknown as ArrayBuffer, {
          contentType: f.contentType,
          upsert: true,
          cacheControl: "31536000",
        }),
      ),
    );
    const failed = results.find((r) => r.error);
    if (failed?.error) {
      throw new Error(`Upload failed: ${failed.error.message}`);
    }
  }
}

export async function downloadFile(prefix: string, path: string): Promise<Uint8Array | null> {
  const sb = supabaseAdmin();
  const { data, error } = await sb.storage.from(env.bucket).download(`${prefix}/${path}`);
  if (error || !data) return null;
  return new Uint8Array(await data.arrayBuffer());
}

/** Best-effort cleanup when a version or site is deleted. */
export async function removePrefix(prefix: string, paths: string[]) {
  if (paths.length === 0) return;
  const sb = supabaseAdmin();
  const CHUNK = 100;
  for (let i = 0; i < paths.length; i += CHUNK) {
    await sb.storage.from(env.bucket).remove(paths.slice(i, i + CHUNK).map((p) => `${prefix}/${p}`));
  }
}

export async function ensureBucket() {
  const sb = supabaseAdmin();
  const { data } = await sb.storage.getBucket(env.bucket);
  if (!data) {
    await sb.storage.createBucket(env.bucket, { public: false, fileSizeLimit: "50MB" });
  }
}

/* ------------------------------------------------------------------------ */
/* Imágenes públicas de las tiendas (productos, banners, categorías)         */
/* ------------------------------------------------------------------------ */

const PUBLIC_IMAGE_TYPES: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
  "image/svg+xml": "svg",
};
export const MAX_PUBLIC_ASSET_BYTES = 8 * 1024 * 1024;

export class AssetError extends Error {
  constructor(message: string, public status = 400) { super(message); }
}

function safeFolder(folder: string) {
  const f = folder.toLowerCase().replace(/[^a-z0-9-]+/g, "-").replace(/^-+|-+$/g, "");
  return f || "uploads";
}

/**
 * Sube una imagen al bucket público bajo sites/<siteId>/<folder>/<uuid>.<ext>
 * y devuelve su URL pública. Valida tipo y tamaño; el llamador ya validó que
 * el usuario puede tocar ese sitio.
 */
export async function uploadPublicAsset(
  siteId: string, file: File, folder: string,
): Promise<{ url: string; path: string }> {
  const ext = PUBLIC_IMAGE_TYPES[file.type];
  if (!ext) throw new AssetError("Solo se aceptan imágenes JPG, PNG, WEBP, GIF o SVG.", 415);
  if (file.size === 0) throw new AssetError("El archivo está vacío.");
  if (file.size > MAX_PUBLIC_ASSET_BYTES) throw new AssetError("La imagen pesa más de 8 MB.", 413);

  const path = `sites/${siteId}/${safeFolder(folder)}/${crypto.randomUUID()}.${ext}`;
  const sb = supabaseAdmin();
  const bucket = sb.storage.from(env.publicBucket);
  const bytes = new Uint8Array(await file.arrayBuffer());
  const { error } = await bucket.upload(path, bytes as unknown as ArrayBuffer, {
    contentType: file.type,
    upsert: false,
    cacheControl: "31536000",
  });
  if (error) throw new AssetError(`No se pudo subir la imagen: ${error.message}`, 500);

  const { data } = bucket.getPublicUrl(path);
  return { url: data.publicUrl, path };
}

/** Crea el bucket público si no existe (se llama desde la primera subida). */
export async function ensurePublicBucket() {
  const sb = supabaseAdmin();
  const { data } = await sb.storage.getBucket(env.publicBucket);
  if (!data) {
    await sb.storage.createBucket(env.publicBucket, {
      public: true,
      fileSizeLimit: `${MAX_PUBLIC_ASSET_BYTES}`,
      allowedMimeTypes: Object.keys(PUBLIC_IMAGE_TYPES),
    });
  }
}
