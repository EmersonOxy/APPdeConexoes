begin;
create or replace function public.duoeto_account(action text,payload jsonb default '{}') returns jsonb language plpgsql security definer set search_path='' as $$
#variable_conflict use_variable
declare actor uuid:=auth.uid(); peer uuid; name text;
begin
 if actor is null or not public.duoeto_confirmed_user() then raise exception 'Entre com sua conta confirmada.'; end if;
 if action='username' then return jsonb_build_object('username',(select username from duoeto_private.usernames where user_id=actor));
 elsif action='set_username' then
  name:=lower(btrim(payload->>'username'));
  if name is null or name !~ '^[a-z][a-z0-9_]{2,23}$' then raise exception 'Use 3 a 24 letras, números ou _, começando por uma letra.'; end if;
  begin insert into duoeto_private.usernames values(actor,name) on conflict(user_id) do update set username=excluded.username;
  exception when unique_violation then raise exception 'Este nome de usuário já está em uso.'; end;
  return jsonb_build_object('username',name);
 elsif action='blocks' then
  return coalesce((select jsonb_agg(x order by x.created_at desc) from (select b.target_id,p.display_name,b.created_at from public.duoeto_blocks b left join public.duoeto_profiles p on p.user_id=b.target_id where b.owner_id=actor) x),'[]');
 elsif action='unblock' then
  peer:=(payload->>'target')::uuid; perform duoeto_private.lock_pair(actor,peer);
  delete from public.duoeto_blocks where owner_id=actor and target_id=peer;
  return '{}';
 elsif action='delete' then
  if payload->>'confirmation' is distinct from 'EXCLUIR MINHA CONTA' then raise exception 'Confirme a exclusão definitiva.'; end if;
  -- Storage objects must first be removed through its API, not by deleting metadata.
  if exists(select 1 from storage.objects where bucket_id='duoeto-profile-photos' and split_part(storage.objects.name,'/',1)=actor::text) then raise exception 'Remova as fotos da conta antes de concluir a exclusão.'; end if;
  -- Remove reports of content being deleted even when reporter/accused survive.
  delete from duoeto_private.reports r where
    (r.subject='first_impression' and r.target in(select id from duoeto_private.ratings where author=actor or target=actor))
    or (r.subject='interaction' and r.target in(select id from duoeto_private.interaction_ratings where author=actor or target=actor or conversation_id in(select id from duoeto_private.conversations where actor in(a,b))))
    or (r.subject='conversation' and r.target in(select id from duoeto_private.conversations where actor in(a,b)))
    or (r.subject='contact' and r.target in(select id from duoeto_private.contacts where actor in(sender,recipient)));
  delete from duoeto_private.interaction_ratings where conversation_id in(select id from duoeto_private.conversations where actor in(a,b));
  delete from duoeto_private.conversations where actor in(a,b);
  delete from auth.users where id=actor;
  return '{}';
 end if;
 raise exception 'Ação inválida.';
end; $$;
commit;
