import { index, jsonb, pgEnum, pgTable, text, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { sites } from "@/lib/db/schema";
import type { ThemeDoc } from "./types";

export const themeVersionStatus = pgEnum("theme_version_status", ["draft", "published", "archived"]);

/** Versiones del tema de una tienda: un borrador, una publicada y las anteriores archivadas. */
export const themeVersions = pgTable("theme_versions", {
  id: uuid("id").primaryKey().defaultRandom(),
  siteId: uuid("site_id").notNull().references(() => sites.id, { onDelete: "cascade" }),
  status: themeVersionStatus("status").notNull().default("draft"),
  doc: jsonb("doc").$type<ThemeDoc>().notNull(),
  label: text("label"),
  createdBy: text("created_by"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  publishedAt: timestamp("published_at", { withTimezone: true }),
}, (t) => ({
  siteIdx: index("theme_versions_site_idx").on(t.siteId, t.status, t.updatedAt),
  oneDraft: uniqueIndex("theme_versions_one_draft").on(t.siteId).where(sql`status = 'draft'`),
  onePublished: uniqueIndex("theme_versions_one_published").on(t.siteId).where(sql`status = 'published'`),
}));

export type ThemeVersion = typeof themeVersions.$inferSelect;
