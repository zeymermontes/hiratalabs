import { eq, sql } from "drizzle-orm";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { admins } from "@/lib/db/schema";
import { supabaseServer } from "@/lib/supabase/server";

export type AdminUser = { id: string; email: string };

/**
 * An email may sign in only if it is in the admins table — or, while that table
 * is still empty, if it matches BOOTSTRAP_ADMIN_EMAIL (which then gets inserted).
 */
export async function isAllowedAdmin(email: string): Promise<boolean> {
  const clean = email.trim().toLowerCase();
  if (!clean) return false;

  const [existing] = await db.select().from(admins).where(eq(admins.email, clean));
  if (existing) return true;

  const [{ count }] = await db.select({ count: sql<number>`count(*)::int` }).from(admins);
  const bootstrap = (process.env.BOOTSTRAP_ADMIN_EMAIL ?? "").trim().toLowerCase();
  if (count === 0 && bootstrap && bootstrap === clean) {
    await db.insert(admins).values({ email: clean }).onConflictDoNothing();
    return true;
  }
  return false;
}

export async function getAdminUser(): Promise<AdminUser | null> {
  const sb = await supabaseServer();
  const { data, error } = await sb.auth.getUser();
  if (error || !data.user?.email) return null;
  if (!(await isAllowedAdmin(data.user.email))) return null;
  return { id: data.user.id, email: data.user.email };
}

export async function requireAdmin(): Promise<AdminUser> {
  const user = await getAdminUser();
  if (!user) redirect("/login");
  return user;
}
