begin;
create table duoeto_private.usernames (
 user_id uuid primary key references auth.users(id) on delete cascade,
 username text not null unique check(username ~ '^[a-z][a-z0-9_]{2,23}$')
);
alter table duoeto_private.usernames enable row level security;
revoke all on duoeto_private.usernames from public,anon,authenticated;
create function duoeto_private.register_username() returns trigger language plpgsql security definer set search_path='' as $$
declare value text:=lower(btrim(new.raw_user_meta_data->>'username'));
begin
 if value is not null and value<>'' then insert into duoeto_private.usernames values(new.id,value); end if;
 return new;
end; $$;
revoke all on function duoeto_private.register_username() from public,anon,authenticated;
create trigger duoeto_register_username after insert on auth.users for each row execute function duoeto_private.register_username();
create table duoeto_private.login_attempts(username text primary key,started_at timestamptz not null,attempts integer not null);
alter table duoeto_private.login_attempts enable row level security;
revoke all on duoeto_private.login_attempts from public,anon,authenticated;
create function public.duoeto_login_identity(login text) returns text language plpgsql security definer set search_path='' as $$
declare attempts integer; result text; normalized text:=lower(btrim(login));
begin
 if normalized !~ '^[a-z][a-z0-9_]{2,23}$' then return null; end if;
 delete from duoeto_private.login_attempts where started_at<now()-interval '1 day';
 insert into duoeto_private.login_attempts values(normalized,now(),1) on conflict(username) do update
 set attempts=case when login_attempts.started_at<now()-interval '15 minutes' then 1 else login_attempts.attempts+1 end,
 started_at=case when login_attempts.started_at<now()-interval '15 minutes' then now() else login_attempts.started_at end
 returning login_attempts.attempts into attempts;
 if attempts>10 then return null; end if;
 select u.email into result from auth.users u join duoeto_private.usernames n on n.user_id=u.id
 where n.username=normalized and u.deleted_at is null and (u.banned_until is null or u.banned_until<=now());
 return result;
end; $$;
revoke all on function public.duoeto_login_identity(text) from public,anon,authenticated;
grant execute on function public.duoeto_login_identity(text) to service_role;

create function public.duoeto_account(action text,payload jsonb default '{}') returns jsonb language plpgsql security definer set search_path='' as $$
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
  delete from duoeto_private.interaction_ratings where conversation_id in(select id from duoeto_private.conversations where actor in(a,b));
  delete from duoeto_private.conversations where actor in(a,b);
  delete from auth.users where id=actor;
  return '{}';
 end if;
 raise exception 'Ação inválida.';
end; $$;
revoke all on function public.duoeto_account(text,jsonb) from public,anon;
grant execute on function public.duoeto_account(text,jsonb) to authenticated;

-- Only an event counter is public to Realtime; conversation content stays private.
create table public.duoeto_inbox_events(user_id uuid primary key references auth.users(id) on delete cascade,revision bigint not null default 1);
alter table public.duoeto_inbox_events enable row level security;
revoke all on public.duoeto_inbox_events from public,anon,authenticated;
grant select on public.duoeto_inbox_events to authenticated;
create policy duoeto_inbox_events_read on public.duoeto_inbox_events for select to authenticated using(user_id=auth.uid());
create function duoeto_private.inbox_event() returns trigger language plpgsql security definer set search_path='' as $$
begin
 if tg_table_name='notifications' then
  insert into public.duoeto_inbox_events values(new.recipient,1) on conflict(user_id) do update set revision=duoeto_inbox_events.revision+1;
 else
  insert into public.duoeto_inbox_events values(new.owner_id,1),(new.target_id,1) on conflict(user_id) do update set revision=duoeto_inbox_events.revision+1;
 end if;
 return new;
end; $$;
revoke all on function duoeto_private.inbox_event() from public,anon,authenticated;
create trigger duoeto_notification_inbox after insert or update on duoeto_private.notifications for each row execute function duoeto_private.inbox_event();
create trigger duoeto_block_inbox after insert on public.duoeto_blocks for each row execute function duoeto_private.inbox_event();
do $$ begin if exists(select 1 from pg_publication where pubname='supabase_realtime') then alter publication supabase_realtime add table public.duoeto_inbox_events; end if; end $$;
alter table duoeto_private.notifications add column message_id bigint references duoeto_private.messages(id) on delete cascade;
update duoeto_private.notifications n set message_id=m.id from duoeto_private.messages m
 where n.kind='message' and n.target=m.conversation_id and n.peer=m.author and n.created_at=m.created_at
 and (select count(*) from duoeto_private.messages x where x.conversation_id=m.conversation_id and x.created_at=m.created_at)=1;
