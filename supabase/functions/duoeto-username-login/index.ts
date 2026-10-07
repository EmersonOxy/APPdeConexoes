// Email lookup stays inside Supabase. Neither anonymous RPC callers nor a failed
// login receive an email address. Auth verifies the password and confirmation.
Deno.serve(async (request: Request) => {
  const headers = { "Content-Type": "application/json", "Cache-Control": "no-store" };
  const fail = () => new Response(JSON.stringify({ error: "Não foi possível entrar. Confira usuário, senha e confirmação do e-mail; após várias tentativas, aguarde 15 minutos." }), { status: 401, headers });
  if (request.method !== "POST") return new Response(null, { status: 405 });
  try {
    if (Number(request.headers.get("content-length") ?? 0) > 2048) return fail();
    const body = await request.text(); if (body.length > 2048) return fail();
    const { username, password } = JSON.parse(body);
    if (typeof username !== "string" || !/^[a-z][a-z0-9_]{2,23}$/i.test(username) || typeof password !== "string" || password.length < 8 || password.length > 128) return fail();
    const url = Deno.env.get("SUPABASE_URL")!;
    const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const identity = await fetch(url + "/rest/v1/rpc/duoeto_login_identity", { method: "POST", headers: { "apikey": key, "Authorization": "Bearer " + key, "Content-Type": "application/json" }, body: JSON.stringify({ login: username }) });
    if (!identity.ok) return fail();
    const email = await identity.json(); if (!email) return fail();
    const login = await fetch(url + "/auth/v1/token?grant_type=password", { method: "POST", headers: { "apikey": key, "Content-Type": "application/json" }, body: JSON.stringify({ email, password }) });
    if (!login.ok) return fail();
    const session = await login.json();
    return new Response(JSON.stringify({ access_token: session.access_token, refresh_token: session.refresh_token }), { headers });
  } catch { return fail(); }
});
