"use client";

import Link from "next/link";
import { inboxAction } from "@/app/mensagens/inbox-actions";
import { useInboxEvents } from "./use-inbox-events";
import { ReputationPanel } from "./reputation";
import { mergeMessages } from "@/lib/message-history";
import { ReportForm } from "./report-form";
import { InteractionRating } from "./interaction-rating";
import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { connectionAction } from "@/app/mensagens/actions";
import { excludeProfile } from "@/app/feed/actions";
import type { Chat, Contact, Conversation, Inbox } from "@/lib/connections";

export function Messages({ initial, initialError, userId }: { initial: Inbox; initialError?: string | null; userId: string }) {
  const [inbox, setInbox] = useState(initial);
  const [notice, setNotice] = useState(initialError ?? "");
  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [tab, setTab] = useState<"contacts" | "conversations">("conversations");
  const [search, setSearch] = useState("");
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [loading, setLoading] = useState(false);
  const query = useRef({search, unreadOnly}); query.current = {search, unreadOnly};
  const pages = useRef({contacts: 1, conversations: 1});
  const sequence = useRef(0);
  const refresh = useCallback(async () => {
    const request=++sequence.current; setLoading(true);
    try {
      const results=await Promise.all((["contacts","conversations"] as const).map(async kind=>{
        const items: (Contact | Conversation)[]=[];
        let more=false; let counts={contacts:0,conversations:0}; let cursor: {before_time:string;before_id:string}|undefined;
        for(let page=0;page<pages.current[kind];page++){
          const result=await inboxAction("list",{kind,search:query.current.search.trim(),unread_only:query.current.unreadOnly,...cursor});
          if(result.error)throw new Error(result.error);
          if(request!==sequence.current)return null;
          items.push(...result.data.items); more=result.data.has_more;counts=result.data.counts;
          const last=items.at(-1);if(!more||!last)break;
          cursor={before_time:last.created_at,before_id:last.id};
        }
        return {kind,items,more,counts};
      }));
      if(request!==sequence.current||!results[0]||!results[1])return;
      const next:Inbox={contacts:results[0].items as Contact[],conversations:results[1].items as Conversation[],counts:results[1].counts,has_more:{contacts:results[0].more,conversations:results[1].more}};
      setInbox(next);setNotice("");return next;
    } catch {if(request===sequence.current)setNotice("Não foi possível atualizar. Tente novamente.");}
    finally{if(request===sequence.current)setLoading(false);}
  }, []);
  useInboxEvents(()=>void refresh());
  useEffect(()=>{
    const update=()=>{if(document.visibilityState==="visible")void refresh();};
    const timer=setInterval(update,10000);document.addEventListener("visibilitychange",update);
    return ()=>{clearInterval(timer);document.removeEventListener("visibilitychange",update);sequence.current++;};
  },[refresh]);
  useEffect(()=>{
    sequence.current++;pages.current={contacts:1,conversations:1};
    const timer=setTimeout(()=>void refresh(),200);return ()=>clearTimeout(timer);
  },[search,unreadOnly,refresh]);
  const badge=(kind:"contacts"|"conversations")=>inbox.counts?.[kind]?<span className="unread-badge">{inbox.counts[kind]}</span>:null;
  return <>
    <div className="button-row" role="group" aria-label="Tipo de mensagens">
      <button className="button button-secondary" aria-pressed={tab==="conversations"} onClick={()=>setTab("conversations")}>Conversas {badge("conversations")}</button>
      <button className="button button-secondary" aria-pressed={tab==="contacts"} onClick={()=>{setTab("contacts");setConversation(null);}}>Primeiros contatos {badge("contacts")}</button>
    </div>
    <label className="message-search">Buscar por nome ou usuário<input type="search" value={search} maxLength={80} placeholder="Nome ou @usuário" onChange={event=>{sequence.current++;setSearch(event.target.value);}} /></label>
    <label><input type="checkbox" checked={unreadOnly} onChange={event=>{sequence.current++;setUnreadOnly(event.target.checked);}}/> Somente não lidas</label>
    {loading?<p role="status">Atualizando mensagens…</p>:null}
    <p role="status" className="notice">{notice}</p>
    {tab==="contacts"?<section className="inbox-list" aria-label="Primeiros contatos">
      {inbox.contacts.length?inbox.contacts.map(contact=><ContactCard key={contact.id} contact={contact} onDone={async id=>{
        const next=await refresh();if(id){setConversation(next?.conversations.find(item=>item.id===id)??{id,name:contact.name,peer_id:contact.peer_id,status:"active",created_at:new Date().toISOString()});setTab("conversations");}
      }}/>):<div className="empty"><h2>Nenhum primeiro contato com esses filtros</h2><Link href="/feed">Explorar o Feed</Link></div>}
    </section>:<div className="messages-layout">
      <nav className="panel conversation-list" aria-label="Suas conversas">
        {inbox.conversations.length?inbox.conversations.map(item=><button className="conversation-choice" aria-pressed={conversation?.id===item.id} key={item.id} onClick={()=>setConversation(item)}>
          <strong>{item.name} {item.unread?<span className="unread-badge" aria-label={`${item.unread} não lidas`}>{item.unread}</span>:null}</strong><span>{item.status==="closed"?"Encerrada":"Conversa"}</span>
        </button>):<p>Nenhuma conversa com esses filtros.</p>}
      </nav>
      {conversation?<ChatPanel key={conversation.id} conversation={conversation} userId={userId} onChanged={async()=>{await refresh();}}/>:<section className="empty"><h2>Suas conversas</h2><p>Selecione uma conversa para ler e responder.</p></section>}
    </div>}
    {inbox.has_more?.[tab]?<button className="button button-secondary" disabled={loading} onClick={()=>{pages.current[tab]++;void refresh();}}>Carregar mais {tab==="contacts"?"contatos":"conversas"}</button>:null}
  </>;
}

