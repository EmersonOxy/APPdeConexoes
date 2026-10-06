import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export async function createServerSupabaseClient(writable = true) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  if (!url || !anonKey) {
    throw new Error("As variáveis públicas do Supabase ainda não foram configuradas.");
  }

  const cookieStore = await cookies();

  return createServerClient(url, anonKey, {
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
