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
