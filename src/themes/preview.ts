import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * Token firmado para ver el BORRADOR del tema dentro del editor. El iframe
 * vive en el host de la tienda (otro origen), así que no comparte la sesión
 * del panel: el token viaja en la URL (?__preview=…) y el proxy lo pasa como
 * encabezado. Caduca solo; no da acceso a nada más que a ver el borrador.
 */

const TTL_MS = 12 * 60 * 60 * 1000;

function secret(): string {
  const s = process.env.ENCRYPTION_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || "";
  if (s.length < 16) throw new Error("Falta ENCRYPTION_KEY para firmar la vista previa.");
  return s;
}

const b64 = (b: Buffer) => b.toString("base64url");

export function signPreview(siteId: string, now = Date.now()): string {
  const payload = `${siteId}.${(now + TTL_MS).toString(36)}`;
  const sig = b64(createHmac("sha256", secret()).update(`theme-preview:${payload}`).digest()).slice(0, 32);
  return `${payload}.${sig}`;
}

/** Devuelve el siteId si el token es válido y no ha caducado. */
export function verifyPreview(token: string | null | undefined, now = Date.now()): string | null {
  if (!token) return null;
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  const [siteId, exp, sig] = parts;
  if (!/^[0-9a-f-]{36}$/i.test(siteId)) return null;
  const expected = b64(createHmac("sha256", secret()).update(`theme-preview:${siteId}.${exp}`).digest()).slice(0, 32);
  const a = Buffer.from(sig), b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  if (parseInt(exp, 36) < now) return null;
  return siteId;
}

export const PREVIEW_PARAM = "__preview";
export const PREVIEW_HEADER = "x-sf-preview";
