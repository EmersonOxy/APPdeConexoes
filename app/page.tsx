import Link from "next/link";
import { Brand } from "@/components/brand";

export default function HomePage() {
  return (
    <main className="shell">
      <header className="header">
        <Brand />
        <div className="button-row">
          <Link className="button button-secondary" href="/entrar">Entrar</Link>
          <Link className="button button-primary" href="/cadastro">Criar conta</Link>
        </div>
      </header>
      <section className="landing">
        <div>
          <p className="eyebrow">Conexões com mais contexto</p>
          <h1>Conheça pessoas além da primeira foto.</h1>
          <p className="lead">
            Um espaço para namoro, amizade e novas conexões, onde respeito e experiências reais ajudam a iniciar conversas melhores.
          </p>
          <div className="button-row">
            <Link className="button button-primary" href="/cadastro">Criar minha conta</Link>
            <Link className="button button-secondary" href="/feed">Explorar o Feed</Link>
          </div>
        </div>
        <aside className="hero-card">
          <div className="avatar">M</div>
          <div className="score-box">
            <p className="eyebrow">Reputação transparente</p>
            <strong>Primeira impressão</strong>
            <p className="muted">
              A nota da comunidade só aparece depois que você forma sua própria impressão.
            </p>
          </div>
        </aside>
      </section>
    </main>
  );
}
