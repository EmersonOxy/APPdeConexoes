begin;

create table duoeto_private.ratings (
  author uuid not null references auth.users(id) on delete cascade,
  target uuid not null references auth.users(id) on delete cascade,
  score smallint not null check (score between 1 and 5),
  visibility text not null check (visibility in ('profile','name','private')),
  valid boolean not null default true,
  created_at timestamptz not null default now(),
  primary key(author,target), check(author<>target)
);
create index ratings_target_idx on duoeto_private.ratings(target) where valid;
create table duoeto_private.connection_pairs (
  a uuid references auth.users(id) on delete cascade,
  b uuid references auth.users(id) on delete cascade,
  primary key(a,b), check(a<b)
);
create table duoeto_private.contacts (
  id uuid primary key default gen_random_uuid(),
  sender uuid not null references auth.users(id) on delete cascade,
  recipient uuid not null references auth.users(id) on delete cascade,
  body text not null,
  status text not null default 'pending' check(status in ('pending','accepted','declined','expired','withdrawn','blocked')),
  created_at timestamptz not null default now(),
  decided_at timestamptz,
  check(sender<>recipient),
  check(status='withdrawn' or char_length(trim(body)) between 1 and 500)
);
create unique index contacts_pending_pair on duoeto_private.contacts(least(sender,recipient),greatest(sender,recipient)) where status='pending';
create index contacts_sender_idx on duoeto_private.contacts(sender,created_at desc);
create index contacts_recipient_idx on duoeto_private.contacts(recipient,created_at desc);
create table duoeto_private.conversations (
  id uuid primary key default gen_random_uuid(),
  a uuid not null references auth.users(id) on delete cascade,
  b uuid not null references auth.users(id) on delete cascade,
  contact_id uuid not null unique references duoeto_private.contacts(id),
  status text not null default 'active' check(status in ('active','closed')),
  created_at timestamptz not null default now(),
  ended_at timestamptz,
  check(a<b)
);
create unique index conversations_active_pair on duoeto_private.conversations(a,b) where status='active';
create index conversations_b_idx on duoeto_private.conversations(b);
create table duoeto_private.messages (
  id bigint generated always as identity primary key,
  conversation_id uuid not null references duoeto_private.conversations(id) on delete cascade,
  author uuid not null references auth.users(id) on delete cascade,
  body text not null check(char_length(trim(body)) between 1 and 5000),
  request_id uuid not null,
  created_at timestamptz not null default now(),
  unique(author,request_id)
);
create index messages_conversation_idx on duoeto_private.messages(conversation_id,id desc);

alter table duoeto_private.ratings enable row level security;
alter table duoeto_private.connection_pairs enable row level security;
alter table duoeto_private.contacts enable row level security;
alter table duoeto_private.conversations enable row level security;
alter table duoeto_private.messages enable row level security;
revoke all on duoeto_private.ratings,duoeto_private.connection_pairs,duoeto_private.contacts,duoeto_private.conversations,duoeto_private.messages from public,anon,authenticated;

create function duoeto_private.active_account(account_id uuid)
returns boolean language sql stable security definer set search_path=''
as $$ select exists (
  select 1 from auth.users u join public.duoeto_profiles p on p.user_id=u.id
  where u.id=account_id and u.email_confirmed_at is not null and u.deleted_at is null
    and (u.banned_until is null or u.banned_until<=now())
    and p.birth_date <= (current_date-interval '18 years')::date
    and exists(select 1 from storage.objects o where o.bucket_id='duoeto-profile-photos' and o.name=p.photo_path)
); $$;

create function duoeto_private.can_connect(target uuid)
returns boolean language sql stable security definer set search_path=''
as $$ select auth.uid() is not null and duoeto_private.active_account(auth.uid())
  and duoeto_private.active_account(target)
  and not exists(select 1 from public.duoeto_blocks b
    where (b.owner_id=auth.uid() and b.target_id=target) or (b.owner_id=target and b.target_id=auth.uid())); $$;

create function duoeto_private.lock_pair(first_id uuid, second_id uuid)
returns void language plpgsql security definer set search_path=''
as $$ begin
  insert into duoeto_private.connection_pairs values(least(first_id,second_id),greatest(first_id,second_id)) on conflict do nothing;
  perform 1 from duoeto_private.connection_pairs where a=least(first_id,second_id) and b=greatest(first_id,second_id) for update;
end; $$;

