"use client";
import Link from "next/link";
import {useCallback,useEffect,useRef,useState,useTransition} from "react";
import {notificationAction,notificationPage} from "@/app/notificacoes/actions";
import {notificationLink} from '@/lib/notification-links';
import {useInboxEvents} from './use-inbox-events';
import type {Notification,NotificationPage} from "@/lib/safety";
const labels:Record<Notification['kind'],string>={contact_received:'Você recebeu um primeiro contato.',contact_accepted:'Seu primeiro contato foi aceito.',contact_declined:'Seu primeiro contato foi recusado.',message:'Você recebeu uma nova mensagem.',conversation_closed:'Uma conversa foi encerrada.',report_updated:'O status de uma denúncia foi atualizado.'};
export function Notifications({initial,initialError}:{initial:NotificationPage;initialError:string|null}){
 const [page,setPage]=useState(initial);const [notice,setNotice]=useState(initialError??'');const [loading,setLoading]=useState(false);const [pending,startTransition]=useTransition();
 const sequence=useRef(0),pages=useRef(1);
 const refresh=useCallback(async()=>{
  const request=++sequence.current;setLoading(true);
  try{
   const items:Notification[]=[];let before:string|undefined,more=false,unread=0;
   for(let n=0;n<pages.current;n++){
    const result=await notificationPage(before);if(request!==sequence.current)return;
    if(result.error||!result.data)throw new Error('notifications');
    const data=result.data as NotificationPage;items.push(...data.items);more=data.has_more;unread=data.unread;
    if(!more||!data.items.length)break;before=data.items.at(-1)!.id;
   }
   if(request===sequence.current){setPage({items,has_more:more,unread});setNotice('');}
  }catch{if(request===sequence.current){setPage({items:[],has_more:false,unread:0});setNotice('Não foi possível atualizar. Tente novamente.');}}
  finally{if(request===sequence.current)setLoading(false);}
 },[]);
 useInboxEvents(()=>void refresh());
 useEffect(()=>{const update=()=>{if(document.visibilityState==='visible')void refresh();};const timer=setInterval(update,10000);document.addEventListener('visibilitychange',update);return()=>{sequence.current++;clearInterval(timer);document.removeEventListener('visibilitychange',update);};},[refresh]);
 return <section aria-busy={pending||loading}>
  <button className="button button-secondary" disabled={loading} onClick={()=>void refresh()}>Atualizar</button>
  <p role="status" className="notice">{notice}</p><p>{page.unread} não lidas · {page.items.length} notificações carregadas</p>
  {page.items.length?<ul className="notification-list">{page.items.map(item=><li className="panel" key={item.id}>
   <p>{!item.read_at?<strong>Nova · </strong>:null}{labels[item.kind]}</p>
   <p className="field-help">{new Date(item.created_at).toLocaleString('pt-BR',{timeZone:'America/Sao_Paulo'})}</p>
   <Link href={notificationLink(item)}>Ver detalhes</Link>
   {!item.read_at?<button className="button button-secondary" disabled={pending} onClick={()=>startTransition(async()=>{
    try{const result=await notificationAction('read_notification',item.id);if(result.error)setNotice(result.error);else await refresh();}catch{setNotice('Não foi possível marcar como lida.');}
   })}>Marcar como lida</button>:null}
  </li>)}</ul>:<p>Nenhuma notificação disponível.</p>}
  {page.has_more?<button className="button button-secondary" disabled={loading||pending} onClick={()=>{pages.current++;void refresh();}}>Carregar notificações anteriores</button>:null}
 </section>;
}
