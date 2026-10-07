import { createServerClient } from "@supabase/ssr";
import { NextRequest, NextResponse } from "next/server";

export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  const protectedPath = ["/feed", "/perfil", "/mensagens", "/pessoa", "/notificacoes", "/denuncias", "/conta", "/bloqueados", "/nova-senha"].some((path) => request.nextUrl.pathname === path || request.nextUrl.pathname.startsWith(path + "/"));
  if (!url || !key) {
    if (protectedPath) return NextResponse.redirect(new URL("/entrar?erro=configuracao", request.url));
    return response;
  }
  const supabase = createServerClient(url, key, {
    cookieOptions: { maxAge: 60 * 60 * 24 * 30, sameSite: "lax" },
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
  if (!error && data.user?.email_confirmed_at && ["/", "/entrar", "/cadastro"].includes(request.nextUrl.pathname)) {
    const next = NextResponse.redirect(new URL("/feed", request.url));
    response.cookies.getAll().forEach(cookie => next.cookies.set(cookie));
    next.headers.set("Cache-Control", "private, no-store"); return next;
  }
  response.headers.set("Cache-Control", "private, no-store");
  return response;
}

export const config = {
  matcher: ["/", "/conta", "/bloqueados", "/nova-senha", "/feed/:path*", "/perfil/:path*", "/mensagens/:path*", "/pessoa/:path*", "/entrar", "/cadastro", "/notificacoes", "/denuncias"],
};
