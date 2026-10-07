import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  const site = process.env.NEXT_PUBLIC_SITE_URL;
  const origin = site ? new URL(site).origin : request.nextUrl.origin;
  if (code) {
    const supabase = await createServerSupabaseClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      const response = NextResponse.redirect(new URL(request.nextUrl.searchParams.get("next") === "recovery" ? "/nova-senha" : "/feed", origin));
      response.headers.set("Cache-Control", "private, no-store");
      response.headers.set("Referrer-Policy", "no-referrer");
      return response;
    }
  }
  const response = NextResponse.redirect(new URL("/confirmar?erro=link", origin));
  response.headers.set("Cache-Control", "private, no-store");
  return response;
}
