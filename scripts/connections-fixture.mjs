import { readFile } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";

export const db = new PGlite();
const ids = Array.from({ length: 7 }, (_, i) => `${i + 1}`.repeat(8) + "-1111-4111-8111-111111111111");
export const [alice, bob, unconfirmed, banned, incomplete, older, carol] = ids;
await db.exec(`
  create role anon; create role authenticated;
  create schema auth; create schema storage;
  create table auth.users (id uuid primary key, email_confirmed_at timestamptz, banned_until timestamptz, deleted_at timestamptz);
  create function auth.uid() returns uuid language sql stable as $$
    select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid;
  $$;
  grant usage on schema public, auth, storage to authenticated, anon;
  grant execute on function auth.uid() to authenticated, anon;
  create table storage.buckets (id text primary key, name text, public boolean, file_size_limit bigint, allowed_mime_types text[]);
  create table storage.objects (bucket_id text, name text, primary key(bucket_id,name));
  alter table storage.objects enable row level security;
  grant select, insert, delete on storage.objects to authenticated;
`);
await db.exec(await readFile(new URL("../supabase/migrations/20261006010000_duoeto_profiles.sql", import.meta.url), "utf8"));
await db.exec(await readFile(new URL("../supabase/migrations/20261006175150_duoeto_feed.sql", import.meta.url), "utf8"));
for (const id of ids) {
  await db.query("insert into auth.users values ($1, now(), null, null)", [id]);
  if (id === incomplete) continue;
  await db.query("insert into storage.objects values ('duoeto-profile-photos',$1),('duoeto-profile-photos',$2)", [id + "/photo.jpg", id + "/old.jpg"]);
  await db.query(`insert into public.duoeto_profiles (user_id,display_name,birth_date,city,state,photo_path)
    values ($1,'Pessoa',current_date - make_interval(years => $3),'Cidade','RS',$2)`, [id, id + "/photo.jpg", id === older ? 60 : 25]);
}
await db.query("update auth.users set email_confirmed_at=null where id=$1", [unconfirmed]);
await db.query("update auth.users set banned_until=now()+interval '1 day' where id=$1", [banned]);

export async function asUser(id) {
  await db.exec("reset role");
  await db.query("select set_config('request.jwt.claim.sub',$1,false)", [id]);
  await db.exec("set role authenticated");
}
export async function feed(seen = []) { return (await db.query("select * from public.duoeto_feed($1::uuid[])", [seen])).rows; }
export async function photo(id) { return (await db.query("select public.duoeto_feed_photo($1) as path", [id])).rows[0].path; }
export async function storage(path) { return (await db.query("select name from storage.objects where name=$1", [path])).rows; }
export async function block(owner, target) { await db.query("insert into public.duoeto_blocks(owner_id,target_id) values ($1,$2) on conflict do nothing", [owner, target]); }


await db.exec(await readFile(new URL("../supabase/migrations/20261006182732_duoeto_connections.sql", import.meta.url), "utf8"));
export async function rpc(action,target=null,payload={}) {
  return (await db.query('select public.duoeto_connections($1,$2,$3) as result',[action,target,payload])).rows[0].result;
}

// Warm the public SQL wrapper before the forward migration to check upgrades.
await asUser(alice);
await rpc('profile',bob);
await db.exec('reset role');
// Simulate a deployment of the original typo; the forward migration must repair it.
await db.exec(`do $$ begin execute replace(pg_get_functiondef('duoeto_private.connections(text,uuid,jsonb)'::regprocedure),'public.duoeto_profiles','publilc.duoeto_profiles'); end $$;`);
await db.exec(await readFile(new URL("../supabase/migrations/20261007010000_duoeto_interactions.sql", import.meta.url), "utf8"));

await db.exec(await readFile(new URL("../supabase/migrations/20261007020000_duoeto_safety_notifications.sql", import.meta.url), "utf8"));
export async function safety(action,target=null,payload={}) {
 return (await db.query("select public.duoeto_safety($1,$2,$3) as result",[action,target,payload])).rows[0].result;
}

await db.exec(await readFile(new URL("../supabase/migrations/20261007030000_duoeto_discovery_filters.sql", import.meta.url), "utf8"));

await db.exec(await readFile(new URL("../supabase/migrations/20261007040000_duoeto_feed_gallery_prerequisites.sql", import.meta.url), "utf8"));
