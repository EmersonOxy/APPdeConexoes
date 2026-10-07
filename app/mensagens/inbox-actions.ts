"use server";
import { createServerSupabaseClient } from '@/lib/supabase/server';
export async function inboxAction(action:'list'|'read'|'counts',payload:Record<string,string|number|boolean>={}){
 if(!['list','read','counts'].includes(action)||JSON.stringify(payload).length>3000)return {data:null,error:'Solicitação inválida.'};
 const supabase=await createServerSupabaseClient(false);
 const {data,error}=await supabase.rpc('duoeto_inbox',{action,payload});
 return {data,error:error?'Não foi possível atualizar suas mensagens.':null};
}
export async function messageTarget(kind:'contact'|'conversation'|'report',target:string){
 if(!['contact','conversation','report'].includes(kind)||!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(target))return {data:null,error:'Destino indisponível.'};
 const supabase=await createServerSupabaseClient(false);
 const {data,error}=await supabase.rpc('duoeto_message_target',{kind,target});
 return {data,error:error?'Não foi possível abrir este item.':null};
}
