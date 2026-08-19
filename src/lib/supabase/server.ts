import { createServerClient, type SetAllCookies } from "@supabase/ssr";
import { cookies } from "next/headers";
import { env } from "@/lib/env";

/** Auth-scoped client bound to the request's cookies. */
export async function supabaseServer() {
  const cookieStore = await cookies();

  // Typed against SetAllCookies rather than inferred from the options object:
  // the `cookies` field is a union, and contextual inference through it resolved
  // to `any` on Linux, failing the build there while passing on macOS.
  const setAll: SetAllCookies = (list) => {
    try {
      for (const { name, value, options } of list) {
        cookieStore.set(name, value, options);
      }
    } catch {
      // Called from a Server Component, where cookies are read-only.
      // The route handler that owns the request refreshes them instead.
    }
  };

  return createServerClient(env.supabaseUrl, env.supabaseAnonKey, {
    cookies: {
      getAll: () => cookieStore.getAll(),
      setAll,
    },
  });
}
