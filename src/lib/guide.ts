export type GuideContext = {
  rootDomain: string;
  socialKeys: string[];
  customKeys: string[];
  exampleSlug: string;
};

/**
 * The contract handed to whoever (or whatever) builds a landing page.
 * Copied verbatim into an AI assistant before it writes the site.
 */
export function buildGuide(ctx: GuideContext): string {
  const socials = ctx.socialKeys.length ? ctx.socialKeys.join(", ") : "instagram, facebook, x, linkedin, tiktok, youtube";
  const customList = ctx.customKeys.length
    ? ctx.customKeys.map((k) => `- \`site.custom.${k}\``).join("\n")
    : "- (todavía no hay valores personalizados definidos en el panel)";

  return `# Cómo construir una landing para la plataforma de ${ctx.rootDomain}

Vas a generar una landing page **estática** que se sube como archivo \`.zip\` a nuestro panel.
El panel la publica en \`${ctx.exampleSlug}.${ctx.rootDomain}\`, en \`${ctx.rootDomain}\` si es el sitio principal,
o en el dominio propio del cliente. Además e
**inyecta automáticamente** los datos de contacto configurados. Sigue este contrato al pie de la letra.

---

## 1. Estructura del ZIP

Esta es la estructura exacta que se espera. Respétala: el importador busca
\`index.html\` en la raíz y sirve todo lo demás por ruta relativa.

\`\`\`
landing.zip
├── index.html            ← obligatorio, en la raíz del ZIP
├── 404.html              ← opcional, se sirve cuando la URL no existe
├── gracias.html          ← opcional, responde en /gracias y en /gracias.html
├── favicon.ico           ← obligatorio (ver sección 2)
├── favicon.svg           ← recomendado
├── apple-touch-icon.png  ← recomendado, 180×180
├── site.webmanifest      ← opcional
├── robots.txt            ← opcional
├── landing.json          ← opcional, configura el chat (ver sección 9)
└── assets/
    ├── css/
    │   └── style.css
    ├── js/
    │   └── main.js       ← opcional
    ├── img/
    │   ├── hero.webp
    │   └── og-image.jpg  ← 1200×630 para redes sociales
    └── fonts/
        └── *.woff2       ← solo si usas tipografías propias
\`\`\`

Reglas:

- \`index.html\` **en la raíz del ZIP**, no dentro de una carpeta. Comprime desde *adentro* de la carpeta del
  proyecto. Si aun así todo queda envuelto en una sola carpeta, el importador la detecta y la quita.
- **Rutas relativas siempre**: \`./assets/css/style.css\`, \`./assets/img/hero.webp\`. Nunca rutas absolutas a
  otro dominio, ni \`/assets/...\` con diagonal inicial.
- **Sin CDNs externos.** Nada de Google Fonts por \`<link>\`, Font Awesome, jQuery desde unpkg, Tailwind por CDN.
  Descarga lo que necesites a \`assets/\` y sírvelo desde ahí. Si necesitas tipografías, ponlas en
  \`assets/fonts/\` y declara \`@font-face\`.
- Extensiones permitidas: html, css, js, mjs, json, xml, txt, svg, png, jpg, jpeg, gif, webp, avif, ico,
  woff, woff2, ttf, otf, mp4, webm, mp3, pdf, webmanifest, map. **Todo lo demás se descarta al importar.**
- **Sin build step, sin backend, sin Node.** Si usas un framework, exporta a HTML estático antes de comprimir.
- Imágenes en \`.webp\` o \`.avif\` cuando se pueda, con \`loading="lazy"\` en todo lo que no esté en el primer
  pantallazo.

---

## 2. Favicon

**Toda landing debe traer su propio favicon.** Es lo que distingue una pestaña de otra y sin él el navegador
muestra un ícono genérico. Genera los archivos y ponlos **en la raíz del ZIP**, no dentro de \`assets/\`.

Archivos:

| Archivo | Tamaño | Para qué |
|---|---|---|
| \`favicon.ico\` | 32×32 (o multi-tamaño 16/32/48) | Navegadores viejos, obligatorio |
| \`favicon.svg\` | vectorial | Navegadores modernos, escala perfecto |
| \`apple-touch-icon.png\` | 180×180 | iOS al guardar en pantalla de inicio |

Y en el \`<head>\` de **todas** las páginas:

\`\`\`html
<link rel="icon" href="./favicon.ico" sizes="32x32">
<link rel="icon" href="./favicon.svg" type="image/svg+xml">
<link rel="apple-touch-icon" href="./apple-touch-icon.png">
\`\`\`

El favicon debe salir de la identidad del cliente: su logotipo, su inicial o su símbolo, sobre un fondo que
contraste. Si el logo es horizontal, usa solo el símbolo o la inicial — a 32 píxeles un logotipo completo
no se lee. Nada de emojis genéricos ni de dejar el favicon por defecto del framework.

---

## 3. Nunca escribas los datos de contacto a mano

El correo, teléfono, WhatsApp, dirección y redes sociales **se administran desde el panel**.
Si los hardcodeas, dejan de actualizarse y el cliente tendrá datos viejos para siempre.

Tienes dos formas de usarlos. Puedes mezclarlas.

### Opción A — atributos \`data-site\` (recomendada)

El texto o el enlace se rellenan solos en el navegador:

\`\`\`html
<!-- Texto -->
<p data-site="email"></p>
<p data-site="phone"></p>
<p data-site="address"></p>
<span data-site="brandName"></span>
<span data-site="custom.horario"></span>

<!-- Enlaces: el href se arma solo -->
<a data-site-href="email" data-site="email"></a>          <!-- mailto: -->
<a data-site-href="phone" data-site="phone"></a>          <!-- tel: -->
<a data-site-href="whatsapp">Escríbenos por WhatsApp</a>   <!-- https://wa.me/... -->
<a data-site-href="address">Cómo llegar</a>                <!-- Google Maps -->
<a data-site-href="instagram" aria-label="Instagram">…</a>
<a data-site-href="linkedin" aria-label="LinkedIn">…</a>

<!-- Atributos arbitrarios: "atributo:clave" separados por coma -->
<img data-site-attr="src:custom.logo, alt:brandName">
\`\`\`

**Comportamiento importante:** si un valor está vacío en el panel, el elemento **se oculta solo**.
Así nunca queda un enlace de WhatsApp roto. Si quieres que se muestre aunque esté vacío, agrega \`data-site-keep\`.
Si quieres ocultar el contenedor entero (por ejemplo el \`<li>\` que envuelve el ícono), pon
\`data-site-hide-parent\` en ese contenedor.

### Opción B — placeholders en el HTML

Se sustituyen en el servidor antes de mandar la página:

\`\`\`html
<a href="mailto:{{site.email}}">{{site.email}}</a>
<a href="{{site.whatsappHref}}">WhatsApp</a>
<meta property="og:site_name" content="{{site.brandName}}">
<p>&copy; {{site.year}} {{site.brandName}}</p>
\`\`\`

Una clave que no exista se reemplaza por texto vacío, nunca se ve el \`{{ }}\` en pantalla.

---

## 4. Valores disponibles

Todos viven también en \`window.__SITE__\` por si necesitas leerlos desde tu propio JS.

| Clave | Contenido |
|---|---|
| \`site.brandName\` | Nombre de la marca |
| \`site.email\` | Correo público |
| \`site.emailHref\` | \`mailto:…\` listo para un href |
| \`site.phone\` | Teléfono tal como se capturó |
| \`site.phoneHref\` | \`tel:…\` |
| \`site.whatsapp\` | Número de WhatsApp |
| \`site.whatsappHref\` | \`https://wa.me/…\` |
| \`site.address\` | Dirección |
| \`site.addressHref\` | Enlace a Google Maps |
| \`site.socials.<red>\` | URL de cada red: ${socials} |
| \`site.year\` | Año actual, útil para el footer |
| \`site.name\` / \`site.host\` | Nombre interno del sitio y dominio donde se sirve |

Valores personalizados configurados hoy en el panel:

${customList}

---

## 5. Formulario de contacto

**No uses Formspree, Netlify Forms, Google Forms ni \`mailto:\` en el \`action\`.**
La plataforma recibe el envío, lo guarda y lo manda por correo (Resend) a quien esté configurado en el panel.

Marca el formulario con \`data-site-form\`:

\`\`\`html
<form data-site-form="contacto">
  <input name="nombre"   type="text"     required placeholder="Nombre">
  <input name="email"    type="email"    required placeholder="Correo">
  <input name="telefono" type="tel"               placeholder="Teléfono">
  <textarea name="mensaje" required placeholder="¿En qué te ayudamos?"></textarea>

  <button type="submit">Enviar</button>

  <p data-site-form-success hidden>¡Gracias! Te contactamos pronto.</p>
  <p data-site-form-error   hidden>No se pudo enviar. Intenta de nuevo.</p>
</form>
\`\`\`

Reglas:

- El \`name\` de cada campo puede ser lo que quieras; todos se guardan y se mandan en el correo.
- Usa \`nombre\`/\`name\`, \`email\`/\`correo\`, \`telefono\`/\`phone\`, \`mensaje\`/\`message\` para los campos
  principales: así el panel los muestra en columnas y el correo sale con *reply-to* al visitante.
- Nombres que empiezan con \`_\` están reservados; no los uses.
- El anti-spam (honeypot y control de tiempo) se inyecta solo. No agregues captcha.
- Mientras se envía, el formulario tiene \`data-state="sending"\`, luego \`"sent"\` o \`"error"\`.
  Puedes usarlo para animaciones: \`form[data-state="sending"] button { opacity:.6 }\`.
- Para redirigir a una página de gracias: \`<form data-site-form data-site-form-redirect="/gracias">\`.
- Eventos DOM disponibles: \`site:sent\` y \`site:error\` (burbujean).
- Varios formularios por página: dale a cada uno un nombre distinto, \`data-site-form="newsletter"\`.

---

## 6. Checklist antes de comprimir

1. ¿\`index.html\` está en la raíz del ZIP?
2. ¿Están \`favicon.ico\`, \`favicon.svg\` y \`apple-touch-icon.png\` en la raíz, con sus \`<link>\` en el \`<head>\`?
3. ¿Los assets siguen la estructura \`assets/css\`, \`assets/js\`, \`assets/img\`, \`assets/fonts\`?
4. ¿Cero CDNs externos? (fuentes, íconos y librerías descargados a \`assets/\`)
5. ¿Cero correos, teléfonos o links de redes escritos a mano en el HTML?
6. ¿El formulario usa \`data-site-form\` y no un servicio externo?
7. ¿Todas las rutas son relativas, con \`./\` y sin diagonal inicial?
8. ¿La página se ve bien si **todos** los datos de contacto estuvieran vacíos?
9. ¿Responsive y con \`<meta name="viewport" content="width=device-width, initial-scale=1">\`?
10. ¿Título, descripción y \`og:image\` (1200×630) puestos?
11. ¿La esquina inferior derecha está libre y el footer tiene \`padding-bottom\` para el chip? (sección 8)

---

## 7. Ejemplo mínimo completo

\`\`\`html
<!doctype html>
<html lang="es">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>{{site.brandName}}</title>
  <meta name="description" content="…">

  <link rel="icon" href="./favicon.ico" sizes="32x32">
  <link rel="icon" href="./favicon.svg" type="image/svg+xml">
  <link rel="apple-touch-icon" href="./apple-touch-icon.png">

  <meta property="og:title" content="{{site.brandName}}">
  <meta property="og:image" content="./assets/img/og-image.jpg">

  <link rel="stylesheet" href="./assets/css/style.css">
</head>
<body>
  <header>
    <h1 data-site="brandName"></h1>
  </header>

  <main>
    <section id="contacto">
      <ul>
        <li data-site-hide-parent><a data-site-href="email" data-site="email"></a></li>
        <li data-site-hide-parent><a data-site-href="phone" data-site="phone"></a></li>
        <li data-site-hide-parent><a data-site-href="whatsapp">WhatsApp</a></li>
        <li data-site-hide-parent><a data-site-href="instagram">Instagram</a></li>
      </ul>

      <form data-site-form="contacto">
        <input name="nombre" required placeholder="Nombre">
        <input name="email" type="email" required placeholder="Correo">
        <textarea name="mensaje" required placeholder="Mensaje"></textarea>
        <button type="submit">Enviar</button>
        <p data-site-form-success hidden>¡Gracias! Te contactamos pronto.</p>
        <p data-site-form-error hidden>Hubo un error, intenta de nuevo.</p>
      </form>
    </section>
  </main>

  <footer>
    <p>&copy; {{site.year}} {{site.brandName}} — <span data-site="address"></span></p>
  </footer>
</body>
</html>
\`\`\`

Entrega el resultado como un ZIP con la estructura de la sección 1: \`index.html\` y los favicons en la raíz,
todo lo demás dentro de \`assets/\`.

---

## 8. Espacio reservado para el chat y el chip

Las landings que viven en un subdominio de \`${ctx.rootDomain}\` muestran un chip flotante abajo a la derecha.
Lo inyecta la plataforma, va aislado en un shadow DOM y no hereda el CSS de la página: **no lo agregues tú ni
intentes ocultarlo**. Desaparece solo cuando el sitio se sirve desde el dominio propio del cliente.

**Deja libre esta zona:**

\`\`\`
                                    ┌──────────────────────┐
   esquina inferior derecha    →    │  Powered by …        │  ~44 px de alto
   ~200 × 44 px, más 16 px          └──────────────────────┘
   de margen al borde                        ↕ 16 px
   ─────────────────────────────────────────────────────────  borde inferior
\`\`\`

Reglas concretas:

1. **No pongas nada \`position: fixed\` en la esquina inferior derecha.** Ni botón de WhatsApp, ni widget de
   chat, ni "volver arriba", ni banner de cookies anclado a esa esquina.
2. **Si necesitas un botón flotante, ponlo abajo a la izquierda:**
   \`\`\`css
   .fab { position: fixed; left: 20px; bottom: 20px; }
   \`\`\`
3. **Dale aire al footer.** En móvil el chip se encima del contenido final si el footer termina pegado al
   borde. Agrega \`padding-bottom: 72px\` al footer, o \`80px\` si tu footer tiene texto en la última línea:
   \`\`\`css
   footer { padding-bottom: 72px; }
   @media (min-width: 768px) { footer { padding-bottom: 48px; } }
   \`\`\`
4. **Nada crítico en esa esquina**: ni un enlace, ni un dato de contacto, ni parte de una imagen que importe.

Si de todas formas hay algo fijo ahí, el chip lo detecta y se acomoda encima —también cuando el widget carga
tarde—, pero el resultado se ve mejor si dejas el espacio desde el diseño.

Si por alguna razón la esquina derecha es intocable, puedes moverlo a la izquierda con un atributo en el
\`<body>\`:

\`\`\`html
<body data-site-badge="left">
\`\`\`

---

## 9. Chat de cotización con IA

Algunos sitios tienen activado un **chat de cotización**: un botón flotante que abre una conversación
guiada, hace una llamada a un modelo para proponer preguntas de seguimiento según lo que describió el
visitante, y al final manda todo por el mismo camino que el formulario de contacto.

**Lo inyecta la plataforma. No lo construyas tú** ni agregues un chat propio: se activa o se apaga desde el
panel, sin volver a subir el ZIP.

Qué significa para tu diseño:

1. **La esquina inferior derecha queda ocupada por dos cosas**: el botón del chat y, encima, el chip
   "Powered by". Reserva unos 200 × 120 px ahí y manda cualquier botón flotante tuyo a la izquierda.
2. **Si el chat va a reemplazar al formulario**, envuelve la sección del formulario en un contenedor con
   \`data-site-form-section\` para que se oculte el bloque completo —título, texto de apoyo y formulario— y
   no quede un encabezado suelto sobre un hueco:
   \`\`\`html
   <section id="contacto" data-site-form-section>
     <h2>Escríbenos</h2>
     <p>Te contestamos el mismo día.</p>
     <form data-site-form="contacto"> … </form>
   </section>
   \`\`\`
3. **Diseña siempre el formulario de todas formas.** El chat puede estar apagado, y en ese caso el
   formulario es la única vía de contacto. Nunca dependas de que el chat exista.
4. **No pongas un aviso tipo "chatea con nosotros"** apuntando a una esquina: el botón trae su propia
   etiqueta, configurable desde el panel.

### Incluye \`landing.json\` en el ZIP

Pon un archivo **\`landing.json\` en la raíz del ZIP** con la configuración del chat. Al importar, el panel
lo lee y **prellena los campos** en la pestaña Chat IA, así nadie tiene que copiar y pegar nada a mano.

\`\`\`json
{
  "chat": {
    "launcherLabel": "Cotiza aquí",
    "welcome": "Te hago unas preguntas rápidas para preparar tu cotización. No doy precios automáticos: una persona revisa todo.",
    "replacesForm": false,
    "serviceOptions": [
      "Software a la medida",
      "App móvil",
      "Página web o landing",
      "Automatización de flujos",
      "Integraciones y APIs"
    ],
    "scope": {
      "negocio": "Estudio de desarrollo de software en CDMX. Plataformas a la medida, integraciones y apps móviles. Proyectos desde 3 meses.",
      "servicios": [
        "Plataformas web a la medida",
        "Apps móviles iOS y Android",
        "Integraciones con ERP y CRM"
      ],
      "fuera_de_alcance": [
        "Hosting y soporte de infraestructura",
        "Diseño de marca",
        "Campañas de publicidad"
      ],
      "no_responder": [
        "preguntas generales de programación",
        "traducciones o redacción de textos",
        "tareas escolares",
        "cualquier tema ajeno al proyecto que describe la persona"
      ],
      "idioma": "es"
    }
  }
}
\`\`\`

Cómo se aplica, para que no haya sorpresas:

- **El archivo no se publica.** El panel lo saca del ZIP al importar; nunca queda accesible en el sitio.
- **Solo rellena lo que esté vacío.** Si el administrador ya escribió algo en un campo, eso gana y el panel
  avisa qué respetó. Volver a subir el ZIP no pisa configuración hecha a mano.
- **No enciende el chat.** Cada conversación cuesta dinero, así que activarlo es siempre una decisión del
  administrador desde el panel.
- **No puede tocar proveedor, modelo, llaves ni topes.** Esos son ajustes de la plataforma, no de la landing.
  Cualquier campo desconocido se ignora.
- Si el JSON está mal formado, la subida sigue adelante y el panel lo reporta, en vez de fallar.

Campos de \`chat\`:

| Campo | Para qué sirve |
|---|---|
| \`launcherLabel\` | Texto del botón flotante. Máximo 60 caracteres. |
| \`welcome\` | Primer mensaje del asistente. Vacío = un texto por defecto. |
| \`replacesForm\` | \`true\` si el chat sustituye al formulario. Solo aplica la primera vez. |
| \`serviceOptions\` | Opciones de la primera pregunta. Máximo 8, de 80 caracteres. |
| \`scope\` | Las restricciones del asistente. Va tal cual al campo "a qué se dedica el negocio". |

Campos de \`scope\`:

| Campo | Para qué sirve |
|---|---|
| \`negocio\` | Una o dos frases sobre a qué se dedica. Es el contexto que aterriza las preguntas. |
| \`servicios\` | Lo que el negocio sí vende. El asistente pregunta solo alrededor de esto. |
| \`fuera_de_alcance\` | Lo que no vende. Evita preguntas que ilusionan al cliente con algo que no existe. |
| \`no_responder\` | Temas ante los cuales el asistente devuelve cero preguntas y sigue con el guion fijo. |
| \`idioma\` | Código del idioma en que deben salir las preguntas. |

Reglas:

- **Valida el JSON antes de entregarlo.** Si no parsea, se pierden las restricciones.
- Máximo 12 elementos por lista, 160 caracteres cada uno. Lo que sobre se recorta.
- \`negocio\` se recorta a 900 caracteres.
- **Sé específico en \`fuera_de_alcance\`.** Es lo que evita que el chat levante expectativas de servicios
  que el cliente no da.

Lo que este bloque **no** puede hacer, porque se aplica del lado del servidor y ninguna configuración lo
puede aflojar: el asistente nunca responde preguntas, nunca escribe código ni textos, nunca cambia de rol
y nunca devuelve otra cosa que preguntas de seguimiento. Lo que escribe el visitante se trata como dato,
no como instrucción. Este bloque solo puede **estrechar** el alcance, nunca ampliarlo.
`;
}
