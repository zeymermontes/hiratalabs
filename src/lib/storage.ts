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
