import { ApplicationShell } from "@/components/application-shell";
import { requireUser } from "@/lib/supabase/require-user";
import { connectionAction } from "./actions";
import { Messages } from "@/components/messages";
import type { Inbox } from "@/lib/connections";

export default async function MessagesPage() {
  const user = await requireUser();
  const result = await connectionAction("list");
  return (
    <ApplicationShell>
      <main className="page">
        <section className="page-heading">
          <p className="eyebrow">Conversas</p>
          <h1>Mensagens</h1>
          <p className="muted">Primeiros contatos e conversas aceitas ficam separados.</p>
        </section>
        <Messages userId={user.id} initial={(result.data as Inbox) ?? { contacts: [], conversations: [] }} initialError={result.error} />
      </main>
    </ApplicationShell>
  );
}
