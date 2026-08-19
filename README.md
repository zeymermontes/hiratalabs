# Landings — plataforma de landing pages

Panel para subir landings estáticas (ZIP), publicarlas en un subdominio de
`hiratalabs.com` o en el dominio propio del cliente, administrar los datos de
contacto desde un solo lugar y recibir los formularios por correo con Resend.

## Cómo funciona

```
Visitante → hiratalabs.com wildcard DNS → Render (este app)
                                            │
                          middleware lee el Host
                                            │
              ┌─────────────────────────────┴──────────────────────────┐
        admin.hiratalabs.com                    hiratalabs.com · *.hiratalabs.com
              │                                            dominios propios
        Panel de admin                                             │
                                            resuelve el sitio → estado del sitio
                                                        │
                                    live ───────────────┴───── maintenance / blocked
                                      │                              │
                    sirve el archivo desde Supabase Storage    página de aviso (503 / 403)
                                      │
                    si es HTML: inyecta window.__SITE__ + runtime
```

Puntos clave:

- **Los datos de contacto no viven en el ZIP.** Se inyectan en cada request, así que
  cambiar un teléfono en el panel se refleja al instante.
- **Cada sitio es dueño de sus datos.** No hay herencia de valores globales: lo que
  dejas vacío no se muestra, y el elemento que lo contenía se oculta solo.
- **Las landings en subdominio muestran un chip "Powered by"** abajo a la derecha,
  inyectado por la plataforma en un shadow DOM. Los dominios propios no lo llevan,
  y el sitio principal tampoco.
- **El chat de cotización con IA se enciende por sitio** desde el panel. Hace una sola
  llamada al modelo por conversación y, si falla, sigue con las preguntas fijas sin que
  el visitante note nada. El resultado entra por el mismo camino que el formulario.
- **Las versiones son inmutables.** Publicar es apuntar `sites.active_version_id` a otra
  versión; volver atrás es instantáneo.
- **Los formularios se guardan antes de enviarse.** Si Resend falla, el lead no se pierde.

## Puesta en marcha

### 1. Supabase

1. Crea el proyecto.
2. **SQL Editor** → ejecuta en orden [`drizzle/0000_init.sql`](drizzle/0000_init.sql),
   [`drizzle/0001_drop_global_settings.sql`](drizzle/0001_drop_global_settings.sql) y
   [`drizzle/0002_ai_chat.sql`](drizzle/0002_ai_chat.sql) y
   [`drizzle/0003_ai_models.sql`](drizzle/0003_ai_models.sql).
3. **Storage** → crea un bucket llamado `landings`, **privado**.
4. **Project Settings → API** → copia `URL`, `anon key` y `service_role key`.
5. **Project Settings → Database → Connection string** → pestaña **Session pooler** →
   cópialo a `DATABASE_URL` y reemplaza `[YOUR-PASSWORD]`. No uses *Direct connection*:
   es solo IPv6 y Render no la alcanza.
6. **Authentication → Providers → Email**: deja activo *Magic Link*, apaga *Confirm email*
   si quieres un login de un solo paso.
7. **Authentication → URL Configuration** → *Redirect URLs*: agrega
   `https://admin.hiratalabs.com/auth/callback`.
8. **Authentication → Emails → SMTP Settings**: apunta a Resend para que los magic links
   salgan de tu dominio — host `smtp.resend.com`, puerto `465` (SSL/TLS implícito), usuario
   `resend`, password = tu API key, remitente `noreply@hiratalabs.com`.

### 2. Resend

1. Verifica el dominio `hiratalabs.com` (registros SPF y DKIM).
2. Crea una API key → `RESEND_API_KEY`.
3. `RESEND_FROM="Hirata Labs <noreply@hiratalabs.com>"`.

> Sin dominio verificado, Resend solo entrega a tu propio correo. Verifícalo antes de
> configurar destinatarios de clientes.

### 3. Render

