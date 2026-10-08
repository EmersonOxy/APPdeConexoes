"use server";
import {revalidatePath} from 'next/cache';
import {createServerSupabaseClient} from '@/lib/supabase/server';
import {approximateLocation} from '@/lib/discovery-options';
export async function locationAction(action:'status'|'save'|'remove',coordinates?:{latitude:number;longitude:number;consent:boolean}){
 if(!['status','save','remove'].includes(action))return {data:null,error:'Ação inválida.'};
 let position:{latitude:number;longitude:number}|undefined;
 if(action==='save'){
  if(coordinates?.consent!==true)return {data:null,error:'Autorize o uso da localização aproximada.'};
  try{position=approximateLocation(coordinates.latitude,coordinates.longitude);}catch{return {data:null,error:'Localização inválida.'};}
 }
 const supabase=await createServerSupabaseClient(false);
 const {data,error}=await supabase.rpc('duoeto_location',{action,...position,consent:action==='save'});
 if(!error&&action!=='status'){revalidatePath('/feed');revalidatePath('/feed/filtros');}
 return {data,error:error?(error.code==='P0001'?error.message:'Não foi possível atualizar a localização. Tente novamente.'):null};
}
