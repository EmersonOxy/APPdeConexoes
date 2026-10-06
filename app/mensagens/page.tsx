import { ApplicationShell } from "@/components/application-shell";
import { requireUser } from "@/lib/supabase/require-user";

export default async function MessagesPage() {
  await requireUser();
  return (
    <ApplicationShell>
      <main className="page">
        <section className="page-heading">
          <p className="eyebrow">Conversas</p>
          <h1>Mensagens</h1>
          <p className="muted">Primeiros contatos e conversas aceitas ficam separados.</p>
        </section>
        <section className="empty">
          <h2>Suas conversas aparecerão aqui.</h2>
          <p className="muted">Um primeiro contato vira conversa apenas quando a outra pessoa responde.</p>
        </section>
      </main>
    </ApplicationShell>
  );
}
