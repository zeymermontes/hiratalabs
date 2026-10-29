# Hirata Commerce — guía rápida para Claude

Plataforma multi-tenant (landings + tiendas) de Hirata Labs. **Lee primero
`HANDOFF.md` (estado y siguientes pasos) y `ARCHITECTURE.md` (convenciones).**

- Next.js 16 App Router, React 19, Tailwind v4, Drizzle sobre Postgres de Supabase
  (`db` de `@/lib/db`), Supabase Auth para sesiones. `params`/`searchParams` son
  Promises; `cookies()`/`headers()` son async. `middleware` se llama `src/proxy.ts`.
- Tenancy: `sites` es el tenant; toda tabla de módulo lleva `site_id` y toda
  consulta filtra por él. No hay RLS para el panel: el acceso lo decide
  `src/lib/auth.ts` (`requireAdmin`, `requireSiteAccess`).
- Módulos: registro en `src/modules/registry.ts`; código en `src/modules/<key>/`;
  gating con `isModuleEnabled` / `ctx.modules.has(key)`.
- Dinero en centavos (integer). UI en español claro, no técnico.
- Admin: clases `card btn-primary btn-secondary input label hint pill`, tokens de
  marca en `src/app/globals.css`. Storefront: solo variables `--sf-*` y clases
  `sf-*` de `src/app/store/[host]/storefront.css`.
- Migraciones: SQL a mano en `drizzle/00NN_*.sql`, aditivas e idempotentes;
  `npm run migrate` las aplica. El schema Drizzle debe reflejarlas exactamente.
- No tocar el comportamiento de las landings existentes (`/srv`, ZIP, inyección).
- Verificar con `npx tsc --noEmit` y `npm run build` antes de dar algo por hecho.
