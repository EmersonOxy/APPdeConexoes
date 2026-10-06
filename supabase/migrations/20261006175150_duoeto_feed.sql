begin;

create schema if not exists duoeto_private;
revoke all on schema duoeto_private from public, anon;
grant usage on schema duoeto_private to authenticated;

create table public.duoeto_blocks (
  owner_id uuid not null references auth.users(id) on delete cascade,
  target_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (owner_id, target_id),
  check (owner_id <> target_id)
);
create index duoeto_blocks_target_idx on public.duoeto_blocks (target_id, owner_id);
alter table public.duoeto_blocks enable row level security;
revoke all on public.duoeto_blocks from public, anon, authenticated;
grant select, insert on public.duoeto_blocks to authenticated;
create policy duoeto_blocks_read on public.duoeto_blocks for select to authenticated
using (owner_id = (select auth.uid()) and public.duoeto_confirmed_user());
create policy duoeto_blocks_insert on public.duoeto_blocks for insert to authenticated
with check (owner_id = (select auth.uid()) and public.duoeto_confirmed_user());

create table public.duoeto_feed_hidden (
  owner_id uuid not null references auth.users(id) on delete cascade,
  target_id uuid not null references auth.users(id) on delete cascade,
  primary key (owner_id, target_id),
  check (owner_id <> target_id)
);
create index duoeto_feed_hidden_target_idx on public.duoeto_feed_hidden (target_id);
alter table public.duoeto_feed_hidden enable row level security;
revoke all on public.duoeto_feed_hidden from public, anon, authenticated;
grant select, insert, delete on public.duoeto_feed_hidden to authenticated;
create policy duoeto_hidden_read on public.duoeto_feed_hidden for select to authenticated
using (owner_id = (select auth.uid()) and public.duoeto_confirmed_user());
create policy duoeto_hidden_insert on public.duoeto_feed_hidden for insert to authenticated
with check (owner_id = (select auth.uid()) and public.duoeto_confirmed_user());
create policy duoeto_hidden_delete on public.duoeto_feed_hidden for delete to authenticated
using (owner_id = (select auth.uid()) and public.duoeto_confirmed_user());

-- The privileged projection is kept outside the exposed schema. It deliberately
-- bypasses owner-only RLS, but always derives the viewer from auth.uid().
-- No caller-supplied viewer, birth date, email, or reputation leaves this boundary.
create function duoeto_private.visible_profile(target uuid)
returns boolean language sql stable security definer set search_path = ''
as $$
  select auth.uid() is not null and target <> auth.uid()
    and exists (
      select 1 from auth.users u join public.duoeto_profiles p on p.user_id = u.id
      where u.id = auth.uid() and u.email_confirmed_at is not null
        and u.deleted_at is null and (u.banned_until is null or u.banned_until <= now())
        and p.birth_date <= (current_date - interval '18 years')::date
        and exists (select 1 from storage.objects o where o.bucket_id = 'duoeto-profile-photos' and o.name = p.photo_path)
    )
    and exists (
      select 1 from auth.users u join public.duoeto_profiles p on p.user_id = u.id
      where u.id = target and u.email_confirmed_at is not null
        and u.deleted_at is null and (u.banned_until is null or u.banned_until <= now())
        and p.birth_date <= (current_date - interval '18 years')::date
        and exists (select 1 from storage.objects o where o.bucket_id = 'duoeto-profile-photos' and o.name = p.photo_path)
    )
    and not exists (
      select 1 from public.duoeto_blocks b
      where (b.owner_id = auth.uid() and b.target_id = target)
         or (b.owner_id = target and b.target_id = auth.uid())
    )
    and not exists (
      select 1 from public.duoeto_feed_hidden h where h.owner_id = auth.uid() and h.target_id = target
    );
$$;
revoke all on function duoeto_private.visible_profile(uuid) from public, anon;
grant execute on function duoeto_private.visible_profile(uuid) to authenticated;

create function duoeto_private.feed(seen uuid[])
returns table (user_id uuid, display_name text, age integer, city text, state text, about text, interests text[], objectives text[])
language sql volatile security definer set search_path = ''
as $$
  select p.user_id, p.display_name, extract(year from age(current_date, p.birth_date))::integer,
    p.city, p.state, p.about, p.interests, p.objectives
  from public.duoeto_profiles p
  where auth.uid() is not null
    and coalesce(cardinality(seen), 0) <= 5000
    and p.user_id <> all(coalesce(seen, '{}'::uuid[]))
    and extract(year from age(current_date, p.birth_date)) between 18 and 50
    and duoeto_private.visible_profile(p.user_id)
  order by random() limit 24;
$$;
revoke all on function duoeto_private.feed(uuid[]) from public, anon;
grant execute on function duoeto_private.feed(uuid[]) to authenticated;

create function public.duoeto_feed(seen uuid[] default '{}')
returns table (user_id uuid, display_name text, age integer, city text, state text, about text, interests text[], objectives text[])
language sql volatile security invoker set search_path = ''
as $$ select * from duoeto_private.feed(seen); $$;
revoke all on function public.duoeto_feed(uuid[]) from public, anon;
grant execute on function public.duoeto_feed(uuid[]) to authenticated;

create function duoeto_private.feed_photo(target uuid)
returns text language sql stable security definer set search_path = ''
as $$
  select p.photo_path from public.duoeto_profiles p
  where auth.uid() is not null and p.user_id = target and duoeto_private.visible_profile(target);
$$;
revoke all on function duoeto_private.feed_photo(uuid) from public, anon;
grant execute on function duoeto_private.feed_photo(uuid) to authenticated;

create function public.duoeto_feed_photo(target uuid)
returns text language sql stable security invoker set search_path = ''
as $$ select duoeto_private.feed_photo(target); $$;
revoke all on function public.duoeto_feed_photo(uuid) from public, anon;
grant execute on function public.duoeto_feed_photo(uuid) to authenticated;

-- Only the current main photo is shared. Old uploads remain owner-only.
create policy duoeto_feed_photo_read on storage.objects for select to authenticated
using (bucket_id = 'duoeto-profile-photos'
  and name = duoeto_private.feed_photo(
    case when split_part(name, '/', 1) ~ '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$'
      then split_part(name, '/', 1)::uuid else null end));

commit;
