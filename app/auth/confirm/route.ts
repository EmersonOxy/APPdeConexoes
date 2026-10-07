import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
export async function GET(request: NextRequest) {
 const hash=request.nextUrl.searchParams.get("token_hash");const type=request.nextUrl.searchParams.get("type");
 const origin=process.env.NEXT_PUBLIC_SITE_URL ? new URL(process.env.NEXT_PUBLIC_SITE_URL).origin : request.nextUrl.origin;
 let destination=type==="recovery" ? "/recuperar-senha" : "/confirmar?erro=link";
 if(hash && hash.length<512 && (type==="signup" || type==="recovery")) {
  const supabase=await createServerSupabaseClient();
  const {error}=await supabase.auth.verifyOtp({token_hash:hash,type});
  if(!error) destination=type==="recovery" ? "/nova-senha" : "/feed";
 }
 const response=NextResponse.redirect(new URL(destination,origin));response.headers.set("Cache-Control","private, no-store");response.headers.set("Referrer-Policy","no-referrer");return response;
}
