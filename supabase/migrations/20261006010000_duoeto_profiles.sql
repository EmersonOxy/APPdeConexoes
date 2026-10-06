begin;
create table public.duoeto_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null check (char_length(trim(display_name)) between 2 and 80),
  birth_date date not null,
  city text not null check (char_length(trim(city)) between 2 and 100),
  state text not null check (state ~ '^[A-Z]{2}$'),
  about text not null default '' check (char_length(about) <= 500),
  interests text[] not null default '{}' check (cardinality(interests) <= 15),
  objectives text[] not null default '{}' check (cardinality(objectives) <= 5),
  photo_path text not null check (char_length(photo_path) <= 200),
  updated_at timestamptz not null default now()
);
create function public.duoeto_confirmed_user()
returns boolean language sql stable security definer set search_path = ''
as $$
  select exists (select 1 from auth.users where id = auth.uid() and email_confirmed_at is not null);
$$;
revoke all on function public.duoeto_confirmed_user() from public;
grant execute on function public.duoeto_confirmed_user() to authenticated;
alter table public.duoeto_profiles enable row level security;
revoke all on public.duoeto_profiles from anon, authenticated;
grant select, insert, update on public.duoeto_profiles to authenticated;
create policy duoeto_profile_select on public.duoeto_profiles for select to authenticated
using (user_id = (select auth.uid()) and public.duoeto_confirmed_user());
create policy duoeto_profile_insert on public.duoeto_profiles for insert to authenticated
with check (user_id = (select auth.uid()) and public.duoeto_confirmed_user());
create policy duoeto_profile_update on public.duoeto_profiles for update to authenticated
using (user_id = (select auth.uid()) and public.duoeto_confirmed_user())
with check (user_id = (select auth.uid()) and public.duoeto_confirmed_user());
create function public.duoeto_validate_profile()
returns trigger language plpgsql security invoker set search_path = ''
as $$
begin
  if new.birth_date > (current_date - interval '18 years')::date
     or new.birth_date < (current_date - interval '120 years')::date then
    raise exception 'Data de nascimento inválida';
  end if;
  if split_part(new.photo_path, '/', 1) <> new.user_id::text
     or not exists (select 1 from storage.objects where bucket_id = 'duoeto-profile-photos' and name = new.photo_path) then
    raise exception 'Foto principal inválida';
  end if;
  new.updated_at = now();
  return new;
end;
$$;
revoke all on function public.duoeto_validate_profile() from public;
create trigger duoeto_profile_validate before insert or update on public.duoeto_profiles
for each row execute function public.duoeto_validate_profile();
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('duoeto-profile-photos', 'duoeto-profile-photos', false, 5242880, array['image/jpeg'])
on conflict (id) do nothing;
create policy duoeto_photo_select on storage.objects for select to authenticated
using (bucket_id = 'duoeto-profile-photos' and split_part(name, '/', 1) = (select auth.uid())::text and public.duoeto_confirmed_user());
create policy duoeto_photo_insert on storage.objects for insert to authenticated
with check (bucket_id = 'duoeto-profile-photos' and split_part(name, '/', 1) = (select auth.uid())::text and public.duoeto_confirmed_user());
create policy duoeto_photo_delete on storage.objects for delete to authenticated
using (bucket_id = 'duoeto-profile-photos' and split_part(name, '/', 1) = (select auth.uid())::text and public.duoeto_confirmed_user());
commit;
