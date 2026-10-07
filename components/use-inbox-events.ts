"use client";
import {usePathname} from "next/navigation";
import {useEffect,useRef} from 'react';
import {createBrowserSupabaseClient} from '@/lib/supabase/browser';
export function useInboxEvents(onChange:()=>void){
 const pathname=usePathname();
 const callback=useRef(onChange);callback.current=onChange;
 useEffect(()=>{
  let active=true;let channel:ReturnType<ReturnType<typeof createBrowserSupabaseClient>['channel']>|undefined;let timeout:ReturnType<typeof setTimeout>|undefined;
  if(!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY)return;
  const client=createBrowserSupabaseClient();
  client.auth.getUser().then(({data})=>{
   if(!active||!data.user)return;
   channel=client.channel('inbox-'+crypto.randomUUID()).on('postgres_changes',{event:'*',schema:'public',table:'duoeto_inbox_events',filter:`user_id=eq.${data.user.id}`},()=>{
    if(document.visibilityState!=='visible')return;
    clearTimeout(timeout);timeout=setTimeout(()=>callback.current(),150);
   }).subscribe();
  }).catch(()=>{});
  return ()=>{active=false;clearTimeout(timeout);if(channel)void client.removeChannel(channel);};
 },[pathname]);
}
