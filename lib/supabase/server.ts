import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export async function createServerSupabaseClient(writable = true) {
  // Session-bound data must be rendered only after an incoming request.
  const cookieStore = await cookies();
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  if (!url || !anonKey) {
    throw new Error("As variáveis públicas do Supabase ainda não foram configuradas.");
  }

  return createServerClient(url, anonKey, {
    cookieOptions: { maxAge: 60 * 60 * 24 * 30, sameSite: "lax" },
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(values) {
        if (!writable) return;
        try {
          values.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
        } catch {
          throw new Error("Não foi possível persistir a sessão.");
        }
      },
    },
  });
}
