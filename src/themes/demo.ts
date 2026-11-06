import { env } from "@/lib/env";

/** Subdominio de la tienda demo de cada plantilla: demo-<plantilla>.<dominio>. */
export function demoSlug(templateKey: string) {
  return `demo-${templateKey}`;
}

/**
 * URL pública de la demo. En local (host *.localhost) apunta al servidor de
 * desarrollo; en producción, al subdominio real.
 */
export function demoUrl(templateKey: string, requestHost?: string | null) {
  const host = (requestHost ?? "").toLowerCase();
  if (host.includes("localhost")) {
    const port = host.split(":")[1];
    return `http://${demoSlug(templateKey)}.localhost${port ? `:${port}` : ""}`;
  }
  return `https://${demoSlug(templateKey)}.${env.rootDomain}`;
}

/** URL de una tienda para el iframe del editor (mismo criterio local/producción). */
export function storeUrl(slug: string, requestHost?: string | null) {
  const host = (requestHost ?? "").toLowerCase();
  if (host.includes("localhost")) {
    const port = host.split(":")[1];
    return `http://${slug}.localhost${port ? `:${port}` : ""}`;
  }
  return `https://${slug}.${env.rootDomain}`;
}
