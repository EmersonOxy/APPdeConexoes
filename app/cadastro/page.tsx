import { ApplicationShell } from "@/components/application-shell";
import { AuthForm } from "@/components/auth-form";

export default function SignupPage() {
  return (
    <ApplicationShell>
      <main className="page">
        <section className="page-heading">
          <p className="eyebrow">Comece por você</p>
          <h1>Crie sua conta</h1>
          <p className="muted">Confirme seu e-mail para começar a montar seu perfil.</p>
        </section>
        <div className="two-columns">
          <aside className="accent-panel">
            <p className="eyebrow">Cadastro essencial</p>
            <h2>Claro, breve e sob seu controle.</h2>
            <p className="muted">Endereço e localização precisa nunca aparecem para outras pessoas.</p>
            <ul className="checklist">
              <li>Foto principal</li>
              <li>Nome, idade, cidade e estado</li>
              <li>Ao menos um objetivo</li>
              <li>E-mail confirmado antes de ativar o perfil</li>
            </ul>
          </aside>
          <AuthForm mode="signup" />
        </div>
      </main>
    </ApplicationShell>
  );
}
