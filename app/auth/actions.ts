"use server";

import { redirect } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export type AuthState = { message: string; success: boolean };
export async function authenticate(previous: AuthState, form: FormData): Promise<AuthState> {
  const email = String(form.get("email") ?? "").trim();
  const password = String(form.get("password") ?? "");
  const mode = form.get("mode");
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || password.length < 8 || password.length > 128) {
    return { message: "Informe um e-mail válido e uma senha entre 8 e 128 caracteres.", success: false };
  }
  const supabase = await createServerSupabaseClient();
  if (mode === "signup") {
    const site = process.env.NEXT_PUBLIC_SITE_URL;
    if (!site) return { message: "Cadastro temporariamente indisponível.", success: false };
    const { error } = await supabase.auth.signUp({
      email, password,
      options: { emailRedirectTo: new URL("/auth/callback", site).toString() },
    });
    if (error) return { message: "Não foi possível cadastrar. Verifique os dados ou tente novamente mais tarde.", success: false };
    return { message: "Confira seu e-mail para confirmar a conta. Se já possui conta, entre com sua senha.", success: true };
  }
  if (mode !== "login") return { message: "Operação inválida.", success: false };
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return { message: "Não foi possível entrar. Confira e-mail, senha e a confirmação do e-mail.", success: false };
  redirect("/perfil");
}

export async function signOut() {
  const supabase = await createServerSupabaseClient();
  const { error } = await supabase.auth.signOut({ scope: "local" });
  if (error) redirect("/entrar?erro=saida");
  redirect("/entrar");
}
