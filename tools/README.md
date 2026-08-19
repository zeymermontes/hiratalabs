# De Claude Design a landing publicada

Herramientas para convertir un export de Claude Design en un ZIP listo para el
panel, y las notas de lo que se aprendió haciéndolo a mano.

Los proyectos de clientes **no** viven aquí: van en `local/`, que está fuera de
git porque este repo es público. Aquí solo está el código, que no tiene nada
privado.

---

## Qué produce Claude Design

Al exportar un proyecto salen **dos ZIP distintos**, y solo uno sirve para publicar:

| ZIP | Contiene | Para qué |
|---|---|---|
| `Landing page X.zip` | `landing-export/` con el sitio estático | **Este es el que se publica** |
| `Landing page X (1).zip` | `design_handoff_*/` con un `.dc.html` y un README | Referencia de diseño |

El `.dc.html` es el lienzo del editor, no código de producción. **Nunca lo subas al panel**: su
sintaxis es del editor y trae APIs que solo existen dentro de la vista previa de Claude Design
(por ejemplo `window.claude.complete`, que no existe en un sitio desplegado).

El `landing-export/` normalmente ya cumple el contrato de la plataforma: `index.html` en la raíz,
`assets/css|js|img`, favicons, `robots.txt` y `site.webmanifest`.

---

## Cómo está organizado

```
tools/                    en git
├── create-landing        el comando
├── prepare.mjs           el porteo que aplica --fix
├── make-favicons         generador de íconos
└── README.md             este archivo

local/                    fuera de git, una carpeta por cliente
├── hiratalabs/
│   ├── claude-design/    el proyecto tal como sale del editor
│   ├── sitio/            la carpeta preparada, lista para comprimir
│   ├── hiratalabs.zip    lo que se sube al panel
│   └── anteriores/       versiones que quedaron atrás
└── hirata-impresion/
    └── claude-design/    aún sin export estático
```

## Flujo completo

```bash
# 1. Descomprime el export dentro de la carpeta del proyecto
unzip "Landing page Cliente.zip" -d local/cliente/

# 2. Adáptalo al contrato y arma el ZIP
./tools/create-landing local/cliente/landing-export --fix --out local/cliente/cliente.zip

# 3. Completa los TODO de "scope" en landing.json si el sitio va a usar el chat

# 4. Sube el ZIP en admin.hiratalabs.com → el sitio → Publicación
```

### Qué hace `--fix`

Todo lo que antes se hacía a mano en cada porte:

| Paso | Qué resuelve |
|---|---|
| **Autoaloja las fuentes** | Descarga a `assets/fonts/` lo que el diseño cargaba de Google Fonts o fontsource, escribe los `@font-face`, quita los `<link>` al CDN y agrega `preload`. Una familia de un solo corte se declara con rango `400 900` para que el navegador no la engrose por su cuenta. |
| **Pone la fuente de marca al frente** | Si `ui-monospace` va antes que la del diseño, el sistema gana y la tipografía no se ve. |
| **Conecta el contacto al panel** | `mailto:`, `tel:`, `wa.me` y las redes pasan a `data-site-href`, así dejan de estar escritos a mano. |
| **Marca el formulario** | Le pone `data-site-form` y le quita el `action` externo. |
| **Escribe `landing.json`** | Deriva la paleta del chat de las variables `:root` del propio sitio y deja los campos de `scope` como TODO. |
| **Genera los favicons** | Si faltan, a partir de un logo del sitio. |

Nada se cambia en silencio: cada paso se reporta.

**Probado contra el export de Hirata Labs**: la paleta que deriva solo
—`#0C0A26 / #F3F6EA / #6641E0 / #B7D546`— es idéntica a la que escribí a mano.

El comando baja solo hasta encontrar `index.html`, así que da igual apuntarle a la carpeta que
envuelve o a la del sitio.

### Opciones

```
create-landing <carpeta> [--out archivo.zip] [--favicon imagen] [--force]

  --out      Ruta del ZIP. Por defecto <carpeta>.zip
  --favicon  Imagen de la que generar los favicons que falten
  --force    Arma el ZIP aunque haya errores
```

**Los favicons se generan solos.** Si el sitio no trae `favicon.ico` o
`apple-touch-icon.png`, el comando busca un logo dentro del proyecto —cualquier
imagen cuyo nombre incluya logo, isotipo, marca o icon— y genera el juego
completo: `.ico` multitamaño, `apple-touch-icon`, los dos PNG de Android y el
`site.webmanifest`. También declara los `<link>` en el `<head>` si faltaban.
Con `--favicon` le indicas cuál usar.

Para tenerlo a mano desde cualquier lugar:

```bash
echo 'alias create-landing="~/Documents/antigravity/landings/tools/create-landing"' >> ~/.zshrc
```

---

## Qué revisa, y por qué

**Errores** — bloquean el ZIP porque el sitio no funcionaría bien:

