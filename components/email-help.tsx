"use client";
import { useActionState, useEffect, useState } from "react";
import Link from "next/link";
import { emailHelp, newPassword } from "@/app/auth/actions";
export function EmailHelp({ recovery = false, initialEmail = "" }: { recovery?: boolean; initialEmail?: string }) {
 const [state, action, pending] = useActionState(emailHelp, { success: false, message: "" });
 const [email, setEmail] = useState(initialEmail);
 const [cooldown, setCooldown] = useState(0);
 useEffect(() => { if (state.success) setCooldown(60); }, [state]);
 useEffect(() => { if (!cooldown) return; const id=setTimeout(()=>setCooldown(cooldown-1),1000); return ()=>clearTimeout(id); },[cooldown]);
 return <section className="panel"><form action={action} className="form">
  <label>E-mail da conta<input name="email" type="email" autoComplete="email" value={email} onChange={e=>setEmail(e.target.value)} required maxLength={254} /></label>
  <button name="mode" value={recovery ? "recovery" : "resend"} className="button button-primary" disabled={pending || cooldown>0}>{cooldown ? `Reenviar em ${cooldown}s` : recovery ? "Enviar recuperação de senha" : "Reenviar confirmação"}</button>
  <p>Abra o link recebido por e-mail para continuar. Confira também o spam. Não é necessário digitar um código.</p>
  <p className="notice" role="status">{state.message}</p>
 </form><Link href="/entrar">Voltar para entrar</Link>{!recovery ? <p><Link href="/recuperar-senha">Já confirmei, mas esqueci minha senha</Link></p> : null}</section>;
}
export function PasswordReset() {
 const [state, action, pending]=useActionState(newPassword,{success:false,message:""});
 return <form action={action} className="panel form"><label>Nova senha<input name="password" type="password" autoComplete="new-password" required minLength={8} maxLength={128}/></label><label>Confirme a nova senha<input name="password_confirmation" type="password" autoComplete="new-password" required minLength={8} maxLength={128}/></label><button className="button button-primary" disabled={pending}>Salvar senha e entrar</button><p role="status" className="notice">{state.message}</p></form>;
}
