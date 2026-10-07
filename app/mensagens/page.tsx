import { ApplicationShell } from "@/components/application-shell";
import { requireUser } from "@/lib/supabase/require-user";
import { inboxAction, messageTarget } from "./inbox-actions";
import { Messages } from "@/components/messages";
import type { Inbox } from "@/lib/connections";

export default async function MessagesPage({searchParams}:{searchParams:Promise<{conversa?:string;aba?:string}>}) {
  const user = await requireUser();
  const params=await searchParams;
  const selected=params.conversa?await messageTarget("conversation",params.conversa):null;
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
        {params.conversa&&!selected?.data?<p role="status">Esta conversa não está disponível.</p>:null}
        <Messages key={params.conversa??params.aba??"default"} initialConversation={selected?.data??null} initialTab={params.aba==="contatos"&&!params.conversa?"contacts":"conversations"} userId={user.id} initial={initial} initialError={contacts.error??conversations.error} />
      </main>
    </ApplicationShell>
  );
}
