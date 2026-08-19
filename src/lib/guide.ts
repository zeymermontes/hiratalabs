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

- \`index.html\` **en la raíz del ZIP** (no dentro de una carpeta).
- Rutas relativas para todo: \`./assets/style.css\`, \`./img/hero.webp\`. Nunca rutas absolutas a otro dominio.
- Opcional: \`404.html\` en la raíz — se sirve cuando la URL no existe.
- Subpáginas: \`gracias.html\` responde en \`/gracias\` y también en \`/gracias.html\`.
- Extensiones permitidas: html, css, js, mjs, json, xml, txt, svg, png, jpg, jpeg, gif, webp, avif, ico,
  woff, woff2, ttf, otf, mp4, webm, mp3, pdf, webmanifest, map.
- **Sin build step, sin backend, sin Node.** Si usas un framework, exporta a HTML estático antes de comprimir.
- Todo lo que no esté en la lista de extensiones se descarta al importar.

---

## 2. Nunca escribas los datos de contacto a mano

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

## 3. Valores disponibles

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

## 4. Formulario de contacto

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

## 5. Checklist antes de comprimir

1. ¿\`index.html\` está en la raíz del ZIP?
2. ¿Cero correos, teléfonos o links de redes escritos a mano en el HTML?
3. ¿El formulario usa \`data-site-form\` y no un servicio externo?
4. ¿Las rutas de imágenes, CSS y JS son relativas?
5. ¿La página se ve bien si **todos** los datos de contacto estuvieran vacíos?
6. ¿Responsive y con \`<meta name="viewport" content="width=device-width, initial-scale=1">\`?
7. ¿Título, descripción y \`og:image\` puestos?

---

## 6. Ejemplo mínimo completo

\`\`\`html
<!doctype html>
<html lang="es">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>{{site.brandName}}</title>
  <link rel="stylesheet" href="./assets/style.css">
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

Entrega el resultado como un ZIP con esta estructura:

\`\`\`
landing.zip
├── index.html
├── 404.html          (opcional)
└── assets/
    ├── style.css
    ├── script.js     (opcional)
    └── img/
\`\`\`
`;
}
