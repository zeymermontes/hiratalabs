import { visibleSections } from "@/themes/resolve";
import type { SectionInstance } from "@/themes/types";
import { SECTIONS_A } from "./sections/a";
import { SECTIONS_B } from "./sections/b";
import type { SectionComponent, SectionProps } from "./types";

const REGISTRY: Record<string, SectionComponent> = { ...SECTIONS_A, ...SECTIONS_B };

/**
 * Pinta una lista de secciones. Cada una va envuelta en un marco con su
 * esquema de color (data-scheme) y su tipo/variante, para que los estilos de
 * la biblioteca y los efectos de movimiento se apliquen sin saber nada de ella.
 */
export function Sections({ list, ...rest }: { list: SectionInstance[] } & Omit<SectionProps, "section">) {
  return (
    <>
      {visibleSections(list).map((section) => {
        const Component = REGISTRY[section.type];
        if (!Component) return null;
        return (
          <div
            key={section.id}
            id={`s-${section.id}`}
            className="sf-s"
            data-scheme={section.scheme ?? "base"}
            data-section={section.type}
            data-variant={section.variant ?? "default"}
          >
            <Component {...rest} section={section} />
          </div>
        );
      })}
    </>
  );
}
