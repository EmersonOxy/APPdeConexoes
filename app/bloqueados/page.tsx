import { ApplicationShell } from '@/components/application-shell';
import { BlockedList } from '@/components/account-settings';
import { requireUser } from '@/lib/supabase/require-user';
import { createServerSupabaseClient } from '@/lib/supabase/server';
export default async function Page(){await requireUser();const supabase=await createServerSupabaseClient(false);const {data,error}=await supabase.rpc('duoeto_account',{action:'blocks'});return <ApplicationShell><main className="page"><h1>Pessoas bloqueadas</h1>{error?<p role="alert">Não foi possível carregar. Tente novamente.</p>:<BlockedList items={data??[]}/>}</main></ApplicationShell>}
