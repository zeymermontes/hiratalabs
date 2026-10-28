import { requireUser } from "@/lib/auth";
import { env } from "@/lib/env";
import { signOut } from "@/app/login/actions";
import { AdminNav, type NavItem } from "@/components/admin-nav";

const PLATFORM_NAV: NavItem[] = [
  { href: "/", label: "Sitios", icon: "sites" },
  { href: "/modules", label: "Módulos", icon: "modules" },
  { href: "/requests", label: "Solicitudes", icon: "requests" },
  { href: "/ai", label: "Llaves de IA", icon: "ai" },
  { href: "/mcp", label: "Conexiones MCP", icon: "mcp" },
  { href: "/usage", label: "Consumo", icon: "usage" },
  { href: "/guide", label: "Guía para IA", icon: "guide" },
];

const MEMBER_NAV: NavItem[] = [
  { href: "/", label: "Mis sitios", icon: "sites" },
];

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();

  return (
    <div className="min-h-screen lg:flex">
      <AdminNav
        items={user.isSuperAdmin ? PLATFORM_NAV : MEMBER_NAV}
        email={user.email}
        roleLabel={user.isSuperAdmin ? "super admin" : "equipo"}
        rootDomain={env.rootDomain}
        signOut={async () => {
          "use server";
          await signOut();
        }}
      />
      <main className="min-w-0 flex-1 px-4 py-6 sm:px-6 lg:px-10 lg:py-8">
        <div className="mx-auto max-w-6xl">{children}</div>
      </main>
    </div>
  );
}
