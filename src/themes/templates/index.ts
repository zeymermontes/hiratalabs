import type { TemplateDef } from "../types";
import { antojo } from "./antojo";
import { botica } from "./botica";
import { cava } from "./cava";
import { circuito } from "./circuito";
import { galeria } from "./galeria";
import { grid } from "./grid";
import { huella } from "./huella";
import { lumen } from "./lumen";
import { mercado } from "./mercado";
import { neon } from "./neon";
import { nido } from "./nido";
import { petalo } from "./petalo";
import { pulso } from "./pulso";
import { recreo } from "./recreo";
import { ruta } from "./ruta";
import { surco } from "./surco";
import { taller } from "./taller";

/**
 * Catálogo de plantillas. Agregar una plantilla nueva = un archivo de datos
 * en esta carpeta + su línea aquí. No lleva código propio: combina secciones
 * y variantes de la biblioteca, esquemas de color, tipografía y movimiento.
 * `npm run check-themes` valida que cada una use secciones y ajustes válidos.
 */
export const THEME_TEMPLATES: TemplateDef[] = [
  lumen, neon, huella, pulso, petalo, cava, circuito, recreo, nido, botica, surco, antojo, ruta,
  grid, mercado, galeria, taller,
];

export const TEMPLATE_BY_KEY: Record<string, TemplateDef> = Object.fromEntries(THEME_TEMPLATES.map((t) => [t.key, t]));

export const DEFAULT_TEMPLATE = "lumen";
