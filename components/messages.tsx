"use client";

import Link from "next/link";
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
  const [selected, setSelected] = useState<string | null>(null);
  const [tab, setTab] = useState<"contacts" | "conversations">("contacts");
  const [search, setSearch] = useState("");
  const searchRef = useRef(search); searchRef.current = search;
  const sequence = useRef(0);
  const refresh = useCallback(async () => {
    const request = ++sequence.current;
    try {
      const result = await connectionAction("list", null, { search: searchRef.current.trim() });
      if (request !== sequence.current) return;
      if (result.error) { setNotice(result.error); setInbox({ contacts: [], conversations: [] }); }
      else { setInbox(result.data as Inbox); setNotice(""); }
    } catch { if (request === sequence.current) setNotice("Não foi possível atualizar. Tente novamente."); }
  }, []);
  useEffect(() => {
    const update = () => { if (document.visibilityState === "visible") void refresh(); };
    const timer = setInterval(update, 10000);
    document.addEventListener("visibilitychange", update);
    return () => { clearInterval(timer); document.removeEventListener("visibilitychange", update); sequence.current++; };
  }, [refresh]);
  useEffect(() => {
    sequence.current++;
    const timer = setTimeout(() => void refresh(), 250);
    return () => clearTimeout(timer);
  }, [search, refresh]);
  const conversation = inbox.conversations.find(item => item.id === selected);
  return <>
    <div className="button-row" role="group" aria-label="Tipo de mensagens">
      <button className="button button-secondary" aria-pressed={tab === "contacts"} onClick={() => { setTab("contacts"); setSelected(null); }}>Primeiro contato</button>
      <button className="button button-secondary" aria-pressed={tab === "conversations"} onClick={() => setTab("conversations")}>Conversas</button>
      <button className="button button-secondary" onClick={() => void refresh()}>Atualizar</button>
    </div>
    <label className="message-search">Buscar por nome<input type="search" value={search} maxLength={80} placeholder="Nome da pessoa" onChange={event => { sequence.current++; setSearch(event.target.value); }} /></label>
    <p role="status" className="notice">{notice}</p>
    {tab === "contacts" ? <section className="inbox-list" aria-label="Primeiros contatos">
      {inbox.contacts.length ? inbox.contacts.map(contact => <ContactCard key={contact.id} contact={contact} onDone={async id => {
        await refresh(); if (id) { setSelected(id); setTab("conversations"); }
      }} />) : <div className="empty"><h2>{search ? "Nenhum contato com esse nome" : "Nenhum primeiro contato"}</h2><p>Você pode enviar um após avaliar alguém no Feed.</p><Link href="/feed">Explorar o Feed</Link></div>}
    </section> : <div className="messages-layout">
      <nav className="panel conversation-list" aria-label="Suas conversas">
        {inbox.conversations.length ? inbox.conversations.map(item => <button className="conversation-choice" aria-pressed={selected === item.id} key={item.id} onClick={() => setSelected(item.id)}>
          <strong>{item.name}</strong><span>{item.status === "closed" ? "Encerrada" : "Conversa"}</span>
        </button>) : <p>{search ? "Nenhuma conversa com esse nome." : "Quando alguém aceitar um contato, a conversa aparecerá aqui."}</p>}
      </nav>
      {conversation ? <ChatPanel key={conversation.id} conversation={conversation} userId={userId} onChanged={refresh} /> : <section className="empty"><h2>Suas conversas</h2><p>Selecione uma conversa para ler e responder.</p></section>}
    </div>}
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
        if (action === "contact") { setBody(result.data.body); setDraft(result.data.body); }
        else { setNotice(action === "edit" ? "Mensagem atualizada." : ""); setBody(null); await onDone(action === "accept" ? result.data.id : undefined); }
      } catch { setNotice("Não foi possível concluir. Atualize para conferir o estado do contato."); }
    });
  }
  const labels: Record<string, string> = { pending: "Aguardando resposta", declined: "Recusado", expired: "Expirado" };
  return <article className="panel" aria-busy={pending}>
    <p className="eyebrow">{contact.outgoing ? "Enviado" : "Recebido"} · {labels[contact.status] ?? contact.status}</p>
    <h2 className="person-name"><Link href={`/pessoa/${contact.peer_id}`}>{contact.name}</Link></h2>
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
      }
    } catch { if (request === sequence.current) { setNotice("Não foi possível atualizar a conversa. Tentaremos novamente."); } }
  }, [conversation.id]);
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
