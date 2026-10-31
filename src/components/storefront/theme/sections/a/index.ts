import type { SectionComponent } from "../../types";
import { Announcement } from "./announcement";
import { Countdown } from "./countdown";
import { Footer } from "./footer";
import { Gallery } from "./gallery";
import { Header } from "./header";
import { Hero } from "./hero";
import { Marquee } from "./marquee";
import { RichText } from "./rich-text";
import { Testimonials } from "./testimonials";
import { Video } from "./video";

/** Encabezado, pie, portada y secciones de contenido visual. */
export const SECTIONS_A: Record<string, SectionComponent> = {
  announcement: Announcement,
  header: Header,
  footer: Footer,
  hero: Hero,
  marquee: Marquee,
  countdown: Countdown,
  testimonials: Testimonials,
  gallery: Gallery,
  video: Video,
  rich_text: RichText,
};
