# Motor de temas del storefront

Un **tema es datos**, no código. Cada tienda tiene un documento (`ThemeDoc`) con
ajustes globales y listas de secciones por página. Las secciones salen de una
**biblioteca compartida** con variantes, así que una plantilla nueva es un archivo
de datos que combina piezas que ya existen.

```
ThemeDoc
├─ settings   esquemas de color (base, alt, invert, accent), fuentes, escala,
│             botones, tarjetas, proporción, movimiento, ancho, textura, logo
├─ groups     header: [anuncio, encabezado]   footer: [pie]
└─ pages      home: [...]   product: [ficha, ...]   collection: [encabezado, rejilla, ...]
```

## Dónde vive cada cosa

| Qué | Dónde |
|---|---|
| Tipos (`ThemeDoc`, `SectionDef`, `TemplateDef`) | `src/themes/types.ts` |
| Biblioteca de secciones: variantes, ajustes, bloques, zonas | `src/themes/sections.ts` |
| Plantillas (una por archivo) y su índice | `src/themes/templates/` |
| Validar / completar documentos, temas viejos, variables CSS | `src/themes/resolve.ts` |
| Fuentes permitidas (con sus ejes reales y su ancho, que usan los titulares gigantes) | `src/themes/fonts.ts` |
| Borrador, publicar, versiones, restaurar | `src/themes/versions.ts` (tabla `theme_versions`, migración 0014) |
| Vista previa firmada del borrador | `src/themes/preview.ts` + `src/proxy.ts` + `PreviewBridge` |
| Componentes de cada sección | `src/components/storefront/theme/sections/{a,b}/` |
| Estilos globales del tema (movimiento, tarjetas, botones, texturas) | `src/app/store/[host]/theme.css` |
| Estilos de las secciones | `src/app/store/[host]/sections-a.css`, `sections-b.css` |
| Editor visual del panel | `src/app/(admin)/sites/[id]/design/` |
| Catálogo de las tiendas demo | `src/themes/demo-catalog.ts` + `scripts/seed-demos.mjs` |
| Landing del producto (app.hiratalabs.com sin sesión) y sus capturas | `src/app/inicio/`, `public/plantillas/`, `scripts/shoot-templates.mjs` |

## Agregar una plantilla (lo semanal)

1. Copia una plantilla parecida en `src/themes/templates/<clave>.ts`. Cambia:
   - `key`, `name`, `description`, `tags` (giros), `highlights` (2–3 rasgos que la distinguen).
   - `demo`: la industria de su tienda demo (una clave de `DEMO_CATALOG`; agrega una si es un giro nuevo).
   - `styles`: 2–3 paletas alternas.
   - `doc.settings`: esquemas, fuentes **del catálogo**, botones, tarjetas, movimiento, textura.
   - `doc.groups` y `doc.pages`: qué secciones, en qué orden, con qué variante y esquema.
2. Agrégala al arreglo de `src/themes/templates/index.ts`.
3. `npm run check-themes`: valida secciones, variantes, zonas, bloques, colores,
   fuentes y **contraste** (texto ≥ 4.5, botón ≥ 3). Tiene que salir en 0 errores.
4. `npm run seed-demos -- <clave>`: crea `demo-<clave>.<dominio>` con catálogo y
   fotos de Pixabay (necesita `PIXABAY_API_KEY`; también acepta `PEXELS_API_KEY`).
5. Revísala en celular y escritorio (la demo y el editor tienen selector de dispositivo).
6. `npm run shoot-templates -- <clave>` (con la demo ya en producción): genera sus capturas
   en `public/plantillas/` para la landing de `app.hiratalabs.com` (galería de plantillas).
   Sube las imágenes junto con el código. La categoría (`category`) decide en qué filtro aparece.

Que se sienta única viene de **combinar**: variante de encabezado + variante de
portada + tarjeta + movimiento + tipografía + esquemas. Cambiar solo colores no
cuenta como plantilla nueva.

## Agregar una sección o variante (cuando la biblioteca se queda corta)

1. Defínela en `src/themes/sections.ts` (zonas, variantes, ajustes, bloques).
2. Escribe su componente en `src/components/storefront/theme/sections/{a|b}/` y
   regístralo en el `index.ts` de esa carpeta.
3. Estilos solo con variables `--sf-*` y clases `sf-*`. Respeta
   `prefers-reduced-motion` y que no haya scroll horizontal a 375 px.
4. El editor arma su formulario solo con la definición: no hay UI que escribir.

Una variante nueva la pueden usar **todas** las plantillas.

## Reglas

- El documento siempre pasa por `normalizeDoc` antes de usarse: limpia colores,
  fuentes, secciones desconocidas y asegura las obligatorias.
- Las tiendas anteriores al motor no se migran: `legacyToDoc` traduce al vuelo su
  `sites.theme` y sus `home_sections`. Al primer guardado en el editor quedan en
  el formato nuevo.
- Publicar archiva la versión anterior (se guardan 15) y copia plantilla, colores
  y fuentes a `sites.theme` para correos y resumen.
- El iframe del editor ve el borrador con un token firmado (`?__preview=`), válido
  12 horas, que solo sirve para ver ese borrador.
