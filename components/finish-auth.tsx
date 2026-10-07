"use client";
import {useEffect,useRef,useState} from 'react';
import {useRouter} from 'next/navigation';
import Link from 'next/link';
import {finishEmailSession} from '@/app/auth/actions';
export function FinishAuth(){
 const router=useRouter();const started=useRef(false);const [error,setError]=useState('');
 useEffect(()=>{
  if(started.current)return;started.current=true;
  const params=new URLSearchParams(location.hash.slice(1));
  const access=params.get('access_token'),refresh=params.get('refresh_token'),type=params.get('type');
  const code=new URLSearchParams(location.search).get('code');
  // Remove credentials from browser history before rendering anything else.
  history.replaceState(null,'',location.pathname);
  if((!access||!refresh)&&!code){setError('O link expirou ou não pôde ser confirmado. Peça outro e-mail abaixo.');return;}
  finishEmailSession({access:access??'',refresh:refresh??'',type:type??'',code:code??''}).then(result=>{
   if(result.error)setError(result.error);else {router.replace(result.next!);router.refresh();}
  }).catch(()=>setError('Não foi possível concluir. Confira sua conexão e tente novamente.'));
 },[router]);
 return <section className="panel"><p role="status">{error||'Confirmando seu acesso…'}</p>{error?<div className="button-row"><Link href="/confirmar">Reenviar confirmação</Link><Link href="/recuperar-senha">Recuperar senha</Link><Link href="/entrar">Entrar</Link></div>:null}</section>;
}
