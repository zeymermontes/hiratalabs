# Hirata Commerce — arquitectura

Plataforma multi-tenant de Hirata Labs: **landings** (ZIP estático, lo de siempre)
y **tiendas** (storefront renderizado por Next) bajo un mismo panel en
`admin.hiratalabs.com`. Construida sobre el repo `landings`; nada de lo que ya
funcionaba cambia de comportamiento.

## Capas

```
Visitante → wildcard DNS → proxy (edge, src/proxy.ts) lee el Host
   ├─ admin host        → panel (src/app/(admin))
   ├─ /api/f/*, /api/store/*, /api/kind/*, /api/health → pasan directo
   ├─ kind = landing    → /srv/<host>/...   (archivos del ZIP + inyección)
   └─ kind = store      → /store/<host>/... (páginas del storefront)
```

El proxy no tiene base de datos: pregunta `/api/kind/<host>` y lo recuerda 30 s.

## Tenancy

- `sites` es el tenant. `sites.kind` = `landing | store`. `sites.theme` guarda
  plantilla y tokens de marca de una tienda.
- **Toda tabla de módulo lleva `site_id`** y toda consulta filtra por él. No hay
  RLS para el panel: el acceso lo decide `src/lib/auth.ts` en servidor.
- Roles: `admins` = super admin (Hirata Labs). `site_members` = `owner` (administra
  su sitio) o `staff` (opera). `requireSiteAccess(siteId, { manage })` en cada
  página/acción de sitio; `requireAdmin()` en lo de plataforma.

## Módulos (plugins)

- Registro en código: `src/modules/registry.ts` (qué es, a qué tipo de sitio
  aplica, gratis/extra, si el dueño lo prende solo, default, pestaña del panel).
- Ajustes comerciales del super admin: tabla `modules_catalog` (panel → Módulos).
- Estado por sitio: `site_modules` (panel del sitio → Módulos). Sin fila = default.
- Extras de pago: el dueño los **solicita** (`module_requests`), el super admin
  aprueba desde Solicitudes y queda activo.
- En código: `isModuleEnabled(site, key)` / `enabledModuleKeys(site)` en
  `src/lib/modules.ts`. El storefront recibe `ctx.modules` (Set) y el panel arma
  las pestañas con `siteTabs()`.
- Código de cada módulo en `src/modules/<key>/` (schema Drizzle, lógica, componentes).
  Su schema se reexporta desde `src/lib/db/schema.ts`. Páginas del panel en
  `src/app/(admin)/sites/[id]/<ruta>/`, páginas públicas en `src/app/store/[host]/<ruta>/`,
  endpoints en `src/app/api/store/<key>/`.

## Storefront

- Contexto por request: `getStorefront(host)` (`src/lib/storefront.ts`) →
  sitio, config pública, módulos activos y tema resuelto.
- Tema: `src/lib/theme.ts`. Plantillas con tokens default; la tienda sobreescribe.
  Las páginas solo usan variables `--sf-*` (`storefront.css`), nunca los tokens
  del panel: la tienda viste de su marca, la plataforma de la de Hirata Labs.
- Dinero: **centavos MXN en integer**. `formatMXN(cents)`.
- Clientes (compradores): Supabase Auth en el host de la tienda; `customers`
  liga `(site_id, user_id)`.

## Migraciones

SQL a mano en `drizzle/00NN_*.sql`, aditivas e idempotentes (`if not exists`).
Se corren en orden en el SQL Editor de Supabase. El schema Drizzle debe reflejar
exactamente lo que crea el SQL.

## IA

Infraestructura existente (llaves cifradas por proveedor, catálogo de modelos
con precio, consumo por sitio) en `src/lib/ai/*`. Proveedor por default de la
plataforma: DeepSeek. Cada función de IA pasa por `ai_usage` y respeta la cuota
del sitio. Las tiendas pueden traer su propia llave (`keyMode = own`) o conectar
su propia IA vía MCP (módulo `mcp_access`, tokens por sitio con alcance limitado).
