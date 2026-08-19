function req(name: string, fallback?: string): string {
  const v = process.env[name] ?? fallback;
  if (v === undefined || v === "") {
    // Fail loudly at first use rather than silently misbehaving in production.
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return v;
}

function opt(name: string, fallback = ""): string {
  return process.env[name] ?? fallback;
}

export const env = {
  get rootDomain() {
    return req("ROOT_DOMAIN", "hiratalabs.com").toLowerCase();
  },
  get adminHost() {
    return req("ADMIN_HOST", `admin.${process.env.ROOT_DOMAIN ?? "hiratalabs.com"}`).toLowerCase();
  },
  /** Shown in the "powered by" chip on platform subdomains. */
  get platformName() {
    return opt("PLATFORM_NAME", "Hirata Labs");
  },
  get adminUrl() {
    return opt("NEXT_PUBLIC_ADMIN_URL", "http://localhost:3000");
  },
  get supabaseUrl() {
    return req("NEXT_PUBLIC_SUPABASE_URL");
  },
  get supabaseAnonKey() {
    return req("NEXT_PUBLIC_SUPABASE_ANON_KEY");
  },
  get supabaseServiceKey() {
    return req("SUPABASE_SERVICE_ROLE_KEY");
  },
  get bucket() {
    return opt("SUPABASE_STORAGE_BUCKET", "landings");
  },
  get databaseUrl() {
    return req("DATABASE_URL");
  },
  get resendKey() {
    return opt("RESEND_API_KEY");
  },
  get resendFrom() {
    return opt("RESEND_FROM", "noreply@hiratalabs.com");
  },
  get resendBcc() {
    return opt("RESEND_BCC");
  },
  /**
   * Render reserves the RENDER_ prefix for its own variables, so the API key
   * lives under a name of our own.
   */
  get renderApiKey() {
    return opt("DEPLOY_API_KEY") || opt("RENDER_API_KEY");
  },
  /** Set automatically by Render at runtime; only needed by hand for local dev. */
  get renderServiceId() {
    return opt("RENDER_SERVICE_ID");
  },
  /** The onrender.com hostname clients point their DNS at. Render provides it. */
  get renderServiceHost() {
    return opt("RENDER_EXTERNAL_HOSTNAME") || opt("RENDER_SERVICE_HOST", "landings.onrender.com");
  },
  get maxZipBytes() {
    return Number(opt("MAX_ZIP_BYTES", "104857600"));
  },
  get maxFiles() {
    return Number(opt("MAX_FILES_PER_SITE", "3000"));
  },
};

/** Subdomains that can never be claimed by a landing page. */
/** "www" is intentionally absent: it is the slug that serves the apex domain. */
export const RESERVED_SLUGS = new Set([
  "admin", "api", "app", "mail", "email", "smtp", "imap", "pop",
  "ftp", "cdn", "assets", "static", "img", "images", "media", "files",
  "dev", "staging", "test", "demo", "docs", "status", "blog", "shop",
  "dashboard", "panel", "login", "auth", "account", "billing", "support",
  "ns1", "ns2", "mx", "vpn", "git", "ci", "internal", "render",
]);
