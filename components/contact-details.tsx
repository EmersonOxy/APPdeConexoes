"use client";
import {useCallback,useEffect,useRef,useState} from 'react';
import {useRouter} from 'next/navigation';
import {ContactCard} from './messages';
import {useInboxEvents} from './use-inbox-events';
import {messageTarget} from '@/app/mensagens/inbox-actions';
import type {Contact} from '@/lib/connections';
export function ContactDetails({initial}:{initial:Contact}){
 const router=useRouter();const [contact,setContact]=useState<Contact|null>(initial);const [notice,setNotice]=useState('');const sequence=useRef(0);
 const refresh=useCallback(async()=>{const request=++sequence.current;try{const result=await messageTarget('contact',initial.id);if(request!==sequence.current)return;if(result.error){setContact(null);setNotice(result.error);}else{setContact(result.data);setNotice('');}}catch{if(request===sequence.current)setNotice('Não foi possível atualizar o contato.');}},[initial.id]);
 useInboxEvents(()=>void refresh());
 useEffect(()=>{const update=()=>{if(document.visibilityState==='visible')void refresh();};const timer=setInterval(update,10000);document.addEventListener('visibilitychange',update);return()=>{sequence.current++;clearInterval(timer);document.removeEventListener('visibilitychange',update);};},[refresh]);
 return <><p role="status">{notice}</p>{contact?<ContactCard contact={contact} onDone={async id=>{if(id)router.push(`/mensagens?conversa=${id}`);else await refresh();}}/>:<p>Este contato não está mais disponível.</p>}</>;
}