create or replace function duoeto_private.connection_event()
returns trigger language plpgsql security definer set search_path=''
as $$ declare peer uuid; v duoeto_private.conversations;
begin
  if tg_table_name='contacts' then
    if tg_op='INSERT' then
      insert into duoeto_private.notifications(recipient,peer,kind,target)
        values(new.recipient,new.sender,'contact_received',new.id);
    elsif old.status='pending' and new.status in ('accepted','declined') then
      insert into duoeto_private.notifications(recipient,peer,kind,target)
        values(new.sender,new.recipient,case when new.status='accepted' then 'contact_accepted' else 'contact_declined' end,new.id);
    end if;
  elsif tg_table_name='messages' then
    select * into v from duoeto_private.conversations where id=new.conversation_id;
    peer:=case when v.a=new.author then v.b else v.a end;
    insert into duoeto_private.notifications(recipient,peer,kind,target,message_id)
      values(peer,new.author,'message',v.id,new.id);
  elsif tg_table_name='conversations' then
    -- Blocking also closes a conversation, but must not notify either account.
    if pg_trigger_depth()=1 and auth.uid() in(new.a,new.b) and old.status='active' and new.status='closed' and duoeto_private.can_connect(case when new.a=auth.uid() then new.b else new.a end) then
      insert into duoeto_private.notifications(recipient,peer,kind,target)
        values(case when new.a=auth.uid() then new.b else new.a end,auth.uid(),'conversation_closed',new.id);
    end if;
  elsif tg_table_name='reports' and new.status<>old.status then
    new.updated_at:=now();
    insert into duoeto_private.notifications(recipient,kind,target) values(new.reporter,'report_updated',new.id);
  end if;
  return new;
end; $$;
create index notifications_unread on duoeto_private.notifications(recipient,target,id) where read_at is null;

create function public.duoeto_inbox(action text,payload jsonb default '{}') returns jsonb language plpgsql volatile security definer set search_path='' as $$
#variable_conflict use_variable
declare actor uuid:=auth.uid(); peer uuid; target uuid:=(payload->>'target')::uuid; kind text:=payload->>'kind'; search text:=left(coalesce(payload->>'search',''),80);
 cursor_time timestamptz:=(payload->>'before_time')::timestamptz; cursor_id uuid:=(payload->>'before_id')::uuid;
 unread_only boolean:=coalesce((payload->>'unread_only')::boolean,false); rows jsonb; counts jsonb;
