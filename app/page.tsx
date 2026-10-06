import Link from "next/link";

export default function HomePage() {
  return (
    <main className="shell">
      <header className="header">
        <Link className="brand" href="/">
          <span className="brand-mark">C</span>
          <span>Conexões</span>
        </Link>
        <div className="button-row">
          <Link className="button button-secondary" href="/feed">Conhecer o Feed</Link>
          <Link className="button button-primary" href="/cadastro">Criar perfil</Link>
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
            <Link className="button button-primary" href="/cadastro">Montar meu perfil</Link>
            <Link className="button button-secondary" href="/feed">Ver prévia do Feed</Link>
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
