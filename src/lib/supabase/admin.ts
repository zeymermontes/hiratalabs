import { createClient } from "@supabase/supabase-js";
import { env } from "@/lib/env";

/** Service-role client. Server only — bypasses RLS, never import from a client component. */
export function supabaseAdmin() {
  return createClient(env.supabaseUrl, env.supabaseServiceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