begin
 if actor is null or not duoeto_private.active_account(actor) then raise exception 'Complete seu perfil para acessar as mensagens.'; end if;
 if action='read' then
  if kind='conversations' then select case when a=actor then b else a end into peer from duoeto_private.conversations where id=target and actor in(a,b);
  elsif kind='contacts' then select case when sender=actor then recipient else sender end into peer from duoeto_private.contacts where id=target and actor in(sender,recipient); end if;
  if peer is null or not duoeto_private.can_connect(peer) then raise exception 'Mensagem indisponível.'; end if;
  update duoeto_private.notifications set read_at=now() where recipient=actor and notifications.target=target and read_at is null
   and id<=coalesce((payload->>'through')::bigint,0) and ((kind='conversations' and notifications.kind='message') or (kind='contacts' and notifications.kind in ('contact_received','contact_accepted','contact_declined')));
  return '{}';
 end if;
 select jsonb_build_object('contacts',count(*) filter(where n.kind in('contact_received','contact_accepted','contact_declined')),'conversations',count(*) filter(where n.kind='message')) into counts
 from duoeto_private.notifications n where n.recipient=actor and n.read_at is null and duoeto_private.can_connect(n.peer);
 if action='counts' then return counts; end if;
 if action<>'list' or kind not in('contacts','conversations') then raise exception 'Ação inválida.'; end if;
 if kind='contacts' then
  select coalesce(jsonb_agg(x order by x.created_at desc,x.id desc),'[]') into rows from (
   select c.id,c.sender=actor as outgoing,p.display_name as name,p.user_id as peer_id,
    case when c.status='pending' and c.created_at<=now()-interval '30 days' then 'expired' else c.status end as status,c.created_at,c.decided_at,
    c.sender=actor and c.status='pending' and c.created_at>now()-interval '1 hour' as editable,
    (select count(*) from duoeto_private.notifications n where recipient=actor and n.target=c.id and read_at is null and n.kind in('contact_received','contact_accepted','contact_declined')) as unread,
    (select max(n.id)::text from duoeto_private.notifications n where recipient=actor and n.target=c.id) as read_cursor
   from duoeto_private.contacts c join public.duoeto_profiles p on p.user_id=case when c.sender=actor then c.recipient else c.sender end
   where actor in(c.sender,c.recipient) and c.status in('pending','declined','accepted') and duoeto_private.can_connect(p.user_id)
    and position(lower(search) in lower(p.display_name))>0 and (cursor_time is null or (c.created_at,c.id)<(cursor_time,cursor_id))
    and (not unread_only or exists(select 1 from duoeto_private.notifications n where recipient=actor and n.target=c.id and read_at is null and n.kind in('contact_received','contact_accepted','contact_declined')))
   order by c.created_at desc,c.id desc limit 31
  ) x;
 else
  select coalesce(jsonb_agg(x order by x.created_at desc,x.id desc),'[]') into rows from (
   select v.id,p.display_name as name,p.user_id as peer_id,v.status,v.created_at,
    (select count(*) from duoeto_private.notifications n where recipient=actor and n.target=v.id and read_at is null and n.kind='message') as unread
   from duoeto_private.conversations v join public.duoeto_profiles p on p.user_id=case when v.a=actor then v.b else v.a end
   where actor in(v.a,v.b) and duoeto_private.can_connect(p.user_id) and position(lower(search) in lower(p.display_name))>0
    and (cursor_time is null or (v.created_at,v.id)<(cursor_time,cursor_id))
    and (not unread_only or exists(select 1 from duoeto_private.notifications n where recipient=actor and n.target=v.id and read_at is null and n.kind='message'))
   order by v.created_at desc,v.id desc limit 31
  ) x;
 end if;
 return jsonb_build_object('items',case when jsonb_array_length(rows)>30 then rows-30 else rows end,'has_more',jsonb_array_length(rows)>30,'counts',counts);
end; $$;
revoke all on function public.duoeto_inbox(text,jsonb) from public,anon;
grant execute on function public.duoeto_inbox(text,jsonb) to authenticated;
create or replace function duoeto_private.connections_core(action text, target uuid, payload jsonb)
returns jsonb language plpgsql volatile security definer set search_path=''
as $$
declare
  actor uuid := auth.uid(); peer uuid; c duoeto_private.contacts; v duoeto_private.conversations;
  result jsonb; text_body text; vis text; stars integer; new_id uuid; cursor_id bigint;
