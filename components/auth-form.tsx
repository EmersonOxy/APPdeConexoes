"use client";

import Link from "next/link";
import { useActionState } from "react";
import { authenticate } from "@/app/auth/actions";

export function AuthForm({ mode }: { mode: "login" | "signup" }) {
  const [state, action, pending] = useActionState(authenticate, { message: "", success: false });
  const signup = mode === "signup";
  return (
    <form action={action} className="panel form">
      <input name="mode" type="hidden" value={mode} />
      <label>{signup ? "E-mail" : "E-mail ou nome de usuário"}<input name="identifier" type={signup ? "email" : "text"} autoComplete={signup ? "email" : "username"} required maxLength={254} /></label>
      {signup && <label>Nome de usuário<input name="username" autoComplete="username" required minLength={3} maxLength={24} pattern="[a-zA-Z][a-zA-Z0-9_]{2,23}" /><span className="field-help">Comece por uma letra. Use letras, números ou _; sem espaços.</span></label>}
      <label>Senha<input name="password" type="password" autoComplete={signup ? "new-password" : "current-password"} minLength={8} maxLength={128} required /></label>
      {signup && <label>Confirme a senha<input name="password_confirmation" type="password" autoComplete="new-password" required minLength={8} maxLength={128} /></label>}
      {signup && <p className="muted">Use pelo menos oito caracteres. Você receberá um e-mail para confirmar sua conta.</p>}
      <button className="button button-primary" disabled={pending} type="submit">{pending ? "Aguarde…" : signup ? "Criar conta" : "Entrar"}</button>
      {state.message && <p className="notice" role="status">{state.message}</p>}
      <Link href="/recuperar-senha">Esqueci minha senha</Link>
      <Link href={state.email ? `/confirmar?email=${encodeURIComponent(state.email)}` : "/confirmar"}>Confirmar e-mail ou reenviar o link</Link>
      <Link href={signup ? "/entrar" : "/cadastro"}>{signup ? "Já tenho conta" : "Quero criar uma conta"}</Link>
    </form>
  );
}
