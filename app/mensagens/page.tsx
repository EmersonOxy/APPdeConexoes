import { ApplicationShell } from "@/components/application-shell";
import { requireUser } from "@/lib/supabase/require-user";
import { inboxAction } from "./inbox-actions";
import { Messages } from "@/components/messages";
import type { Inbox } from "@/lib/connections";

export default async function MessagesPage() {
  const user = await requireUser();
  const [contacts,conversations]=await Promise.all([inboxAction("list",{kind:"contacts"}),inboxAction("list",{kind:"conversations"})]);
  const initial:Inbox={contacts:contacts.data?.items??[],conversations:conversations.data?.items??[],counts:conversations.data?.counts,has_more:{contacts:contacts.data?.has_more??false,conversations:conversations.data?.has_more??false}};
  return (
    <ApplicationShell>
      <main className="page">
        <section className="page-heading">
          <p className="eyebrow">Conversas</p>
          <h1>Mensagens</h1>
          <p className="muted">Primeiros contatos e conversas aceitas ficam separados.</p>
        </section>
        <Messages userId={user.id} initial={initial} initialError={contacts.error??conversations.error} />
      </main>
    </ApplicationShell>
  );
}
