"use client";
import {useEffect,useRef,useState} from 'react';
import {locationAction} from '@/app/feed/location-actions';
import {approximateLocation,distanceOptions} from '@/lib/discovery-options';
export function LocationSettings({initial,initialError,initialDistance}:{initial:{enabled:boolean;updated_at:string|null};initialError:string|null;initialDistance?:number}){
 const [state,setState]=useState(initial),[notice,setNotice]=useState(initialError??''),[busy,setBusy]=useState(false),[consent,setConsent]=useState(false),[distance,setDistance]=useState(initialDistance?String(initialDistance):'');
 const active=useRef(true);useEffect(()=>{active.current=true;return()=>{active.current=false;};},[]);
 async function save(){
  if(!consent||busy)return;
  if(!navigator.geolocation){setNotice('Seu navegador não oferece localização. Você pode continuar sem esse filtro.');return;}
  setBusy(true);setNotice('Obtendo sua localização…');
  try{
   const position=await new Promise<GeolocationPosition>((resolve,reject)=>navigator.geolocation.getCurrentPosition(resolve,reject,{enableHighAccuracy:false,timeout:15000,maximumAge:0}));
   if(!active.current)return;
   if(!Number.isFinite(position.coords.accuracy)||position.coords.accuracy>10000)throw new Error('accuracy');
   const approximate=approximateLocation(position.coords.latitude,position.coords.longitude);
   const result=await locationAction('save',{...approximate,consent:true});if(!active.current)return;
   if(result.error)setNotice(result.error);else{setState(result.data);setNotice('Localização aproximada salva. Escolha uma distância e aplique os filtros.');}
  }catch(error){if(active.current)setNotice(error instanceof Error&&error.message==='accuracy'?'A localização disponível é muito imprecisa. Tente novamente ou continue sem esse filtro.':'Não foi possível obter a localização. Confira a permissão do navegador ou continue sem esse filtro.');}
  finally{if(active.current)setBusy(false);}
 }
 async function remove(){setBusy(true);try{const result=await locationAction('remove');if(result.error)setNotice(result.error);else{setState(result.data);setDistance('');setConsent(false);setNotice('Localização removida. O filtro de distância foi desativado.');}}catch{setNotice('Não foi possível remover agora. Tente novamente.');}finally{setBusy(false);}}
 return <fieldset disabled={busy}><legend>Localização e distância</legend>
 <p>A localização é opcional. Com sua autorização, usamos uma região aproximada para encontrar pessoas próximas. Não exibimos sua posição nem enviamos as coordenadas exatas do aparelho.</p>
 <p>Não acompanhamos seus deslocamentos. Atualize quando mudar de região. A localização salva permanece até você removê-la ou excluir sua conta.</p>
 {state.enabled?<p>Localização ativa · atualizada em {new Date(state.updated_at!).toLocaleDateString('pt-BR',{timeZone:'America/Sao_Paulo'})}.</p>:<p>Sem localização salva. O Feed continua disponível sem filtro de distância.</p>}
 <label><input type="checkbox" checked={consent} onChange={e=>setConsent(e.target.checked)}/> Autorizo salvar minha localização aproximada para o filtro de distância.</label>
 <button type="button" className="button button-secondary" disabled={!consent||busy} onClick={()=>void save()}>{state.enabled?'Atualizar localização':'Usar minha localização aproximada'}</button>
 {state.enabled?<button type="button" className="button button-secondary" onClick={()=>void remove()}>Remover localização</button>:null}
 <label>Distância máxima aproximada<select name="max_distance" value={distance} disabled={!state.enabled||busy} onChange={e=>setDistance(e.target.value)}><option value="">Sem limite de distância</option>{distanceOptions.map(km=><option key={km} value={km}>Até {km} km</option>)}</select></label>
 <p>As distâncias usam regiões aproximadas e podem variar alguns quilômetros. Ao limitar a distância, perfis sem localização não aparecem; com “Sem limite”, continuam elegíveis.</p>
 <p role="status">{notice}</p>
 </fieldset>;
}
