"use server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { photoBucket } from "@/lib/profile";
export type AccountState={success:boolean;message:string};
export async function accountAction(previous:AccountState,form:FormData):Promise<AccountState>{
 const supabase=await createServerSupabaseClient(); const {data,error}=await supabase.auth.getUser();
 if(error || !data.user?.email_confirmed_at) return {success:false,message:"Entre com sua conta confirmada."};
 const action=String(form.get("action"));
 if(action==='username'){
  const {error}=await supabase.rpc('duoeto_account',{action:'set_username',payload:{username:String(form.get('username')??'')}});
  if(error)return {success:false,message:error.code==='P0001'?error.message:'Não foi possível salvar o usuário.'};
  revalidatePath('/conta');return {success:true,message:'Nome de usuário salvo. Você já pode usá-lo para entrar.'};
 }
 if(!['password','delete'].includes(action))return {success:false,message:'Ação inválida.'};
 if(action==='delete' && form.get('confirmation')!=='EXCLUIR MINHA CONTA')return {success:false,message:'Digite EXCLUIR MINHA CONTA para confirmar.'};
 const current=String(form.get('current_password')??'');
 if(current.length<8||current.length>128)return {success:false,message:'Informe sua senha atual.'};
 const {error:reauth}=await supabase.auth.signInWithPassword({email:data.user.email!,password:current});
 if(reauth)return {success:false,message:'Senha atual incorreta. Use a recuperação de senha se necessário.'};
 if(action==='password'){
  const password=String(form.get('password')??'');
  if(password.length<8||password.length>128||password!==form.get('password_confirmation'))return {success:false,message:'Confirme a nova senha de 8 a 128 caracteres nos dois campos.'};
  const {error}=await supabase.auth.updateUser({password});
  return {success:!error,message:error?'Não foi possível alterar a senha.':'Senha alterada.'};
 }
 // Remove actual Storage objects before deleting Auth and its related rows.
 while(true){
  const {data:files,error}=await supabase.storage.from(photoBucket).list(data.user.id,{limit:100});
  if(error)return {success:false,message:'Não foi possível remover as fotos. A exclusão ainda não foi concluída; tente novamente.'};
  if(!files?.length)break;
  const paths=files.filter(file=>file.id).map(file=>data.user.id+'/'+file.name);
  if(!paths.length)return {success:false,message:'Há arquivos que exigem revisão antes da exclusão.'};
  const {error:remove}=await supabase.storage.from(photoBucket).remove(paths);
  if(remove)return {success:false,message:'A remoção das fotos falhou. Tente concluir a exclusão novamente.'};
 }
 const {error:deletion}=await supabase.rpc('duoeto_account',{action:'delete',payload:{confirmation:'EXCLUIR MINHA CONTA'}});
 if(deletion)return {success:false,message:'Não foi possível concluir a exclusão. Tente novamente.'};
 await supabase.auth.signOut({scope:'local'});redirect('/entrar?excluida=1');
}
export async function unblock(target:string){
 if(!/^[0-9a-f-]{36}$/i.test(target))return {error:'Perfil inválido.'};
 const supabase=await createServerSupabaseClient();
 const {error}=await supabase.rpc('duoeto_account',{action:'unblock',payload:{target}});
 if(!error)revalidatePath('/bloqueados');
 return {error:error?'Não foi possível desbloquear.':null};
}