begin
  if actor is null or not duoeto_private.active_account(actor) then raise exception 'Complete seu perfil e confirme seu e-mail para continuar.'; end if;
  if action='list' then
    return jsonb_build_object(
      'contacts',coalesce((select jsonb_agg(x order by x.created_at desc) from (
        select lc.id, lc.sender=actor as outgoing, p.display_name as name,
          case when lc.sender=actor then lc.recipient else lc.sender end as peer_id,
          case when lc.status='pending' and lc.created_at<=now()-interval '30 days' then 'expired' else lc.status end as status,
          lc.created_at, lc.decided_at,
          lc.sender=actor and lc.status='pending' and lc.created_at>now()-interval '1 hour' as editable
        from duoeto_private.contacts lc join public.duoeto_profiles p on p.user_id=case when lc.sender=actor then lc.recipient else lc.sender end
        where actor in(lc.sender,lc.recipient) and lc.status in ('pending','declined')
          and duoeto_private.can_connect(p.user_id) and position(lower(coalesce(payload->>'search','')) in lower(p.display_name))>0
        order by lc.created_at desc limit 100
      ) x),'[]'::jsonb),
      'conversations',coalesce((select jsonb_agg(x order by x.created_at desc) from (
        select lv.id,p.display_name as name,p.user_id as peer_id,lv.status,lv.created_at
        from duoeto_private.conversations lv join public.duoeto_profiles p on p.user_id=case when lv.a=actor then lv.b else lv.a end
        where actor in(lv.a,lv.b) and duoeto_private.can_connect(p.user_id) and position(lower(coalesce(payload->>'search','')) in lower(p.display_name))>0
        order by lv.created_at desc limit 100
      ) x),'[]'::jsonb));
  end if;

  if action in ('conversation','message','close') then
    select * into v from duoeto_private.conversations where id=target and actor in(a,b);
    if not found then raise exception 'Conversa indisponível.'; end if;
    peer := case when v.a=actor then v.b else v.a end;
  elsif action in ('contact','accept','decline','edit','withdraw') then
    select * into c from duoeto_private.contacts where id=target and actor in(sender,recipient);
    if not found then raise exception 'Contato indisponível.'; end if;
    peer := case when c.sender=actor then c.recipient else c.sender end;
  else peer := target;
  end if;
  if peer is null or not duoeto_private.can_connect(peer) then raise exception 'Este perfil está indisponível.'; end if;

  if action in ('rate','send','accept','decline','edit','withdraw','message','close') then
    if peer=actor then raise exception 'Escolha outra pessoa.'; end if;
    perform duoeto_private.lock_pair(actor,peer);
    -- Recheck using a fresh statement snapshot after waiting for the pair lock.
    if not duoeto_private.can_connect(peer) then raise exception 'Este perfil está indisponível.'; end if;
    if v.id is not null then select * into v from duoeto_private.conversations where id=v.id; end if;
    if c.id is not null then select * into c from duoeto_private.contacts where id=c.id; end if;
  end if;

  if action='profile' then
    select jsonb_build_object('user_id',p.user_id,'display_name',p.display_name,'age',extract(year from age(current_date,p.birth_date))::integer,
      'city',p.city,'state',p.state,'about',p.about,'interests',p.interests,'objectives',p.objectives)
      into result from public.duoeto_profiles p where p.user_id=peer;
    return result;
  elsif action='rate' then
    if not duoeto_private.can_connect(peer) then raise exception 'Este perfil está indisponível.'; end if;
    stars := (payload->>'score')::integer; vis := payload->>'visibility';
    if stars is null or stars not between 1 and 5 or vis is null or vis not in('profile','name','private') then raise exception 'Escolha uma nota e a privacidade.'; end if;
    insert into duoeto_private.ratings(author,target,score,visibility) values(actor,peer,stars,vis) on conflict do nothing;
    -- First impression is immutable, including after retries or concurrent submissions.
    action := 'reputation';
  end if;
  if action='reputation' then
    if peer<>actor and not exists(select 1 from duoeto_private.ratings r where r.author=actor and r.target=peer) then
      return jsonb_build_object('locked',true,'own_score',null,'reviews','[]'::jsonb);
    end if;
    return jsonb_build_object('locked',false,
      'own_score',(select score from duoeto_private.ratings where author=actor and ratings.target=peer),
      'average',(select round(avg(score),2) from duoeto_private.ratings where ratings.target=peer and valid),
      'count',(select count(*) from duoeto_private.ratings where ratings.target=peer and valid),
      'reviews',coalesce((select jsonb_agg(x) from (
        select r.score, r.visibility,p.display_name as name,
          case when r.visibility='profile' then r.author else null end as profile_id
        from duoeto_private.ratings r join public.duoeto_profiles p on p.user_id=r.author
        where r.target=peer and r.valid and r.visibility<>'private' and duoeto_private.can_connect(r.author)
        order by r.created_at desc limit 50
      ) x),'[]'::jsonb));
  elsif action='send' then
    if not duoeto_private.can_connect(peer) then raise exception 'Este perfil está indisponível.'; end if;
    if not exists(select 1 from duoeto_private.ratings where author=actor and ratings.target=peer and valid) then raise exception 'Avalie a primeira impressão antes de enviar contato.'; end if;
    text_body := btrim(payload->>'body');
    if text_body is null or char_length(text_body) not between 1 and 500 then raise exception 'Escreva de 1 a 500 caracteres.'; end if;
    update duoeto_private.contacts set status='expired',decided_at=now() where status='pending' and created_at<=now()-interval '30 days'
      and least(sender,recipient)=least(actor,peer) and greatest(sender,recipient)=greatest(actor,peer);
    if exists(select 1 from duoeto_private.contacts where status='pending' and least(sender,recipient)=least(actor,peer) and greatest(sender,recipient)=greatest(actor,peer)) then raise exception 'Já existe um primeiro contato pendente entre vocês.'; end if;
    if exists(select 1 from duoeto_private.conversations where a=least(actor,peer) and b=greatest(actor,peer) and status='active') then raise exception 'Vocês já têm uma conversa ativa.'; end if;
    if exists(select 1 from duoeto_private.contacts where sender=actor and recipient=peer and status='declined' and decided_at>now()-interval '30 days') then raise exception 'Aguarde 30 dias após a recusa para tentar novamente.'; end if;
    insert into duoeto_private.contacts(sender,recipient,body) values(actor,peer,text_body) returning id into new_id;
    return jsonb_build_object('id',new_id);
  elsif action='contact' then
    return jsonb_build_object('body',c.body);
  elsif action in ('accept','decline','edit','withdraw') then
    if c.status<>'pending' or c.created_at<=now()-interval '30 days' then raise exception 'Este contato já foi respondido ou expirou.'; end if;
    if action in ('accept','decline') then
      if c.recipient<>actor then raise exception 'Somente quem recebeu pode responder.'; end if;
      if action='accept' and not duoeto_private.both_rated(actor,peer) then raise exception 'As duas pessoas precisam avaliar a primeira impressão antes de conversar.'; end if;
      update duoeto_private.contacts set status=case when action='accept' then 'accepted' else 'declined' end,decided_at=now() where id=c.id;
      if action='accept' then
        insert into duoeto_private.conversations(a,b,contact_id) values(least(actor,peer),greatest(actor,peer),c.id) returning id into new_id;
        return jsonb_build_object('id',new_id);
      end if;
    else
      if c.sender<>actor or c.created_at<=now()-interval '1 hour' then raise exception 'A edição e a exclusão são permitidas por uma hora, antes da resposta.'; end if;
      if action='edit' then
        text_body:=btrim(payload->>'body');
        if text_body is null or char_length(text_body) not between 1 and 500 then raise exception 'Escreva de 1 a 500 caracteres.'; end if;
        update duoeto_private.contacts set body=text_body where id=c.id;
      else update duoeto_private.contacts set status='withdrawn',body='',decided_at=now() where id=c.id;
      end if;
    end if;
    return '{}'::jsonb;
  elsif action='conversation' then
    cursor_id:=coalesce((payload->>'before')::bigint,9223372036854775807);
    select * into c from duoeto_private.contacts where id=v.contact_id;
    return jsonb_build_object('status',v.status,'first_contact',c.body,'first_author',c.sender,'both_rated',duoeto_private.both_rated(actor,peer),'read_cursor',(select max(n.id)::text from duoeto_private.notifications n where n.recipient=actor and n.target=v.id and n.kind='message'
 and (n.message_id<=coalesce((select max(page.id) from (select m.id from duoeto_private.messages m where m.conversation_id=v.id and m.id<cursor_id and (payload->>'after' is null or m.id>(payload->>'after')::bigint) order by case when payload->>'after' is not null then m.id end asc,m.id desc limit 50) page),(payload->>'after')::bigint,0)
 or (n.message_id is null and n.created_at<=(select max(m.created_at) from duoeto_private.messages m where m.conversation_id=v.id and m.id<=coalesce((payload->>'after')::bigint,9223372036854775807))))),
      'messages',coalesce((select jsonb_agg(x order by x.id::bigint) from (
        select m.id::text,m.author,m.body,m.created_at from duoeto_private.messages m
        where m.conversation_id=v.id and m.id<cursor_id and (payload->>'after' is null or m.id>(payload->>'after')::bigint)
        order by case when payload->>'after' is not null then m.id end asc, m.id desc limit 50
      ) x),'[]'::jsonb));
  elsif action='message' then
    if not duoeto_private.both_rated(actor,peer) then raise exception 'As duas pessoas precisam avaliar a primeira impressão antes de conversar.'; end if;
    if v.status<>'active' then raise exception 'Esta conversa foi encerrada.'; end if;
    text_body:=btrim(payload->>'body');
    if text_body is null or char_length(text_body) not between 1 and 5000 or payload->>'request_id' is null then raise exception 'Escreva de 1 a 5.000 caracteres.'; end if;
    insert into duoeto_private.messages(conversation_id,author,body,request_id) values(v.id,actor,text_body,(payload->>'request_id')::uuid) on conflict(author,request_id) do nothing;
    return '{}'::jsonb;
  elsif action='close' then
    update duoeto_private.conversations set status='closed',ended_at=coalesce(ended_at,now()) where id=v.id;
    return '{}'::jsonb;
  end if;
  raise exception 'Ação inválida.';
end; $$;
commit;
