import { env } from "@/lib/env";

export function normalizeHost(raw: string | null | undefined): string {
  if (!raw) return "";
  // Port and root dot can appear in either order ("host:3000", "host.", "host.:3000").
  return raw
    .split(",")[0].trim().toLowerCase()
    .replace(/:\d+$/, "")
    .replace(/\.+$/, "")
    .replace(/:\d+$/, "");
}

export function isAdminHost(host: string): boolean {
  if (host === env.adminHost) return true;
  // Render's own hostname is always a way into the panel, even before the
  // custom domain resolves.
  const renderHost = (process.env.RENDER_EXTERNAL_HOSTNAME ?? "").toLowerCase();
  if (renderHost && host === renderHost) return true;
  // Local development: bare localhost is the admin, *.localhost are tenants.
  return host === "localhost" || host === "127.0.0.1";
}

/** The slug that owns the apex domain, so the home site is managed like any other. */
export const APEX_SLUG = "www";

/** Returns the subdomain label if the host is <label>.ROOT_DOMAIN, else null. */
export function slugFromHost(host: string): string | null {
  const root = env.rootDomain;

  // hiratalabs.com and www.hiratalabs.com are the same site: the home page.
  if (host === root || host === `www.${root}`) return APEX_SLUG;
  if (host === "www.localhost") return APEX_SLUG;

  if (host.endsWith(`.${root}`)) {
    const label = host.slice(0, -(root.length + 1));
    return label.includes(".") ? null : label;
  }
  // Local development: <slug>.localhost:3000
  if (host.endsWith(".localhost")) {
    const label = host.slice(0, -".localhost".length);
    return label.includes(".") ? null : label;
  }
  return null;
}

/** Hostname to show (and link to) for a site in the admin. */
export function siteHost(slug: string, rootDomain = env.rootDomain): string {
  return slug === APEX_SLUG ? rootDomain : `${slug}.${rootDomain}`;
}
