# Handoff — Hirata Commerce (rama `feature/commerce-platform`)

Plataforma multi-tenant de Hirata Labs construida sobre el repo `landings`:
**landings** (ZIP estático, sin cambios de comportamiento) + **tiendas** (storefront
Next) bajo un mismo panel, con **módulos** que el super admin vende como extras o
deja gratis y que cada dueño prende/apaga. Diseño y arquitectura en
`ARCHITECTURE.md`. Lee ese archivo antes de tocar nada.

## Estado (28 oct 2026)

- Código completo y con `tsc --noEmit` limpio. **Falta correr `npm run build` y
  probar en local**: nadie ha levantado el servidor con este código todavía.
- Último commit: `5c2e60e`. No se ha hecho push (hacerlo desde la Mac:
  `git remote add github git@github.com:zeymermontes/hiratalabs.git && git push -u github feature/commerce-platform`).
- Este clon (`landings-commerce`) comparte `node_modules` (symlink) y `.env.local`
  con `../landings`; apunta a la base de Supabase **real**. Las migraciones nuevas
  son aditivas e idempotentes.

## Primer arranque

1. Doble clic a `dev.command` (o `npm run migrate && npm run dev`). `migrate` corre
   `drizzle/0009…0013` y lleva registro en `platform_migrations` (marca 0000–0008
   como aplicadas si ya existe `sites`).
2. Supabase, a mano: bucket público **`store-assets`** (Storage); en
   Authentication → Redirect URLs agregar `http://*.localhost:3000/cuenta/callback`
   y `https://*.hiratalabs.com/cuenta/callback`.
3. Panel en `http://localhost:3000` (magic link con `BOOTSTRAP_ADMIN_EMAIL`).
   Crear sitio tipo **Tienda** con subdominio `demo` → `http://demo.localhost:3000`
   (ponerla *En línea*). Diseño → Productos → Portada → Pagos (credenciales de
   prueba de Mercado Pago) → comprar.
4. Llaves de IA → agregar llave **DeepSeek** como default → pestaña **IA** del sitio.
5. `/start` con otro correo prueba el registro público (el sitio se crea al abrir
   el magic link; el dueño solo ve su sitio).

## Reglas de acceso

- `admin.hiratalabs.com` (`ADMIN_HOST`): **solo super admins** (tabla `admins`).
  Un miembro con sesión válida es rechazado (`panelKind()` en `src/lib/auth.ts`).
- `app.hiratalabs.com` (`APP_HOST`): dueños (`site_members.role = owner`) y staff;
  los super admins también entran. Falta CNAME `app` en DNS y el dominio en Render.
- En `localhost` entran ambos.
- `requireAdmin()` = plataforma; `requireSiteAccess(siteId, { manage })` = sitio
  (manage → owner o super admin). Toda tabla de módulo lleva `site_id`.

## Mapa rápido

| Qué | Dónde |
|---|---|
| Registro de módulos (nombre, tier, quién lo prende, pestaña) | `src/modules/registry.ts` |
| Resolución de módulos por sitio, catálogo, config | `src/lib/modules.ts` |
| Auth, roles, panel admin vs app | `src/lib/auth.ts` |
| Proxy por host (landing → `/srv`, tienda → `/store`) | `src/proxy.ts`, `src/app/api/kind/[host]` |
| Tema/plantillas del storefront | `src/lib/theme.ts`, `src/app/store/[host]/storefront.css` |
| Contexto de tienda por request | `src/lib/storefront.ts` (`getStorefront`) |
| Catálogo (schema, queries, admin, storefront) | `src/modules/catalog/`, `(admin)/sites/[id]/{products,categories,design}`, `store/[host]/{productos,categorias}` |
| Pedidos, carrito, checkout, MP, clientes | `src/modules/orders/`, `api/store/{cart,payment,webhooks}`, `store/[host]/{carrito,checkout,cuenta,mi-cuenta}`, `(admin)/sites/[id]/{orders,payments,customers}` |
| Asistente IA (DeepSeek, cuota) | `src/modules/ai/`, `(admin)/sites/[id]/ai` |
| MCP (tokens por tienda, JSON-RPC) | `src/modules/mcp/`, `src/app/api/mcp/route.ts`, `(admin)/sites/[id]/mcp`, `(admin)/mcp` |
| Registro público | `src/app/start/`, `signups` en schema, `finalizeSignups` en auth |
| Diseño visual (brandbook) | tokens en `src/app/globals.css`; canvas de diseño en el proyecto de Claude |

Convenciones: dinero en **centavos integer** (`formatMXN`); UI en español claro;
admin usa clases `card btn-primary input label pill`; storefront usa solo
variables `--sf-*` (nunca los tokens del panel); migraciones SQL a mano en
`drizzle/00NN_*.sql`, idempotentes; schema Drizzle de cada módulo reexportado en
`src/lib/db/schema.ts`.

## Decisiones abiertas

- Un solo proyecto Supabase Auth: un cliente comparte contraseña entre tiendas.
  Aceptable para arrancar; si no, auth por tienda.
- Pedidos de invitado se consultan por enlace UUID (mismo nivel que el correo).
- `requiresFile`/campos tipo archivo: no hay subida de archivos del cliente en el
  checkout aún (`order_items.uploaded_file_url` listo).
- Extras de pago: hoy se solicitan y el super admin aprueba; no hay cobro automático.

## Siguiente trabajo (en orden sugerido)

1. `npm run build` + recorrido completo en local; corregir lo que salga.
2. Portar como módulos desde `../hirata`: promociones, códigos, gift cards,
   sucursales (+ recoger en tienda), FAQ. Personalización ya tiene schema y editor.
3. Diseñador de fotolibros de `../momentos` como módulo `photobook_designer`
   (primer "módulo a la medida").
4. Subida de archivos del cliente en checkout; onboarding guiado post-registro;
   facturación de extras; dominio propio desde el panel del dueño.
5. Deploy: Render custom domain `app.hiratalabs.com`, CNAME, variables
   `APP_HOST`, `NEXT_PUBLIC_APP_URL`, `SUPABASE_PUBLIC_BUCKET`, `PUBLIC_SIGNUP`.
