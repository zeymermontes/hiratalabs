import type { TemplateDef } from "../types";
import { lumen } from "./lumen";

/**
 * Catálogo de plantillas. Agregar una plantilla nueva = un archivo de datos
 * en esta carpeta + su línea aquí. No lleva código propio: combina secciones
 * y variantes de la biblioteca, esquemas de color, tipografía y movimiento.
 */
export const THEME_TEMPLATES: TemplateDef[] = [lumen];

export const TEMPLATE_BY_KEY: Record<string, TemplateDef> = Object.fromEntries(THEME_TEMPLATES.map((t) => [t.key, t]));

export const DEFAULT_TEMPLATE = "lumen";
