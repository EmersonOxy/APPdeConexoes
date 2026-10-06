import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";

const database = new PGlite();
const owner = "11111111-1111-4111-8111-111111111111";
const other = "22222222-2222-4222-8222-222222222222";
const unconfirmed = "33333333-3333-4333-8333-333333333333";
await database.exec(`
  create role anon; create role authenticated;
  create schema auth; create schema storage;
  create table auth.users (id uuid primary key, email_confirmed_at timestamptz);
  create function auth.uid() returns uuid language sql stable as $$
    select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid;
  $$;
  grant usage on schema public, auth, storage to authenticated, anon;
  grant execute on function auth.uid() to authenticated, anon;
  create table storage.buckets (id text primary key, name text, public boolean, file_size_limit bigint, allowed_mime_types text[]);
  create table storage.objects (bucket_id text, name text, primary key(bucket_id,name));
  alter table storage.objects enable row level security;
  grant select, insert, delete on storage.objects to authenticated;
  insert into auth.users values
    ('${owner}', now()), ('${other}', now()), ('${unconfirmed}', null);
`);
await database.exec(await readFile(new URL("../supabase/migrations/20261006010000_duoeto_profiles.sql", import.meta.url), "utf8"));
async function asUser(user) {
  await database.exec("reset role");
  await database.query("select set_config('request.jwt.claim.sub', $1, false)", [user]);
  await database.exec("set role authenticated");
}
await asUser(owner);
await database.query("insert into storage.objects values ('duoeto-profile-photos', $1)", [owner + "/photo.jpg"]);
await database.query("insert into public.duoeto_profiles (user_id,display_name,birth_date,city,state,photo_path) values ($1,'Teste','1995-01-01','Caxias do Sul','RS',$2)", [owner, owner + "/photo.jpg"]);
assert.equal((await database.query("select * from public.duoeto_profiles")).rows.length, 1);
assert.equal((await database.query("update public.duoeto_profiles set display_name='Nome editado' returning display_name")).rows[0].display_name, "Nome editado");
await assert.rejects(database.query("update public.duoeto_profiles set birth_date=current_date"), /nascimento/);
await assert.rejects(database.query("update public.duoeto_profiles set photo_path=$1", [other + "/photo.jpg"]), /Foto principal/);
await assert.rejects(database.query("update public.duoeto_profiles set photo_path=$1", [owner + "/missing.jpg"]), /Foto principal/);
await asUser(other);
assert.equal((await database.query("select * from public.duoeto_profiles")).rows.length, 0);
assert.equal((await database.query("update public.duoeto_profiles set display_name='Intruso' returning *")).rows.length, 0);
assert.equal((await database.query("select * from storage.objects")).rows.length, 0);
await assert.rejects(database.query("insert into storage.objects values ('duoeto-profile-photos',$1)", [owner + "/intruder.jpg"]), /row-level security/);
await assert.rejects(database.query("insert into public.duoeto_profiles (user_id,display_name,birth_date,city,state,photo_path) values ($1,'Intruso','1995-01-01','Cidade','RS',$2)", [owner, owner + "/photo.jpg"]));
await asUser(unconfirmed);
await assert.rejects(database.query("insert into storage.objects values ('duoeto-profile-photos',$1)", [unconfirmed + "/photo.jpg"]), /row-level security/);
await database.exec("reset role; set role anon");
await assert.rejects(database.query("select * from public.duoeto_profiles"), /permission denied/);
await database.exec("reset role");
assert.equal((await database.query("select public from storage.buckets")).rows[0].public, false);
await database.close();
console.log("PASS: perfil próprio, edição, idade mínima, foto válida, isolamento entre contas, upload restrito, e-mail confirmado e acesso anônimo.");
