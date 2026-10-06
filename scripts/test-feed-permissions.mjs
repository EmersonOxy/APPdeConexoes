import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";

const db = new PGlite();
const ids = Array.from({ length: 7 }, (_, i) => `${i + 1}`.repeat(8) + "-1111-4111-8111-111111111111");
const [alice, bob, unconfirmed, banned, incomplete, older, carol] = ids;
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

async function asUser(id) {
  await db.exec("reset role");
  await db.query("select set_config('request.jwt.claim.sub',$1,false)", [id]);
  await db.exec("set role authenticated");
}
async function feed(seen = []) { return (await db.query("select * from public.duoeto_feed($1::uuid[])", [seen])).rows; }
async function photo(id) { return (await db.query("select public.duoeto_feed_photo($1) as path", [id])).rows[0].path; }
async function storage(path) { return (await db.query("select name from storage.objects where name=$1", [path])).rows; }
async function block(owner, target) { await db.query("insert into public.duoeto_blocks(owner_id,target_id) values ($1,$2) on conflict do nothing", [owner, target]); }

await asUser(alice);
const first = await feed();
assert.deepEqual(first.map(p => p.user_id).sort(), [bob, carol].sort());
assert.deepEqual(Object.keys(first[0]).sort(), ["user_id", "display_name", "age", "city", "state", "about", "interests", "objectives"].sort());
assert.equal(first[0].age, 25);
assert.equal((await feed([bob, carol])).length, 0);
assert.equal((await feed(Array(5001).fill(bob))).length, 0);
assert.equal((await db.query("select user_id from public.duoeto_profiles")).rows.length, 1);
assert.equal(await photo(bob), bob + "/photo.jpg");
assert.equal((await storage(bob + "/photo.jpg")).length, 1);
assert.equal((await storage(bob + "/old.jpg")).length, 0);
assert.equal((await storage(alice + "/old.jpg")).length, 1);
assert.equal((await db.query("update public.duoeto_profiles set display_name='Editado' where user_id=$1 returning user_id", [bob])).rows.length, 0);
assert.equal((await db.query("update public.duoeto_profiles set display_name='Editado' where user_id=$1 returning user_id", [alice])).rows.length, 1);
await assert.rejects(block(bob, carol), /row-level security/);
await assert.rejects(block(alice, alice), /check constraint/);
await block(alice, bob);
await block(alice, bob); // idempotent retry
assert.deepEqual((await feed()).map(p => p.user_id), [carol]);
assert.equal(await photo(bob), null);
assert.equal((await storage(bob + "/photo.jpg")).length, 0);
await asUser(bob);
assert.ok(!(await feed()).some(p => p.user_id === alice));
assert.equal(await photo(alice), null);
assert.equal((await storage(alice + "/photo.jpg")).length, 0);
assert.equal((await db.query("select * from public.duoeto_blocks")).rows.length, 0);
await assert.rejects(db.exec("delete from public.duoeto_blocks"), /permission denied/);

await asUser(alice);
await db.query("insert into public.duoeto_feed_hidden values ($1,$2)", [alice, carol]);
assert.equal((await feed()).length, 0);
assert.equal(await photo(carol), null);
await asUser(carol);
assert.ok((await feed()).some(p => p.user_id === alice)); // unilateral disinterest
assert.equal((await db.query("select * from public.duoeto_feed_hidden")).rows.length, 0);
await asUser(alice);
await db.exec("delete from public.duoeto_feed_hidden");
assert.deepEqual((await feed()).map(p => p.user_id), [carol]);

for (const id of [unconfirmed, banned, incomplete, ""]) {
  await asUser(id);
  assert.equal((await feed()).length, 0);
  assert.equal(await photo(carol), null);
  assert.equal((await storage(carol + "/photo.jpg")).length, 0);
}
await asUser(unconfirmed);
await assert.rejects(block(unconfirmed, carol), /row-level security/);
await db.exec("reset role; set role anon");
await assert.rejects(feed(), /permission denied/);
await assert.rejects(photo(alice), /permission denied/);
await assert.rejects(db.exec("select * from public.duoeto_profiles"), /permission denied/);

await db.exec("reset role");
await db.query("update auth.users set deleted_at=now() where id=$1", [carol]);
await asUser(alice);
assert.equal((await feed()).length, 0);
await db.exec("reset role");
assert.equal((await db.query("select public from storage.buckets")).rows[0].public, false);
await db.close();
console.log("PASS: Feed real, idade, projeção privada, exclusões, bloqueios bilaterais, fotos atuais, RLS, conta confirmada/banida/excluída e regressão de edição.");
