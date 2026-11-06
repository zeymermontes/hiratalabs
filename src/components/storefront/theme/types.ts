import type { StorefrontContext } from "@/lib/storefront";
import type { Category, Product } from "@/modules/catalog/schema";
import type { ProductDetail, CategoryNode, ProductList } from "@/modules/catalog/queries";
import type { SectionInstance, Zone } from "@/themes/types";

/** Datos del listado cuando la página es el catálogo (/productos o /categorias/[slug]). */
export type CollectionData = {
  /** Ruta base del listado, sin query (/productos o /categorias/<slug>). */
  basePath: string;
  q: string;
  categoria: string;
  page: number;
  pages: number;
  perPage: number;
  list: ProductList;
  tree: CategoryNode[];
  all: Category[];
  /** Categoría activa (la de la URL), si hay. */
  active: Category | null;
};

/** Props que recibe TODA sección del motor de temas. */
export type SectionProps = {
  ctx: StorefrontContext;
  section: SectionInstance;
  zone: Zone;
  /** Solo en la ficha de producto. */
  product?: ProductDetail;
  /** Solo en el catálogo. */
  collection?: CollectionData;
  /** Productos ya cargados que otra sección quiera reutilizar (p. ej. relacionados). */
  related?: Product[];
};

export type SectionComponent = (props: SectionProps) => React.ReactNode | Promise<React.ReactNode>;

/* Lectura segura de ajustes (vienen de JSON editado por el dueño). */
type Cfg = Record<string, unknown>;
export const str = (c: Cfg, k: string, d = ""): string => (typeof c[k] === "string" ? (c[k] as string).trim() : d);
export const num = (c: Cfg, k: string, d: number): number => {
  const n = Number(c[k]);
  return Number.isFinite(n) && n > 0 ? n : d;
};
export const bool = (c: Cfg, k: string, d = false): boolean => (typeof c[k] === "boolean" ? (c[k] as boolean) : d);
