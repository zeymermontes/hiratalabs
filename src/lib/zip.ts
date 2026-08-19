import { unzipSync } from "fflate";
import { ALLOWED_EXTENSIONS, contentTypeFor, extOf } from "@/lib/mime";

export type ExtractedFile = { path: string; bytes: Uint8Array; contentType: string };

export type ExtractResult = {
  files: ExtractedFile[];
  skipped: string[];
  strippedRoot: string | null;
  totalBytes: number;
};

/** Guard against zip bombs: refuse if the archive expands beyond this. */
const MAX_UNCOMPRESSED_BYTES = 400 * 1024 * 1024;
const JUNK = /(^|\/)(__MACOSX\/|\.DS_Store$|Thumbs\.db$|desktop\.ini$)/i;

function normalize(raw: string): string | null {
  // Reject anything that tries to escape the destination (zip-slip).
  const p = raw.replace(/\\/g, "/").replace(/^\/+/, "");
  if (!p || p.endsWith("/")) return null;
  if (p.includes("\0")) return null;
  if (/^[a-zA-Z]:/.test(p)) return null;
  if (p.split("/").some((seg) => seg === ".." || seg === "." || seg === "")) return null;
  return p;
}

/**
 * Exports often wrap everything in a folder ("my-landing/index.html"), and some
 * tools nest that twice ("export/my-landing/index.html"). Peel off shared roots
 * until index.html is at the top, so either shape imports cleanly.
 */
const MAX_ROOTS_TO_STRIP = 4;

function stripSharedRoots(paths: string[]): string[] {
  const roots: string[] = [];
  let current = paths;

  for (let depth = 0; depth < MAX_ROOTS_TO_STRIP; depth++) {
    if (current.some((p) => p === "index.html")) break;
    if (current.some((p) => !p.includes("/"))) break;

    const first = current[0].split("/")[0];
    if (!current.every((p) => p.split("/")[0] === first)) break;

    roots.push(first);
    current = current.map((p) => p.slice(first.length + 1));
  }

  return roots;
}

export function extractZip(buffer: Uint8Array, maxFiles: number): ExtractResult {
  const skipped: string[] = [];
  let projected = 0;

  const raw = unzipSync(buffer, {
    filter: (file) => {
      const norm = normalize(file.name);
      if (!norm) {
        if (file.name && !file.name.endsWith("/")) skipped.push(`${file.name} (unsafe path)`);
        return false;
      }
      if (JUNK.test(norm)) return false;
      const ext = extOf(norm);
      if (!ALLOWED_EXTENSIONS.has(ext)) {
        skipped.push(`${norm} (.${ext || "no extension"} not allowed)`);
        return false;
      }
      projected += file.originalSize ?? 0;
      if (projected > MAX_UNCOMPRESSED_BYTES) {
        throw new Error("Archive expands to more than 400MB — refusing to extract.");
      }
      return true;
    },
  });

  const entries = Object.entries(raw)
    .map(([name, bytes]) => ({ path: normalize(name)!, bytes }))
    .filter((e) => e.path);

  if (entries.length === 0) {
    throw new Error("The ZIP contained no usable files. Expected at least an index.html.");
  }
  if (entries.length > maxFiles) {
    throw new Error(`The ZIP has ${entries.length} files, over the ${maxFiles} limit.`);
  }

  const roots = stripSharedRoots(entries.map((e) => e.path));
  const prefix = roots.length ? `${roots.join("/")}/` : "";
  const files: ExtractedFile[] = entries.map((e) => {
    const path = prefix ? e.path.slice(prefix.length) : e.path;
    return { path, bytes: e.bytes, contentType: contentTypeFor(path) };
  });

  if (!files.some((f) => f.path === "index.html")) {
    throw new Error(
      "No index.html at the root of the ZIP. Zip the *contents* of your landing folder, not the folder itself.",
    );
  }

  return {
    files,
    skipped,
    strippedRoot: roots.length ? roots.join("/") : null,
    totalBytes: files.reduce((n, f) => n + f.bytes.byteLength, 0),
  };
}
