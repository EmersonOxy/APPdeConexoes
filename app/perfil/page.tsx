import { ApplicationShell } from "@/components/application-shell";
import { requireUser } from "@/lib/supabase/require-user";
import { signOut } from "@/app/auth/actions";

export default async function ProfilePage() {
  const user = await requireUser();
  return (
    <ApplicationShell>
      <main className="page">
        <section className="page-heading">
          <p className="eyebrow">Seu espaço</p>
          <h1>Perfil e privacidade</h1>
          <p className="muted">Edite o que outras pessoas veem e acompanhe como a reputação é formada.</p>
          <p className="muted">Conta confirmada: {user.email}</p>
          <form action={signOut}><button className="button button-secondary" type="submit">Sair da conta</button></form>
        </section>
        <div className="two-columns">
          <aside className="accent-panel">
            <p className="eyebrow">Como outras pessoas veem você</p>
            <h2>Seu perfil ainda está em configuração.</h2>
            <p className="muted">
              Depois de conectado ao Supabase, esta área exibirá suas fotos, objetivos, interesses e reputação.
            </p>
          </aside>
          <section className="panel">
            <h2>Reputação transparente</h2>
            <p className="muted">
              Até 14 primeiras impressões, a reputação fica em formação. Depois da primeira avaliação de interação, o perfil mostra percepção inicial, experiência e nota geral.
            </p>
            <p className="notice">Avaliações privadas entram nas médias sem revelar publicamente quem avaliou.</p>
          </section>
        </div>
      </main>
    </ApplicationShell>
  );
}
