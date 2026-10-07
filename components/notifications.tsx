"use client";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { notificationAction } from "@/app/notificacoes/actions";
import type { Notification } from "@/lib/safety";
const labels: Record<Notification["kind"], string> = { contact_received: "Você recebeu um primeiro contato.", contact_accepted: "Seu primeiro contato foi aceito.", contact_declined: "Seu primeiro contato foi recusado.", message: "Você recebeu uma nova mensagem.", conversation_closed: "Uma conversa foi encerrada.", report_updated: "O status de uma denúncia foi atualizado." };
export function Notifications({ initial, initialError }: { initial: Notification[]; initialError: string | null }) {
  const [items, setItems] = useState(initial);
  const [notice, setNotice] = useState(initialError ?? "");
  const [pending, startTransition] = useTransition();
  const sequence = useRef(0);
  const refresh = useCallback(async () => {
    const request = ++sequence.current;
    try {
      const result = await notificationAction("notifications");
      if (request !== sequence.current) return;
      if (result.error) { setItems([]); setNotice(result.error); }
      else { setItems(result.data as Notification[]); setNotice(""); }
    } catch { if (request === sequence.current) setNotice("Não foi possível atualizar."); }
  }, []);
  useEffect(() => {
    const update = () => { if (document.visibilityState === "visible") void refresh(); };
    const timer = setInterval(update, 10000);
    document.addEventListener("visibilitychange", update);
    return () => { sequence.current++; clearInterval(timer); document.removeEventListener("visibilitychange", update); };
  }, [refresh]);
  return <section aria-busy={pending}>
    <button className="button button-secondary" onClick={() => void refresh()}>Atualizar</button>
    <p role="status" className="notice">{notice}</p>
    <p>{items.filter(item => !item.read_at).length} não lidas · Últimas 100 notificações</p>
    {items.length ? <ul className="notification-list">{items.map(item => <li className="panel" key={item.id}>
      <p>{!item.read_at ? <strong>Nova · </strong> : null}{labels[item.kind]}</p>
      <p className="field-help">{new Date(item.created_at).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" })}</p>
      <Link href={item.kind === "report_updated" ? "/denuncias" : "/mensagens"}>Ver detalhes</Link>
      {!item.read_at ? <button className="button button-secondary" disabled={pending} onClick={() => startTransition(async () => {
        try { const result = await notificationAction("read_notification", item.id); if (result.error) setNotice(result.error); else await refresh(); }
        catch { setNotice("Não foi possível marcar como lida."); }
      })}>Marcar como lida</button> : null}
    </li>)}</ul> : <p>Nenhuma notificação disponível.</p>}
  </section>;
}