| Revisión | Por qué importa |
|---|---|
| `<form>` sin `data-site-form` | Sus envíos no llegan al panel ni al correo: el lead se pierde |
| `action` a otro dominio | Igual, y además saca los datos de tu control |
| Formspree, Netlify Forms y similares | La plataforma ya recibe los envíos; pagar por eso es redundante |
| Falta `<title>` o `meta viewport` | Rompe el compartido y el móvil |
| Más de 3000 archivos o 100MB | El panel lo rechaza al subir |

**Avisos** — el ZIP se arma, pero conviene corregir:

| Revisión | Por qué importa |
|---|---|
| `mailto:`, `tel:`, `wa.me`, links de redes escritos a mano | Dejan de actualizarse cuando cambies el dato en el panel |
| CDNs externos | La plataforma no los sirve; si el CDN cae o cambia, la landing se rompe |
| Faltan favicons | La pestaña queda con el ícono genérico |
| Sin `og:image` ni `meta description` | Se comparte feo en WhatsApp y redes |
| Ninguna página usa `data-site` | Los datos del panel no aparecen en ningún lado |
| Extensiones no permitidas | Se descartan al importar, sin avisar |

**Notas** — informativas, no hay nada que corregir.

---

## Convertir una landing que no cumple

Si el export trae los contactos escritos a mano, el cambio es mecánico:

```html
<!-- antes -->
<a href="mailto:hola@cliente.com">hola@cliente.com</a>
<a href="https://wa.me/525512345678">WhatsApp</a>

<!-- después -->
<a data-site-href="email" data-site="email"></a>
<a data-site-href="whatsapp">WhatsApp</a>
```

Y el formulario:

```html
<!-- antes -->
<form action="https://formspree.io/f/abc" method="post">

<!-- después -->
<form data-site-form="contacto">
```

Los elementos con `data-site` cuyo valor esté vacío en el panel **se ocultan solos**, así que no
queda un enlace roto. El contrato completo está en el panel, en **Guía para IA**, con botón de copiar.

---

## Después de subir

1. **Contacto** → correo, teléfono, WhatsApp, redes y los correos que reciben formularios
2. **Enviar prueba** → confirma que Resend entrega antes de que dependa un lead real
3. Llena el formulario tú mismo en la landing y verifica que aparezca en **Mensajes**
4. Si el sitio usa el chat: **Chat IA** → activar y pegar el bloque JSON de restricciones

---

## Cosas que se olvidan

- El slug **`www`** es el único que responde en `hiratalabs.com` además de `www.hiratalabs.com`.
- Un sitio en `draft` responde 503 con el aviso de mantenimiento. Hay que ponerlo **En línea**.
- Publicar es apuntar a otra versión: **volver atrás es instantáneo** desde la pestaña Publicación.
- Las landings en subdominio traen el chip "Powered by" abajo a la derecha. Los dominios propios no.
- Cambiar datos de contacto **no requiere volver a subir el ZIP**: se inyectan en cada request.

---

## Cuando el cliente no tiene fotos

Los diseños de Claude Design suelen dejar marcos rayados como lugar reservado. Si
el cliente todavía no tiene fotografía propia, el hueco se llena con fotos de banco
y se deja listo para el cambio:

1. **Fuente.** Solo Pexels: licencia de uso comercial y sin atribución obligatoria.
   Su buscador bloquea `curl` (403) pero WebFetch sí lee las páginas de resultados,
   y el CDN descarga directo con
   `https://images.pexels.com/photos/<id>/pexels-photo-<id>.jpeg?w=1600`.
   Unsplash pide llave (401 en búsqueda y en la página de cada foto). StockSnap
   responde pero su catálogo es lifestyle genérico. Openverse y Wikimedia Commons
   tienen poco material moderno de imprenta, y casi todo con share-alike.
2. **Criterios de descarte**, en este orden: marca de terceros legible (incluidas
   las calcomanías con el logo de Pexels), rostro de persona identificable, y foto
   clara sobre diseño oscuro — una imagen luminosa rompe una paleta carbón aunque
   el encuadre sea correcto.
3. **Catálogo.** `fotos/catalogo.mjs` mapea hueco → id de Pexels + `alt` + pie.
   `fotos/optimizar.mjs` descarga una vez a `fotos/originales/` (caché) y emite
   AVIF + WebP en dos anchos más un JPEG de respaldo. Escribe `fotos/creditos.json`.
4. **Foto real del cliente.** Se pone en `fotos/propias/<slug>.jpg` y el
   optimizador la prefiere sobre la descarga. No hay que tocar el generador.
5. **Legibilidad.** El texto del diseño va sobre el marco, así que la foto necesita
   un degradado detrás de las letras (`.foto::before` / `.pieza::before`), o el
   crema y el dorado dejan de leerse sobre zonas claras de la imagen.
6. **Honestidad.** La página lleva la nota de que es fotografía de referencia y no
   trabajos del taller. Sin eso, el portafolio afirma algo falso.

No se recorta a una proporción fija al generar: `object-fit: cover` recorta en el
navegador y así la imagen no pierde encuadre dos veces.
