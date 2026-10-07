"use client";
import {usePathname} from "next/navigation";
import {useCallback,useEffect,useState} from 'react';
import {inboxAction} from '@/app/mensagens/inbox-actions';
import {useInboxEvents} from './use-inbox-events';
export function UnreadBadge(){
 const pathname=usePathname();
 const [count,setCount]=useState(0);
 const refresh=useCallback(()=>{void inboxAction('counts').then(({data,error})=>setCount(error?0:Number(data?.contacts??0)+Number(data?.conversations??0))).catch(()=>{});},[]);
 useInboxEvents(refresh);
 useEffect(()=>{refresh();const update=()=>{if(document.visibilityState==='visible')refresh();};const timer=setInterval(update,15000);document.addEventListener('visibilitychange',update);return ()=>{clearInterval(timer);document.removeEventListener('visibilitychange',update);};},[refresh,pathname]);
 return count?<span className="unread-badge" aria-label={`${count} mensagens não lidas`}>{count>99?'99+':count}</span>:null;
}