function ContactCard({ contact, onDone }: { contact: Contact; onDone: (id?: string) => Promise<void> }) {
  const [body, setBody] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [notice, setNotice] = useState("");
  const [pending, startTransition] = useTransition();
  function act(action: "contact" | "accept" | "decline" | "edit" | "withdraw" | "block") {
    startTransition(async () => {
      try {
        if (action === "block") {
          const result = await excludeProfile(contact.peer_id, "block");
          if (result.error) setNotice(result.error); else { setBody(null); await onDone(); }
          return;
        }
        const result = await connectionAction(action, contact.id, action === "edit" ? { body: draft } : {});
        if (result.error) { setNotice(result.error); return; }
        if (["contact","accept","decline"].includes(action) && contact.read_cursor) await inboxAction("read",{kind:"contacts",target:contact.id,through:contact.read_cursor});
        if (action === "contact") { setBody(result.data.body); setDraft(result.data.body); await onDone(); }
        else { setNotice(action === "edit" ? "Mensagem atualizada." : ""); setBody(null); await onDone(action === "accept" ? result.data.id : undefined); }
      } catch { setNotice("Não foi possível concluir. Atualize para conferir o estado do contato."); }
    });
  }
  const labels: Record<string, string> = { pending: "Aguardando resposta", declined: "Recusado", expired: "Expirado" };
  return <article className="panel" aria-busy={pending}>
    <p className="eyebrow">{contact.outgoing ? "Enviado" : "Recebido"} · {labels[contact.status] ?? contact.status}</p>
    <h2 className="person-name"><Link href={`/pessoa/${contact.peer_id}`}>{contact.name}</Link> {contact.unread ? <span className="unread-badge" aria-label={`${contact.unread} não lidas`}>{contact.unread}</span> : null}</h2>
    {contact.unread && contact.read_cursor ? <button className="button button-secondary" disabled={pending} onClick={()=>startTransition(async()=>{const result=await inboxAction("read",{kind:"contacts",target:contact.id,through:contact.read_cursor!});if(result.error)setNotice(result.error);else await onDone();})}>Marcar como lido</button> : null}
    {body === null ? <button className="button button-secondary" disabled={pending} onClick={() => act("contact")}>Ler mensagem</button> : <p className="message-text">{body}</p>}
    {!contact.outgoing && contact.status === "pending" ? <details><summary>Avaliar a primeira impressão antes de aceitar</summary>
      <p>Conheça o perfil e registre sua avaliação para iniciar a conversa.</p>
      <ReputationPanel target={contact.peer_id} allowContact={false} />
    </details> : null}
    {!contact.outgoing && contact.status === "pending" ? <div className="button-row">
      <button className="button button-primary" disabled={pending} onClick={() => act("accept")}>Aceitar e conversar</button>
      <button className="button button-secondary" disabled={pending} onClick={() => act("decline")}>Recusar</button>
    </div> : null}
    {contact.editable ? <div>
      <p className="field-help">Você pode editar ou excluir durante uma hora, enquanto não houver resposta.</p>
      {body !== null ? <form className="form" onSubmit={event => { event.preventDefault(); act("edit"); }}>
        <label>Editar primeiro contato<textarea value={draft} onChange={event => setDraft(event.target.value)} required maxLength={500} /></label>
        <button className="button button-secondary" disabled={pending || !draft.trim()}>Salvar alteração</button>
      </form> : null}
      <button className="button button-secondary" disabled={pending} onClick={() => act("withdraw")}>Excluir primeiro contato</button>
    </div> : null}
    <button className="button button-secondary" disabled={pending} onClick={() => act("block")}>Bloquear perfil</button>
    <ReportForm subject="contact" target={contact.id} />
    <p role="status" className="notice">{notice}</p>
  </article>;
}

