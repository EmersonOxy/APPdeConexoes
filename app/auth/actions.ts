"use server";
import { redirect } from "next/navigation";
import { createEmailAuthClient } from "@/lib/supabase/email-auth";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export type AuthState = { message: string; success: boolean; email?: string };
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export async function authenticate(previous: AuthState, form: FormData): Promise<AuthState> {
  const identifier = String(form.get("identifier") ?? "").trim();
  const password = String(form.get("password") ?? "");
  const mode = form.get("mode");
  if (password.length < 8 || password.length > 128 || identifier.length > 254) return { message: "Confira o e-mail ou usuário e a senha de 8 a 128 caracteres.", success: false };
  const supabase = await createServerSupabaseClient();
  if (mode === "signup") {
    const username = String(form.get("username") ?? "").trim().toLowerCase();
    if (!emailPattern.test(identifier) || !/^[a-z][a-z0-9_]{2,23}$/.test(username)) return { message: "Informe e-mail válido e usuário com 3 a 24 letras, números ou _, começando por uma letra.", success: false };
    if (password !== form.get("password_confirmation")) return { success: false, message: "As senhas não coincidem." };
    const site = process.env.NEXT_PUBLIC_SITE_URL;
    if (!site) return { message: "Cadastro temporariamente indisponível.", success: false };
    const { data, error } = await createEmailAuthClient().auth.signUp({ email: identifier, password, options: { data: { username }, emailRedirectTo: new URL("/auth/finish", site).toString() } });
    if (error) return { message: error.status === 429 ? "Limite de envio atingido. Aguarde antes de pedir outro e-mail." : "Não foi possível cadastrar. O usuário pode estar em uso; confira os dados ou tente recuperar sua conta.", success: false, email: identifier };
    if (data.session) { await supabase.auth.setSession(data.session); redirect("/feed"); }
    redirect("/confirmar?email=" + encodeURIComponent(identifier));
  }
  if (mode !== "login") return { message: "Operação inválida.", success: false };
  let failed = false;
  if (emailPattern.test(identifier)) {
    const { error } = await supabase.auth.signInWithPassword({ email: identifier, password }); failed = !!error;
  } else if (/^[a-z][a-z0-9_]{2,23}$/i.test(identifier.replace(/^@/, ""))) {
    const { data, error } = await supabase.functions.invoke("duoeto-username-login", { body: { username: identifier.replace(/^@/, "").toLowerCase(), password } });
    if (error || !data?.access_token || !data?.refresh_token) failed = true;
    else { const { error: sessionError } = await supabase.auth.setSession(data); failed = !!sessionError; }
  } else failed = true;
  if (failed) return { message: "Não foi possível entrar. Confira e-mail/usuário e senha. Você pode recuperar a senha ou confirmar seu e-mail abaixo. Após várias tentativas, aguarde 15 minutos.", success: false, email: emailPattern.test(identifier) ? identifier : undefined };
  redirect("/feed");
}

export async function emailHelp(previous: AuthState, form: FormData): Promise<AuthState> {
  const email = String(form.get("email") ?? "").trim();
  const mode = String(form.get("mode"));
  if (!emailPattern.test(email) || email.length > 254) return { success: false, message: "Informe um e-mail válido." };
  const supabase = await createServerSupabaseClient();
  if (mode === "verify" || mode === "verify_recovery") {
    const token = String(form.get("token") ?? "").trim();
    if (!/^\d{6,10}$/.test(token)) return { success: false, message: "Digite o código numérico recebido no e-mail." };
    const { error } = await supabase.auth.verifyOtp({ email, token, type: mode === "verify_recovery" ? "recovery" : "signup" });
    if (error) return { success: false, message: "Código inválido ou expirado. Confira o e-mail mais recente ou peça outro código." };
    redirect(mode === "verify_recovery" ? "/nova-senha" : "/feed");
  }
  const site = process.env.NEXT_PUBLIC_SITE_URL;
  if (!site) return { success: false, message: "Envio temporariamente indisponível." };
  const redirectTo = new URL("/auth/finish", site).toString();
  if (mode !== "resend" && mode !== "recovery") return { success: false, message: "Operação inválida." };
  const { error } = mode === "resend" ? await createEmailAuthClient().auth.resend({ type: "signup", email, options: { emailRedirectTo: redirectTo } }) : await createEmailAuthClient().auth.resetPasswordForEmail(email, { redirectTo });
  if (error?.status === 429) return { success: false, message: "Limite de e-mails atingido. Aguarde antes de tentar novamente; confira também o spam.", email };
  if (error) return { success: false, message: "Não foi possível enviar agora. Tente mais tarde ou abra o link do último e-mail válido.", email };
  return { success: true, message: "Se houver uma conta elegível, enviaremos o e-mail. Confira a caixa de entrada e o spam. Aguarde pelo menos um minuto antes de reenviar.", email };
}

export async function newPassword(previous: AuthState, form: FormData): Promise<AuthState> {
  const password = String(form.get("password") ?? "");
  if (password.length < 8 || password.length > 128 || password !== form.get("password_confirmation")) return { success: false, message: "Use 8 a 128 caracteres e confirme a mesma senha nos dois campos." };
  const supabase = await createServerSupabaseClient();
  const { error } = await supabase.auth.updateUser({ password });
  if (error) return { success: false, message: "Não foi possível trocar a senha. Peça um novo link de recuperação e tente novamente." };
  redirect("/feed");
}
export async function signOut() {
  const supabase = await createServerSupabaseClient();
  const { error } = await supabase.auth.signOut({ scope: "local" });
  if (error) redirect("/entrar?erro=saida");
  redirect("/entrar");
}

export async function finishEmailSession(input:{access:string;refresh:string;type:string;code:string}){
 if(!input||Object.values(input).some(value=>typeof value!=='string'||value.length>12000))return {error:'Link inválido.'};
 const supabase=await createServerSupabaseClient();
 const {error}=input.code?await supabase.auth.exchangeCodeForSession(input.code):await supabase.auth.setSession({access_token:input.access,refresh_token:input.refresh});
 if(error)return {error:'O link expirou ou não pôde ser confirmado. Peça um novo e-mail de confirmação ou recuperação.'};
 const {data,error:identityError}=await supabase.auth.getUser();
 if(identityError||!data.user?.email_confirmed_at)return {error:'Confirme o e-mail para continuar.'};
 return {next:input.type==='recovery'?'/nova-senha':'/feed'};
}
