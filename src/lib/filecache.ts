type Entry = { bytes: Uint8Array; at: number };

const MAX_BYTES = 32 * 1024 * 1024;
const MAX_FILE_BYTES = 2 * 1024 * 1024;

const cache = new Map<string, Entry>();
let used = 0;

export function cacheGet(key: string): Uint8Array | null {
  const hit = cache.get(key);
  if (!hit) return null;
  // Refresh recency (Map preserves insertion order, so re-insert = move to end).
  cache.delete(key);
  cache.set(key, hit);
  return hit.bytes;
}

export function cacheSet(key: string, bytes: Uint8Array) {
  if (bytes.byteLength > MAX_FILE_BYTES) return;
  if (cache.has(key)) used -= cache.get(key)!.bytes.byteLength;
  cache.set(key, { bytes, at: Date.now() });
  used += bytes.byteLength;

  while (used > MAX_BYTES) {
    const oldest = cache.keys().next();
    if (oldest.done) break;
    used -= cache.get(oldest.value)!.bytes.byteLength;
    cache.delete(oldest.value);
  }
}

export function cacheClear(prefix?: string) {
  if (!prefix) {
    cache.clear();
    used = 0;
    return;
  }
  for (const key of Array.from(cache.keys())) {
    if (key.startsWith(prefix)) {
      used -= cache.get(key)!.bytes.byteLength;
      cache.delete(key);
    }
  }
}
