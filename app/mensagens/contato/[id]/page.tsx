import Link from 'next/link';
import {ApplicationShell} from '@/components/application-shell';
import {ContactDetails} from '@/components/contact-details';
import {messageTarget} from '@/app/mensagens/inbox-actions';
import {requireUser} from '@/lib/supabase/require-user';
export default async function Page({params}:{params:Promise<{id:string}>}){
 await requireUser();const {id}=await params;const result=await messageTarget('contact',id);
 return <ApplicationShell><main className="page"><h1>Primeiro contato</h1><Link href="/mensagens?aba=contatos">Voltar aos primeiros contatos</Link>
 {result.data?<ContactDetails initial={result.data}/>:<p role="status">Este contato não está disponível. Ele pode ter sido excluído ou seu acesso pode ter mudado.</p>}
 </main></ApplicationShell>;
}
