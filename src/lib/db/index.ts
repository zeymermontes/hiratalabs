import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { env } from "@/lib/env";
import * as schema from "./schema";

// Reuse the pool across hot reloads in dev and across lambdas-that-aren't
// (Render runs a long-lived container, so a small pool is right).
const globalForDb = globalThis as unknown as { __pg?: ReturnType<typeof postgres> };

const client =
  globalForDb.__pg ??
  postgres(env.databaseUrl, {
    max: 10,
    idle_timeout: 20,
    prepare: false, // required when going through Supabase's transaction pooler
  });

if (process.env.NODE_ENV !== "production") globalForDb.__pg = client;

export const db = drizzle(client, { schema });
export { schema };
