import {
  bigint,
  boolean,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

export const siteStatus = pgEnum("site_status", ["live", "maintenance", "blocked", "draft"]);
export const siteKind = pgEnum("site_kind", ["landing", "store"]);

/** Marca de una tienda: la plantilla elegida y sus tokens. Vive en sites.theme. */
export type SiteTheme = {
  template: string;
  colors?: Partial<Record<"primary" | "primaryForeground" | "accent" | "background" | "foreground" | "muted", string>>;
  fonts?: { display?: string; body?: string };
  radius?: "none" | "sm" | "md" | "lg" | "full";
  logoUrl?: string;
  announcement?: string;
};
export const domainStatus = pgEnum("domain_status", ["pending", "verified", "failed"]);
export const emailStatus = pgEnum("email_status", ["pending", "sent", "failed", "skipped"]);

/** Admin allowlist. A magic link is only issued to an email present here. */
export const admins = pgTable("admins", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: text("email").notNull(),
  name: text("name"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  emailIdx: uniqueIndex("admins_email_idx").on(t.email),
}));

export const sites = pgTable("sites", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  /** Subdomain label: <slug>.ROOT_DOMAIN */
  slug: text("slug").notNull(),
  status: siteStatus("status").notNull().default("draft"),
  /** Shown instead of the site when status is maintenance/blocked. */
  maintenanceTitle: text("maintenance_title"),
  maintenanceMessage: text("maintenance_message"),
  activeVersionId: uuid("active_version_id"),
  /** Governs the chip on every host except the platform's own home page. */
  showPoweredBy: boolean("show_powered_by").notNull().default(true),
  /**
   * True once a verified custom domain switched the chip off by itself. Keeps
   * that from happening twice, so the admin can turn it back on and have it stay.
   */
  poweredByAutoOff: boolean("powered_by_auto_off").notNull().default(false),
  /** Floating WhatsApp button. The runtime skips it when no number is set. */
  showWhatsappFab: boolean("show_whatsapp_fab").notNull().default(false),
  /** landing = ZIP estático (lo de siempre); store = storefront de la plataforma. */
  kind: siteKind("kind").notNull().default("landing"),
  /** Plantilla y tokens de marca del storefront (solo kind = store). */
  theme: jsonb("theme").$type<SiteTheme>(),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  slugIdx: uniqueIndex("sites_slug_idx").on(t.slug),
}));

/** One immutable upload. Publishing = pointing sites.activeVersionId at one of these. */
export const siteVersions = pgTable("site_versions", {
  id: uuid("id").primaryKey().defaultRandom(),
  siteId: uuid("site_id").notNull().references(() => sites.id, { onDelete: "cascade" }),
  label: text("label"),
  /** Storage prefix: sites/<siteId>/<versionId>/ */
  storagePrefix: text("storage_prefix").notNull(),
  fileCount: integer("file_count").notNull().default(0),
  totalBytes: bigint("total_bytes", { mode: "number" }).notNull().default(0),
  uploadedBy: text("uploaded_by"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  siteIdx: index("site_versions_site_idx").on(t.siteId),
}));

/** Flat file index for a version. Lookup key when serving a request. */
export const siteFiles = pgTable("site_files", {
  id: uuid("id").primaryKey().defaultRandom(),
  versionId: uuid("version_id").notNull().references(() => siteVersions.id, { onDelete: "cascade" }),
  /** Normalized, no leading slash: "index.html", "assets/app.css" */
  path: text("path").notNull(),
  contentType: text("content_type").notNull(),
  size: integer("size").notNull(),
  etag: text("etag").notNull(),
}, (t) => ({
  lookupIdx: uniqueIndex("site_files_version_path_idx").on(t.versionId, t.path),
}));

