import { createClient } from '@supabase/supabase-js';
// The provider's default email links can finish in any browser. No PKCE verifier
// from the signup browser is needed; the fragment tokens are exchanged for SSR cookies.
export function createEmailAuthClient(){
 const url=process.env.NEXT_PUBLIC_SUPABASE_URL;const key=process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
 if(!url||!key)throw new Error('Autenticação indisponível.');
 return createClient(url,key,{auth:{flowType:'implicit',persistSession:false,autoRefreshToken:false,detectSessionInUrl:false}});
}