function ChatPanel({ conversation, userId, onChanged }: { conversation: Conversation; userId: string; onChanged: () => Promise<void> }) {
  const [chat, setChat] = useState<Chat | null>(null);
  const [body, setBody] = useState("");
  const [notice, setNotice] = useState("");
  const [pending, startTransition] = useTransition();
  const [hasOlder, setHasOlder] = useState(false);
  const sequence = useRef(0);
  const messagesRef = useRef<Chat | null>(chat); messagesRef.current = chat;
  const accessGeneration = useRef(0);
  const requestId = useRef<{ body: string; id: string } | null>(null);
  const refresh = useCallback(async () => {
    const request = ++sequence.current;
    try {
      const result = await connectionAction("conversation", conversation.id, messagesRef.current?.messages.length ? { after: messagesRef.current.messages.at(-1)!.id } : {});
      if (request !== sequence.current) return;
      if (result.error) { accessGeneration.current++; setChat(null); setNotice(result.error); }
      else {
        setChat(previous => ({ ...result.data as Chat, messages: mergeMessages(previous?.messages ?? [], result.data.messages) }));
        if (!messagesRef.current) setHasOlder(result.data.messages.length === 50);
        setNotice("");
        if (document.visibilityState === "visible" && result.data.read_cursor) await inboxAction("read",{kind:"conversations",target:conversation.id,through:result.data.read_cursor});
      }
    } catch { if (request === sequence.current) { setNotice("Não foi possível atualizar a conversa. Tentaremos novamente."); } }
  }, [conversation.id]);
  useInboxEvents(()=>void refresh());
  useEffect(() => {
    void refresh();
    const update = () => { if (document.visibilityState === "visible") void refresh(); };
    const timer = setInterval(update, 5000);
    document.addEventListener("visibilitychange", update);
    return () => { clearInterval(timer); document.removeEventListener("visibilitychange", update); sequence.current++; };
  }, [refresh]);

  function act(action: "message" | "close" | "block" | "older") {
    startTransition(async () => {
      try {
        if (action === "block") {
          const result = await excludeProfile(conversation.peer_id, "block");
          if (result.error) setNotice(result.error); else { accessGeneration.current++; sequence.current++; setChat(null); setBody(""); await onChanged(); }
          return;
        }
        if (action === "older") {
          const generation = accessGeneration.current;
          const result = await connectionAction("conversation", conversation.id, { before: chat?.messages[0]?.id ?? "0" });
          if (generation !== accessGeneration.current) return;
          if (result.error) { accessGeneration.current++; sequence.current++; setChat(null); setNotice(result.error); return; }
          setChat(previous => previous ? { ...previous, messages: mergeMessages(result.data.messages, previous.messages) } : null);
          setHasOlder(result.data.messages.length === 50);
          return;
        }
        if (action === "message" && requestId.current?.body !== body) requestId.current = { body, id: crypto.randomUUID() };
        const result = await connectionAction(action, conversation.id, action === "message" ? { body, request_id: requestId.current!.id } : {});
        if (result.error) { setNotice(result.error); await refresh(); return; }
        setNotice(action === "close" ? "Conversa encerrada." : "");
        if (action === "message") { setBody(""); requestId.current = null; }
        await refresh();
        if (action === "close") await onChanged();
      } catch { setNotice("Falha de conexão. Você pode tentar novamente; a mensagem não será duplicada."); }
    });
  }

  return <section className="panel chat-panel" aria-busy={pending}>
    <h2 className="person-name"><Link href={`/pessoa/${conversation.peer_id}`}>{conversation.name}</Link></h2>
    <div className="button-row">
      <button className="button button-secondary" disabled={pending} onClick={() => act("block")}>Bloquear</button>
      {chat?.status === "active" ? <button className="button button-secondary" disabled={pending} onClick={() => act("close")}>Encerrar conversa</button> : null}
    </div>
    {chat ? <>
      <p className="field-help">Primeiro contato</p>
      <p className="message-bubble message-text">{chat.first_contact}</p>
      {hasOlder ? <button className="button button-secondary" disabled={pending} onClick={() => act("older")}>Carregar mensagens anteriores</button> : null}
      <ol className="chat-log" aria-label="Mensagens da conversa">
        {chat.messages.map(message => <li key={message.id} className={message.author === userId ? "message-bubble mine" : "message-bubble"}>
          <span className="field-help">{message.author === userId ? "Você" : conversation.name}</span>
          <p className="message-text">{message.body}</p>
        </li>)}
      </ol>
      {chat.status === "active" && !chat.both_rated ? <div className="notice"><p>As duas pessoas precisam registrar a primeira impressão para conversar. As mensagens anteriores foram preservadas.</p><ReputationPanel target={conversation.peer_id} allowContact={false} /></div> : null}
      {chat.status === "active" && chat.both_rated ? <form className="form" onSubmit={event => { event.preventDefault(); act("message"); }}>
        <label>Sua mensagem<textarea value={body} onChange={event => setBody(event.target.value)} maxLength={5000} required /></label>
        <button className="button button-primary" disabled={pending || !body.trim()}>Enviar mensagem</button>
      </form> : chat.status === "closed" ? <p>Conversa encerrada. Novas mensagens não podem ser enviadas.</p> : null}
    </> : <p>{notice ? "Conversa indisponível." : "Carregando conversa…"}</p>}
    <InteractionRating conversationId={conversation.id} revision={Number(chat?.messages.at(-1)?.id ?? 0)} />
    <ReportForm subject="conversation" target={conversation.id} />
    <p className="notice" role="status">{notice}</p>
  </section>;
}