/** Per-site contact data. Empty fields fall back to globalSettings. */
export const siteSettings = pgTable("site_settings", {
  siteId: uuid("site_id").primaryKey().references(() => sites.id, { onDelete: "cascade" }),
  brandName: text("brand_name"),
  email: text("email"),
  phone: text("phone"),
  whatsapp: text("whatsapp"),
  address: text("address"),
  /** Explicit Google Maps link. Beats the address-search URL when present. */
  mapsUrl: text("maps_url"),
  /** { instagram, facebook, x, linkedin, tiktok, youtube, ... } */
  socials: jsonb("socials").$type<Record<string, string>>().default({}).notNull(),
  /** Where contact-form submissions are emailed. */
  formRecipients: text("form_recipients").array().default([]).notNull(),
  formSubject: text("form_subject"),
  /** Arbitrary extra key/values exposed to the landing as window.__SITE__.custom */
  custom: jsonb("custom").$type<Record<string, string>>().default({}).notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

/** Singleton row (id = 'default') holding defaults inherited by every site. */
export const globalSettings = pgTable("global_settings", {
  id: text("id").primaryKey().default("default"),
  brandName: text("brand_name"),
  email: text("email"),
  phone: text("phone"),
  whatsapp: text("whatsapp"),
  address: text("address"),
  socials: jsonb("socials").$type<Record<string, string>>().default({}).notNull(),
  formRecipients: text("form_recipients").array().default([]).notNull(),
  formSubject: text("form_subject"),
  custom: jsonb("custom").$type<Record<string, string>>().default({}).notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const domains = pgTable("domains", {
  id: uuid("id").primaryKey().defaultRandom(),
  siteId: uuid("site_id").notNull().references(() => sites.id, { onDelete: "cascade" }),
  hostname: text("hostname").notNull(),
  status: domainStatus("status").notNull().default("pending"),
  /** Render's custom-domain object id, so we can poll/delete it. */
  renderDomainId: text("render_domain_id"),
  /** DNS record the client has to create, captured from Render's response. */
  dnsTarget: text("dns_target"),
  isPrimary: boolean("is_primary").notNull().default(false),
  lastCheckedAt: timestamp("last_checked_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  hostIdx: uniqueIndex("domains_hostname_idx").on(t.hostname),
  siteIdx: index("domains_site_idx").on(t.siteId),
}));

export const submissions = pgTable("submissions", {
  id: uuid("id").primaryKey().defaultRandom(),
  siteId: uuid("site_id").notNull().references(() => sites.id, { onDelete: "cascade" }),
  formName: text("form_name"),
  name: text("name"),
  email: text("email"),
  phone: text("phone"),
  message: text("message"),
  /** Every field posted, including ones not in the columns above. */
  data: jsonb("data").$type<Record<string, string>>().default({}).notNull(),
  pageUrl: text("page_url"),
  referrer: text("referrer"),
  ip: text("ip"),
  userAgent: text("user_agent"),
  emailStatus: emailStatus("email_status").notNull().default("pending"),
  emailError: text("email_error"),
  readAt: timestamp("read_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  siteIdx: index("submissions_site_created_idx").on(t.siteId, t.createdAt),
}));

export type Site = typeof sites.$inferSelect;
export type SiteVersion = typeof siteVersions.$inferSelect;
export type SiteFile = typeof siteFiles.$inferSelect;
export type SiteSettingsRow = typeof siteSettings.$inferSelect;
export type GlobalSettingsRow = typeof globalSettings.$inferSelect;
export type Domain = typeof domains.$inferSelect;
export type Submission = typeof submissions.$inferSelect;

/* ------------------------- AI quote-assistant chat ------------------------ */

export const aiProvider = pgEnum("ai_provider", ["anthropic", "openai", "google", "groq", "deepseek"]);
export const aiKeyMode = pgEnum("ai_key_mode", ["platform", "own"]);

/** Platform-wide provider credentials, encrypted at rest. */
export const aiKeys = pgTable("ai_keys", {
  id: uuid("id").primaryKey().defaultRandom(),
  provider: aiProvider("provider").notNull(),
  label: text("label").notNull(),
  /** AES-256-GCM payload — never the raw key. */
  secret: text("secret").notNull(),
  /** Last 4 characters, so the admin can tell two keys apart. */
  hint: text("hint").notNull(),
  isDefault: boolean("is_default").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  providerIdx: index("ai_keys_provider_idx").on(t.provider),
}));

/**
 * The models available per provider, with the price used to bill sites back.
 * Exactly one per provider is the default, used by sites that don't pin one.
 */
export const aiModels = pgTable("ai_models", {
  id: uuid("id").primaryKey().defaultRandom(),
  provider: aiProvider("provider").notNull(),
  /** The exact model id sent to the provider. */
  model: text("model").notNull(),
  label: text("label"),
  /** USD per 1M tokens, stored in millionths to avoid float drift. */
  inputPriceMicros: bigint("input_price_micros", { mode: "number" }).notNull().default(0),
  outputPriceMicros: bigint("output_price_micros", { mode: "number" }).notNull().default(0),
  isDefault: boolean("is_default").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  uniq: uniqueIndex("ai_models_provider_model_idx").on(t.provider, t.model),
}));

/** Per-site chat configuration. Absent row means the chat is off. */
export const siteChat = pgTable("site_chat", {
  siteId: uuid("site_id").primaryKey().references(() => sites.id, { onDelete: "cascade" }),
  enabled: boolean("enabled").notNull().default(false),
  /** true = the chat is the only intake, false = it sits alongside the form. */
  replacesForm: boolean("replaces_form").notNull().default(false),
  keyMode: aiKeyMode("key_mode").notNull().default("platform"),
  provider: aiProvider("provider").notNull().default("anthropic"),
  model: text("model"),
  /** Client's own credential when keyMode = "own", encrypted the same way. */
  ownSecret: text("own_secret"),
  ownHint: text("own_hint"),
  launcherLabel: text("launcher_label"),
  welcome: text("welcome"),
  /** What the business does — grounds the follow-up questions. */
  businessContext: text("business_context"),
  /** Options for the opening "what do you need" question. */
  serviceOptions: text("service_options").array().default([]).notNull(),
  /** Colours and shape so the widget matches the landing it lives on. */
  theme: jsonb("theme").$type<Record<string, string | number>>(),
  monthlyLimit: integer("monthly_limit").notNull().default(500),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

/** One row per AI call, for the monthly cap and for cost visibility. */
export const aiUsage = pgTable("ai_usage", {
  id: uuid("id").primaryKey().defaultRandom(),
  siteId: uuid("site_id").notNull().references(() => sites.id, { onDelete: "cascade" }),
  provider: aiProvider("provider").notNull(),
  model: text("model"),
  ok: boolean("ok").notNull().default(true),
  error: text("error"),
  inputTokens: integer("input_tokens"),
  outputTokens: integer("output_tokens"),
  /** Qué función hizo la llamada: null = chat de cotización, 'assist' = asistente de IA. */
  feature: text("feature"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  siteIdx: index("ai_usage_site_created_idx").on(t.siteId, t.createdAt),
}));

export type AiKey = typeof aiKeys.$inferSelect;
export type AiModel = typeof aiModels.$inferSelect;
export type SiteChat = typeof siteChat.$inferSelect;

/* ------------------------- Plataforma: tiendas y módulos ------------------------- */

/**
 * Qué clase de sitio es. "landing" es el comportamiento de siempre (ZIP estático
 * servido tal cual); "store" se renderiza con el storefront de la plataforma.
 */
export const memberRole = pgEnum("member_role", ["owner", "staff"]);
export const moduleTier = pgEnum("module_tier", ["free", "paid"]);
export const moduleRequestStatus = pgEnum("module_request_status", ["pending", "approved", "rejected"]);

/**
 * Quién puede entrar al panel de un sitio sin ser super admin. El owner
 * administra su tienda; el staff opera (pedidos, productos) sin tocar facturación
 * ni módulos de pago.
 */
export const siteMembers = pgTable("site_members", {
  id: uuid("id").primaryKey().defaultRandom(),
  siteId: uuid("site_id").notNull().references(() => sites.id, { onDelete: "cascade" }),
  email: text("email").notNull(),
  /** Se llena en el primer login con magic link. */
  userId: uuid("user_id"),
  name: text("name"),
  role: memberRole("role").notNull().default("owner"),
  invitedBy: text("invited_by"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  uniq: uniqueIndex("site_members_site_email_idx").on(t.siteId, t.email),
  emailIdx: index("site_members_email_idx").on(t.email),
}));

/**
 * Ajustes comerciales por módulo que el super admin cambia desde el panel. El
 * nombre, la descripción y el comportamiento viven en código (src/modules/registry.ts);
 * aquí solo lo que se vende: si está disponible, si es gratis o extra, el precio
 * que se muestra y si el dueño puede prenderlo solo.
 */
export const modulesCatalog = pgTable("modules_catalog", {
  key: text("key").primaryKey(),
  /** false = no se ofrece a nadie (aunque exista en código). */
  available: boolean("available").notNull().default(true),
  tier: moduleTier("tier"),
  priceLabel: text("price_label"),
  ownerCanToggle: boolean("owner_can_toggle"),
  notes: text("notes"),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

/** Estado de un módulo en un sitio. Sin fila = el default del registro. */
export const siteModules = pgTable("site_modules", {
  siteId: uuid("site_id").notNull().references(() => sites.id, { onDelete: "cascade" }),
  moduleKey: text("module_key").notNull(),
  enabled: boolean("enabled").notNull().default(true),
  /** Configuración propia del módulo (lo define cada módulo). */
  config: jsonb("config").$type<Record<string, unknown>>().default({}).notNull(),
  enabledBy: text("enabled_by"),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  pk: uniqueIndex("site_modules_pk").on(t.siteId, t.moduleKey),
}));

/** Un dueño pide un extra de pago; el super admin lo aprueba y queda activo. */
export const moduleRequests = pgTable("module_requests", {
  id: uuid("id").primaryKey().defaultRandom(),
  siteId: uuid("site_id").notNull().references(() => sites.id, { onDelete: "cascade" }),
  moduleKey: text("module_key").notNull(),
  requestedBy: text("requested_by").notNull(),
  message: text("message"),
  status: moduleRequestStatus("status").notNull().default("pending"),
  resolvedBy: text("resolved_by"),
  resolvedAt: timestamp("resolved_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  siteIdx: index("module_requests_site_idx").on(t.siteId, t.status),
}));

export type SiteMember = typeof siteMembers.$inferSelect;
export type ModuleCatalogRow = typeof modulesCatalog.$inferSelect;
export type SiteModuleRow = typeof siteModules.$inferSelect;
export type ModuleRequest = typeof moduleRequests.$inferSelect;

/**
 * Registro público (/start): se guarda la intención y el sitio se crea en el
 * primer login, cuando el correo ya está verificado. Así nadie aparta un
 * subdominio con un correo ajeno.
 */
export const signupStatus = pgEnum("signup_status", ["pending", "done", "expired"]);
export const signups = pgTable("signups", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: text("email").notNull(),
  storeName: text("store_name").notNull(),
  slug: text("slug").notNull(),
  kind: siteKind("kind").notNull().default("store"),
  template: text("template").notNull().default("lumen"),
  /** Giro del negocio, para que la IA proponga textos. */
  business: text("business"),
  status: signupStatus("status").notNull().default("pending"),
  siteId: uuid("site_id"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  emailIdx: index("signups_email_idx").on(t.email, t.status),
}));
export type Signup = typeof signups.$inferSelect;

/* --------------------- Módulos: cada uno exporta su schema --------------------- */
export * from "@/modules/catalog/schema";
export * from "@/modules/orders/schema";
export * from "@/modules/mcp/schema";
