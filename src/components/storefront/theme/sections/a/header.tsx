import { listCategories } from "@/modules/catalog/queries";
import { getCartCount } from "@/modules/orders/cart";
import type { SectionProps } from "../../types";
import { bool, str } from "../../types";
import { HeaderClient, type HeaderVariant } from "./header-client";
import { brandOf, storeLinks, type NavLink } from "./shared";

const VARIANTS: HeaderVariant[] = ["classic", "centered", "minimal", "search", "pill", "transparent"];

/** Encabezado: los datos se juntan aquí y la parte interactiva vive en el cliente. */
export async function Header({ ctx, section }: SectionProps) {
  const s = section.settings;
  const variant = (VARIANTS as string[]).includes(section.variant ?? "") ? (section.variant as HeaderVariant) : "classic";
  const { modules, config } = ctx;

  let categories: NavLink[] = [];
  if (modules.has("catalog") && bool(s, "showCategories", true)) {
    try {
      const { header } = await listCategories(ctx.site.id);
      categories = header.slice(0, 6).map((c) => ({ href: `/categorias/${c.slug}`, label: c.name }));
    } catch {
      categories = [];
    }
  }

  let cartCount: number | null = null;
  if (modules.has("orders")) {
    try {
      cartCount = await getCartCount(ctx.site.id);
    } catch {
      cartCount = 0;
    }
  }

  return (
    <HeaderClient
      variant={variant}
      brand={brandOf(ctx)}
      links={storeLinks(modules)}
      categories={categories}
      sticky={bool(s, "sticky", true)}
      showSearch={modules.has("catalog") && (bool(s, "showSearch", false) || variant === "search")}
      menuLabel={str(s, "menuLabel", "Menú") || "Menú"}
      account={modules.has("customers")}
      cartCount={cartCount}
      contact={{ phone: config.phone, phoneHref: config.phoneHref, whatsappHref: config.whatsappHref }}
    />
  );
}
