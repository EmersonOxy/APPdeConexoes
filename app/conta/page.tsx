import { ApplicationShell } from '@/components/application-shell';
import { AccountSettings } from '@/components/account-settings';
import { requireUser } from '@/lib/supabase/require-user';
import { createServerSupabaseClient } from '@/lib/supabase/server';
export default async function Page(){await requireUser();const supabase=await createServerSupabaseClient(false);const {data,error}=await supabase.rpc('duoeto_account',{action:'username'});return <ApplicationShell><main className="page profile-workspace"><h1>Minha conta</h1>{error?<p role="alert">Não foi possível carregar. Tente novamente.</p>:<AccountSettings username={data?.username??null}/>}</main></ApplicationShell>}