1. **New → Blueprint** apuntando a este repo (usa [`render.yaml`](render.yaml)),
   o **New → Web Service** con `npm ci && npm run build` / `npm run start`.
2. Plan **Starter** o superior. El free se duerme y una landing tardaría ~50s en despertar.
3. Carga las variables de entorno de [`.env.example`](.env.example).
4. **Settings → Custom Domains**, agrega:
   - `hiratalabs.com` (Render exige que el apex apunte al servicio para el wildcard)
   - `*.hiratalabs.com`
   - `admin.hiratalabs.com`
5. Render pedirá los CNAME `_acme-challenge` y `_cf-custom-hostname` para el wildcard:
   créalos en tu DNS. Son los que le permiten emitir y renovar el certificado.
6. **Account Settings → API Keys** → crea una key → guárdala como `DEPLOY_API_KEY`.
   Render reserva el prefijo `RENDER_` para sus propias variables, por eso no se llama
   `RENDER_API_KEY`.
7. No necesitas configurar el ID ni el host del servicio: Render inyecta
   `RENDER_SERVICE_ID` y `RENDER_EXTERNAL_HOSTNAME` por su cuenta y el app los lee.

### 4. DNS de hiratalabs.com

GoDaddy no soporta ALIAS/ANAME en el apex, así que el raíz va con un registro A.

| Acción | Tipo | Nombre | Valor |
|---|---|---|---|
| borrar | A | `@` | los registros del host anterior |
| borrar | AAAA | cualquiera | Render exige que no haya AAAA en el dominio |
| agregar | A | `@` | `216.24.57.1` (load balancer de Render) |
| agregar | CNAME | `*` | `<tu-servicio>.onrender.com` |
| agregar | CNAME | `www` | `<tu-servicio>.onrender.com` |
| agregar | CNAME | `admin` | `<tu-servicio>.onrender.com` |
| agregar | CNAME | `_acme-challenge` | `<srv-id>.verify.renderdns.com` |
| agregar | CNAME | `_cf-custom-hostname` | `<srv-id>.hostname.renderdns.com` |

Los dos últimos son los que le permiten a Render emitir y renovar el certificado
wildcard. Más los registros SPF/DKIM que pida Resend.

### 5. Sitio principal (hiratalabs.com)

La home de `hiratalabs.com` se sube desde el panel como cualquier otra landing.
Crea un sitio con el subdominio **`www`**: ese sitio responde en `hiratalabs.com`
y en `www.hiratalabs.com`. El panel vive aparte, en `admin.hiratalabs.com`.

### 6. Primer acceso

Pon tu correo en `BOOTSTRAP_ADMIN_EMAIL`. Mientras la tabla `admins` esté vacía, ese correo
puede entrar y queda registrado como admin. Después, solo entran los correos de esa tabla
(agrégalos con un `insert` en Supabase).

## Diagnosticar la conexión a la base

Si el deploy se queda en "Deploying" o `/api/health` responde 503:

```bash
npm run check-db "postgresql://postgres.xxxx:PASSWORD@aws-0-us-east-2.pooler.supabase.com:5432/postgres"
```

Imprime cómo se interpreta el string (sin mostrar la contraseña), avisa de los
errores típicos —placeholder sin reemplazar, usuario equivocado para el pooler,
`$` que Next expande, la conexión directa que es IPv6— e intenta conectarse.

## Desarrollo local

```bash
cp .env.example .env.local     # rellena los valores
npm install
npm run dev
```

- Panel: <http://localhost:3000>
- Landing de prueba: `http://<slug>.localhost:3000`

## Dominios propios de clientes

1. Panel → sitio → **Dominios** → agregar `www.cliente.com`.
   El app lo da de alta en Render por API.
2. El cliente crea el CNAME que muestra el panel.
3. Render emite el certificado solo. Botón **Revisar** para refrescar el estado.
4. Cuando queda `verified`, el dominio empieza a servir la landing.

## Chat de cotización con IA