create function duoeto_private.block_connections()
returns trigger language plpgsql security definer set search_path=''
as $$ begin
  if auth.uid() is null or new.owner_id<>auth.uid() or not public.duoeto_confirmed_user() then raise exception 'Ação não permitida'; end if;
  perform duoeto_private.lock_pair(new.owner_id,new.target_id);
  update duoeto_private.conversations set status='closed',ended_at=now()
    where a=least(new.owner_id,new.target_id) and b=greatest(new.owner_id,new.target_id) and status='active';
  update duoeto_private.contacts set status='blocked',decided_at=now()
    where least(sender,recipient)=least(new.owner_id,new.target_id) and greatest(sender,recipient)=greatest(new.owner_id,new.target_id) and status='pending';
  return new;
end; $$;
create trigger duoeto_block_connections before insert on public.duoeto_blocks
for each row execute function duoeto_private.block_connections();

-- One server-side boundary for commands and projections. All writes are serialized
-- by unordered pair, including blocks, so accept/send/block cannot race.
create function duoeto_private.connections(action text, target uuid, payload jsonb)
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
        from duoeto_private.contacts lc join publilc.duoeto_profiles p on p.user_id=case when lc.sender=actor then lc.recipient else lc.sender end
        where actor in(lc.sender,lc.recipient) and lc.status in ('pending','declined')
          and duoeto_private.can_connect(p.user_id)
        order by lc.created_at desc limit 100
      ) x),'[]'::jsonb),
      'conversations',coalesce((select jsonb_agg(x order by x.created_at desc) from (
        select lv.id,p.display_name as name,p.user_id as peer_id,lv.status,lv.created_at
        from duoeto_private.conversations lv join publilc.duoeto_profiles p on p.user_id=case when lv.a=actor then lv.b else lv.a end
        where actor in(lv.a,lv.b) and duoeto_private.can_connect(p.user_id)
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
    if not duoeto_private.visible_profile(peer) then raise exception 'Este perfil está indisponível.'; end if;
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
    if not duoeto_private.visible_profile(peer) then raise exception 'Este perfil está indisponível.'; end if;
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
    return jsonb_build_object('status',v.status,'first_contact',c.body,'first_author',c.sender,
      'messages',coalesce((select jsonb_agg(x order by x.id::bigint) from (
        select m.id::text,m.author,m.body,m.created_at from duoeto_private.messages m
        where m.conversation_id=v.id and m.id<cursor_id order by m.id desc limit 50
      ) x),'[]'::jsonb));
  elsif action='message' then
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

revoke all on function duoeto_private.active_account(uuid),duoeto_private.can_connect(uuid),duoeto_private.lock_pair(uuid,uuid),duoeto_private.block_connections(),duoeto_private.connections(text,uuid,jsonb) from public,anon,authenticated;
grant execute on function duoeto_private.connections(text,uuid,jsonb) to authenticated;

create function public.duoeto_connections(action text,target uuid default null,payload jsonb default '{}')
returns jsonb language sql volatile security invoker set search_path=''
as $$ select duoeto_private.connections(action,target,payload); $$;
revoke all on function public.duoeto_connections(text,uuid,jsonb) from public,anon;
grant execute on function public.duoeto_connections(text,uuid,jsonb) to authenticated;

-- Keep the original feed projection and privacy checks; exclude pending contacts
-- and active conversations without allowing them to disable profile/photo reads.
create or replace function duoeto_private.feed(seen uuid[])
returns table(user_id uuid,display_name text,age integer,city text,state text,about text,interests text[],objectives text[])
language sql volatile security definer set search_path=''
as $$
  select p.user_id,p.display_name,extract(year from age(current_date,p.birth_date))::integer,p.city,p.state,p.about,p.interests,p.objectives
  from public.duoeto_profiles p
  where auth.uid() is not null and coalesce(cardinality(seen),0)<=5000
    and p.user_id<>all(coalesce(seen,'{}'::uuid[]))
    and extract(year from age(current_date,p.birth_date)) between 18 and 50
    and duoeto_private.visible_profile(p.user_id)
    and not exists(select 1 from duoeto_private.contacts c where c.status='pending' and c.created_at>now()-interval '30 days'
      and least(c.sender,c.recipient)=least(auth.uid(),p.user_id) and greatest(c.sender,c.recipient)=greatest(auth.uid(),p.user_id))
    and not exists(select 1 from duoeto_private.conversations v where v.status='active' and v.a=least(auth.uid(),p.user_id) and v.b=greatest(auth.uid(),p.user_id))
  order by random() limit 24;
$$;

-- Accepted/pending contacts may still view current photos even when hidden from
-- discovery. Blocking and suspended/deleted accounts always take precedence.
create or replace function duoeto_private.feed_photo(target uuid)
returns text language sql stable security definer set search_path=''
as $$ select p.photo_path from public.duoeto_profiles p
  where p.user_id=target and duoeto_private.can_connect(target)
    and (duoeto_private.visible_profile(target)
      or exists(select 1 from duoeto_private.conversations v where auth.uid() in(v.a,v.b) and target in(v.a,v.b)));
$$;

commit;
