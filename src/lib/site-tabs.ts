import { enabledModuleKeys } from "@/lib/modules";
import { MODULE_BY_KEY } from "@/modules/registry";

/**
 * Pestañas del sitio. Las fijas dependen del tipo de sitio; las demás las
 * aportan los módulos activos, en el orden del registro.
 */
export async function siteTabs(site: { id: string; kind: "landing" | "store" }, canManage: boolean) {
  const enabled = await enabledModuleKeys(site);
  const items: { href: string; label: string }[] = [
    site.kind === "store" ? { href: "", label: "Resumen" } : { href: "", label: "Publicación" },
  ];
  for (const key of enabled) {
    const tab = MODULE_BY_KEY[key]?.adminTab;
    if (tab) items.push(tab);
  }
  items.push({ href: "/settings", label: "Contacto" });
  if (canManage) {
    items.push({ href: "/modules", label: "Módulos" });
    items.push({ href: "/team", label: "Equipo" });
  }
  return items;
}

