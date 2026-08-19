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
  cambiar un teléfono en el panel actualiza todas las landings al instante.
- **Las versiones son inmutables.** Publicar es apuntar `sites.active_version_id` a otra
  versión; volver atrás es instantáneo.
- **Los formularios se guardan antes de enviarse.** Si Resend falla, el lead no se pierde.

## Puesta en marcha

### 1. Supabase

1. Crea el proyecto.
2. **SQL Editor** → pega y ejecuta [`drizzle/0000_init.sql`](drizzle/0000_init.sql).
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

## Estados de un sitio

| Estado | Qué ve el visitante | HTTP |
|---|---|---|
| `live` | La landing | 200 |
| `maintenance` | Aviso de mantenimiento (título y mensaje configurables) | 503 |
| `blocked` | Aviso de sitio no disponible | 403 |
| `draft` | Aviso de mantenimiento, hasta la primera publicación | 503 |

## Contrato de las landings

Está documentado en el panel, en **Guía para IA**, con botón de copiar. Resumen:

- `index.html` en la raíz del ZIP, rutas relativas, sin build step.
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
