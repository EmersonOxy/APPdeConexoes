import { createServerClient } from "@supabase/ssr";
import { NextRequest, NextResponse } from "next/server";

export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  const protectedPath = ["/feed", "/perfil", "/mensagens", "/pessoa"].some((path) => request.nextUrl.pathname === path || request.nextUrl.pathname.startsWith(path + "/"));
  if (!url || !key) {
    if (protectedPath) return NextResponse.redirect(new URL("/entrar?erro=configuracao", request.url));
    return response;
  }
  const supabase = createServerClient(url, key, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll(values) {
        values.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        values.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      },
    },
  });
  const { data, error } = await supabase.auth.getUser();
  if (protectedPath && (error || !data.user || !data.user.email_confirmed_at)) {
    const redirectResponse = NextResponse.redirect(new URL("/entrar", request.url));
    response.cookies.getAll().forEach((cookie) => redirectResponse.cookies.set(cookie));
    redirectResponse.headers.set("Cache-Control", "private, no-store");
    return redirectResponse;
  }
  response.headers.set("Cache-Control", "private, no-store");
  return response;
}

export const config = {
  matcher: ["/feed", "/perfil/:path*", "/mensagens/:path*", "/pessoa/:path*", "/entrar", "/cadastro"],
};
