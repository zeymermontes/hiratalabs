import { and, eq, sql } from "drizzle-orm";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { admins, siteMembers, signups, siteSettings, sites } from "@/lib/db/schema";
import { supabaseServer } from "@/lib/supabase/server";

export type AdminUser = { id: string; email: string };

export type Membership = { siteId: string; role: "owner" | "staff" };

/**
 * Quien está en el panel. Un super admin (tabla admins) ve y toca todo; un
 * miembro (tabla site_members) solo ve los sitios donde está invitado, con el
 * rol que le dieron en cada uno.
 */
export type SessionUser = {
  id: string;
  email: string;
  isSuperAdmin: boolean;
  memberships: Membership[];
};

/** Lo que un usuario puede hacer en UN sitio. */
export type SiteAccess = {
  user: SessionUser;
  isSuperAdmin: boolean;
  role: "owner" | "staff" | null;
  /** owner o super admin: puede cambiar ajustes, módulos y equipo. */
  canManage: boolean;
};

function clean(email: string) {
  return email.trim().toLowerCase();
}

/**
 * Un correo entra al panel si es super admin o si es miembro de algún sitio.
 * Mientras la tabla admins esté vacía, BOOTSTRAP_ADMIN_EMAIL entra y queda
 * registrado como el primer super admin.
 */
export async function isAllowedAdmin(email: string): Promise<boolean> {
  const e = clean(email);
  if (!e) return false;
  if (await isSuperAdminEmail(e)) return true;
  const [m] = await db.select({ id: siteMembers.id }).from(siteMembers).where(eq(siteMembers.email, e)).limit(1);
  if (m) return true;
  // Un registro pendiente de /start también entra: su sitio se crea al llegar.
  const [p] = await db.select({ id: signups.id }).from(signups)
    .where(and(eq(signups.email, e), eq(signups.status, "pending"))).limit(1);
  return Boolean(p);
}

/**
 * Convierte los registros pendientes de este correo en sitios reales. Se llama
 * en cada sesión (es barato: un select por correo) y es idempotente.
 */
export async function finalizeSignups(email: string, userId: string): Promise<void> {
  const pending = await db.select().from(signups)
    .where(and(eq(signups.email, email), eq(signups.status, "pending")));
  for (const p of pending) {
    const [taken] = await db.select({ id: sites.id }).from(sites).where(eq(sites.slug, p.slug));
    if (taken) {
      await db.update(signups).set({ status: "expired" }).where(eq(signups.id, p.id));
      continue;
    }
    const [site] = await db.insert(sites).values({
      name: p.storeName, slug: p.slug, kind: p.kind, status: "draft",
      theme: p.kind === "store" ? { template: p.template } : null,
      notes: p.business ? `Giro: ${p.business}` : null,
    }).returning();
    await db.insert(siteSettings).values({ siteId: site.id, brandName: p.storeName }).onConflictDoNothing();
    await db.insert(siteMembers).values({ siteId: site.id, email, userId, role: "owner", invitedBy: "signup" })
      .onConflictDoNothing();
    await db.update(signups).set({ status: "done", siteId: site.id }).where(eq(signups.id, p.id));
  }
}

export async function isSuperAdminEmail(email: string): Promise<boolean> {
  const e = clean(email);
  if (!e) return false;

  const [existing] = await db.select().from(admins).where(eq(admins.email, e));
  if (existing) return true;

  const [{ count }] = await db.select({ count: sql<number>`count(*)::int` }).from(admins);
  const bootstrap = clean(process.env.BOOTSTRAP_ADMIN_EMAIL ?? "");
  if (count === 0 && bootstrap && bootstrap === e) {
    await db.insert(admins).values({ email: e }).onConflictDoNothing();
    return true;
  }
  return false;
}

export async function getSessionUser(): Promise<SessionUser | null> {
  const sb = await supabaseServer();
  const { data, error } = await sb.auth.getUser();
  if (error || !data.user?.email) return null;
  const email = clean(data.user.email);

  const isSuperAdmin = await isSuperAdminEmail(email);
  await finalizeSignups(email, data.user.id);
  const rows = await db
    .select({ siteId: siteMembers.siteId, role: siteMembers.role, userId: siteMembers.userId })
    .from(siteMembers)
    .where(eq(siteMembers.email, email));

  if (!isSuperAdmin && rows.length === 0) return null;

  // Primer login del miembro: enlazamos el id de Supabase con su invitación.
  if (rows.some((r) => !r.userId)) {
    await db.update(siteMembers).set({ userId: data.user.id }).where(eq(siteMembers.email, email));
  }

  return {
    id: data.user.id,
    email,
    isSuperAdmin,
    memberships: rows.map((r) => ({ siteId: r.siteId, role: r.role })),
  };
}

/** Cualquier persona con acceso al panel (super admin o miembro de un sitio). */
export async function requireUser(): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  return user;
}

/** Solo super admin. Compatibilidad: devuelve la forma de siempre. */
export async function getAdminUser(): Promise<AdminUser | null> {
  const user = await getSessionUser();
  if (!user?.isSuperAdmin) return null;
  return { id: user.id, email: user.email };
}

/** Solo super admin; manda al login si no hay sesión y a la home si no tiene rango. */
export async function requireAdmin(): Promise<AdminUser> {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  if (!user.isSuperAdmin) redirect("/");
  return { id: user.id, email: user.email };
}

export function accessFor(user: SessionUser, siteId: string): SiteAccess | null {
  const m = user.memberships.find((x) => x.siteId === siteId);
  if (!user.isSuperAdmin && !m) return null;
  const role = m?.role ?? null;
  return {
    user,
    isSuperAdmin: user.isSuperAdmin,
    role,
    canManage: user.isSuperAdmin || role === "owner",
  };
}

/**
 * Acceso a un sitio concreto. `manage: true` exige owner o super admin (ajustes,
 * módulos, equipo, borrar); sin él basta con ser staff (operar pedidos, productos).
 */
export async function requireSiteAccess(siteId: string, opts: { manage?: boolean } = {}): Promise<SiteAccess> {
  const user = await requireUser();
  const access = accessFor(user, siteId);
  if (!access) redirect("/");
  if (opts.manage && !access.canManage) redirect(`/sites/${siteId}`);
  return access;
}
