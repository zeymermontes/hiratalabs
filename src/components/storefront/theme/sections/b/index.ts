import type { SectionComponent } from "../../types";
import { BannerStripSection } from "./banner-strip";
import { CategoryTilesSection } from "./category-tiles";
import { CollectionGridSection } from "./collection-grid";
import { CollectionHeaderSection } from "./collection-header";
import { CtaBandSection } from "./cta-band";
import { CustomHtmlSection } from "./custom-html";
import { FaqSection } from "./faq";
import { FeaturesSection } from "./features";
import { ImageTextSection } from "./image-text";
import { LocationsSection } from "./locations";
import { ProductGridSection } from "./product-grid";
import { ProductMainSection } from "./product-main";
import { RelatedProductsSection } from "./related-products";

/** Secciones de catálogo y venta: productos, categorías, ficha y listado. */
export const SECTIONS_B: Record<string, SectionComponent> = {
  product_grid: ProductGridSection,
  category_tiles: CategoryTilesSection,
  image_text: ImageTextSection,
  features: FeaturesSection,
  faq: FaqSection,
  locations: LocationsSection,
  banner_strip: BannerStripSection,
  cta_band: CtaBandSection,
  custom_html: CustomHtmlSection,
  product_main: ProductMainSection,
  related_products: RelatedProductsSection,
  collection_header: CollectionHeaderSection,
  collection_grid: CollectionGridSection,
};