Se activa por sitio en la pestaña **Chat IA**. El flujo es una guía de preguntas fijas
—tipo de proyecto, descripción, plazo, nombre, correo, teléfono— con **una sola** llamada
al modelo a media conversación, que propone hasta dos preguntas de seguimiento según lo
que describió el visitante. Si esa llamada falla, tarda o se agota el tope mensual, el
chat continúa con las preguntas fijas y el visitante no ve ningún error.

Proveedores soportados: Anthropic, OpenAI, Google, Groq y DeepSeek. Las llaves se
guardan cifradas con AES-256-GCM usando `ENCRYPTION_KEY`. Cada sitio elige entre la
llave de la plataforma (**Llaves de IA**) o una del cliente, que se factura a su cuenta.

En **Llaves de IA** también se da de alta el catálogo de modelos con su precio por
millón de tokens. Uno por proveedor queda marcado como predeterminado: los sitios que
no eligen modelo propio usan ese.

**Consumo** muestra, por mes y por sitio, las llamadas, los tokens de entrada y salida
y el costo estimado con esos precios, con desglose por modelo y exportación a CSV para
facturar. Los precios se capturan a mano — no se consultan solos.

Contra el abuso: la descripción del visitante se acota a 1200 caracteres y se manda
delimitada como dato, nunca como instrucción; la salida está limitada por esquema a
un máximo de 2 preguntas de 240 caracteres, así que no sirve como canal de respuestas
libres. Las reglas de rechazo viven en el prompt de sistema —la configuración de un
sitio solo puede estrechar el alcance, nunca ampliarlo—, y el campo "a qué se dedica
el negocio" acepta el bloque JSON documentado en la Guía para IA para acotar temas.

Límites: 6 llamadas por IP cada 10 minutos, 10 por IP y sitio al día, y un tope mensual
por sitio (500 por defecto). Las descripciones repetidas se responden desde memoria en
vez de pagarse otra vez. El consumo se ve por sitio y en la vista global.

## Estados de un sitio

| Estado | Qué ve el visitante | HTTP |
|---|---|---|
| `live` | La landing | 200 |
| `maintenance` | Aviso de mantenimiento (título y mensaje configurables) | 503 |
| `blocked` | Aviso de sitio no disponible | 403 |
| `draft` | Aviso de mantenimiento, hasta la primera publicación | 503 |

## Preparar una landing para subirla

```bash
./tools/create-landing <carpeta-del-export> --fix --out cliente.zip
```

`--fix` adapta un export de Claude Design al contrato: autoaloja las fuentes que
venían de un CDN, conecta los datos de contacto a `data-site`, marca el
formulario, genera los favicons que falten y escribe `landing.json` derivando la
paleta del chat de las variables `:root` del sitio. Sin `--fix` solo revisa y
comprime. Ver [`tools/README.md`](tools/README.md).

## Contrato de las landings

Está documentado en el panel, en **Guía para IA**, con botón de copiar. Resumen:

- `index.html` en la raíz del ZIP, rutas relativas, sin build step.
- Favicon propio (`favicon.ico`, `favicon.svg`, `apple-touch-icon.png`) en la raíz.
- Assets en `assets/css`, `assets/js`, `assets/img`, `assets/fonts`. Sin CDNs externos.
- Datos de contacto vía `data-site="email"`, `data-site-href="whatsapp"` o `{{site.email}}`.
- Formularios con `data-site-form`; el endpoint y el anti-spam se inyectan solos.

## Límites configurados

| Variable | Default | Qué controla |
|---|---|---|
| `MAX_ZIP_BYTES` | 100 MB | Tamaño del ZIP subido |
| `MAX_FILES_PER_SITE` | 3000 | Archivos por versión |
| — | 400 MB | Tamaño descomprimido (anti zip-bomb, en `src/lib/zip.ts`) |
| — | 8/min por IP | Envíos de formulario |
| — | 120/hora por sitio | Envíos de formulario |
