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
      <label>E-mail<input name="email" type="email" autoComplete="email" required maxLength={254} /></label>
      <label>Senha<input name="password" type="password" autoComplete={signup ? "new-password" : "current-password"} minLength={8} maxLength={128} required /></label>
      {signup && <p className="muted">Use pelo menos oito caracteres. Você receberá um e-mail para confirmar sua conta.</p>}
      <button className="button button-primary" disabled={pending} type="submit">{pending ? "Aguarde…" : signup ? "Criar conta" : "Entrar"}</button>
      {state.message && <p className="notice" role="status">{state.message}</p>}
      <Link href={signup ? "/entrar" : "/cadastro"}>{signup ? "Já tenho conta" : "Quero criar uma conta"}</Link>
    </form>
  );
}
