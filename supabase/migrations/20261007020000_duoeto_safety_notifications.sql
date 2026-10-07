begin;
create table duoeto_private.reports (
  id uuid primary key default gen_random_uuid(),
  reporter uuid not null references auth.users(id) on delete cascade,
  subject text not null check(subject in ('profile','contact','conversation','first_impression','interaction')),
  target uuid not null,
  accused uuid not null references auth.users(id) on delete cascade,
  reason text not null check(reason in ('spam','harassment','fraud','offensive','fake_profile','other')),
  details text not null default '' check(char_length(details)<=1000),
  request_id uuid not null,
  status text not null default 'received' check(status in ('received','reviewing','resolved','dismissed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(reporter,request_id),check(reporter<>accused)
);
create index reports_reporter on duoeto_private.reports(reporter,created_at desc);
create table duoeto_private.notifications (
  id bigint generated always as identity primary key,
  recipient uuid not null references auth.users(id) on delete cascade,
  peer uuid references auth.users(id) on delete cascade,
  kind text not null check(kind in ('contact_received','contact_accepted','contact_declined','message','conversation_closed','report_updated')),
  target uuid not null,
  created_at timestamptz not null default now(),
  read_at timestamptz
);
create index notifications_recipient on duoeto_private.notifications(recipient,id desc);
alter table duoeto_private.reports enable row level security;
alter table duoeto_private.notifications enable row level security;
revoke all on duoeto_private.reports,duoeto_private.notifications from public,anon,authenticated;

create function duoeto_private.connection_event()
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
    insert into duoeto_private.notifications(recipient,peer,kind,target)
      values(peer,new.author,'message',v.id);
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
revoke all on function duoeto_private.connection_event() from public,anon,authenticated;
create trigger contact_event after insert or update on duoeto_private.contacts for each row execute function duoeto_private.connection_event();
create trigger message_event after insert on duoeto_private.messages for each row execute function duoeto_private.connection_event();
create trigger conversation_event after update on duoeto_private.conversations for each row execute function duoeto_private.connection_event();
create trigger report_event before update on duoeto_private.reports for each row execute function duoeto_private.connection_event();

create function duoeto_private.safety(action text,target uuid,payload jsonb)
returns jsonb language plpgsql volatile security definer set search_path=''
as $$
#variable_conflict use_variable
declare actor uuid:=auth.uid(); peer uuid; subject text; reason text; details text; report_id uuid;
  c duoeto_private.contacts; v duoeto_private.conversations; review_author uuid; review_target uuid; vis text;
  notification_id bigint;
begin
  if actor is null or not duoeto_private.active_account(actor) then raise exception 'Complete seu perfil e confirme seu e-mail para continuar.'; end if;
  if action='reports' then
    return coalesce((select jsonb_agg(x) from (
      select id,subject,reason,details,status,created_at,updated_at from duoeto_private.reports
      where reporter=actor order by created_at desc limit 100
    ) x),'[]'::jsonb);
  elsif action='notifications' then
    return coalesce((select jsonb_agg(x) from (
      select n.id::text,n.kind,n.target,n.created_at,n.read_at from duoeto_private.notifications n
      where recipient=actor and (n.peer is null or duoeto_private.can_connect(n.peer))
      order by n.id desc limit 100
    ) x),'[]'::jsonb);
  elsif action='read_notification' then
    notification_id:=(payload->>'id')::bigint;
    update duoeto_private.notifications set read_at=coalesce(read_at,now())
      where id=notification_id and recipient=actor;
    return '{}'::jsonb;
  elsif action<>'report' then raise exception 'Ação inválida.'; end if;

  subject:=payload->>'subject'; reason:=payload->>'reason'; details:=coalesce(btrim(payload->>'details'),'');
  if reason is null or reason not in ('spam','harassment','fraud','offensive','fake_profile','other') or char_length(details)>1000 or payload->>'request_id' is null then
    raise exception 'Selecione o motivo e escreva até 1.000 caracteres.';
  end if;
  if subject='profile' then
    peer:=target;
    if not duoeto_private.can_connect(peer) and not exists(select 1 from public.duoeto_blocks where owner_id=actor and target_id=peer) then
      raise exception 'Este perfil está indisponível.';
    end if;
  elsif subject='contact' then
    select * into c from duoeto_private.contacts where id=target and actor in(sender,recipient);
    if not found then raise exception 'Contato indisponível.'; end if;
    peer:=case when c.sender=actor then c.recipient else c.sender end;
  elsif subject='conversation' then
    select * into v from duoeto_private.conversations where id=target and actor in(a,b);
    if not found then raise exception 'Conversa indisponível.'; end if;
    peer:=case when v.a=actor then v.b else v.a end;
  elsif subject in ('first_impression','interaction') then
    if subject='first_impression' then
      select author,r.target,visibility into review_author,review_target,vis from duoeto_private.ratings r where id=target and valid;
    else
      select author,r.target,visibility into review_author,review_target,vis from duoeto_private.current_interactions r where id=target and valid;
    end if;
    -- Only the evaluated person or viewers who unlocked public reputation may
    -- report a visible review. Private authors are never disclosed by this API.
    if review_author is null or vis='private' or not duoeto_private.can_connect(review_author)
      or not duoeto_private.can_connect(review_target)
      or (review_target<>actor and not exists(select 1 from duoeto_private.ratings r where r.author=actor and r.target=review_target)) then
      raise exception 'Avaliação indisponível.';
    end if;
    peer:=review_author;
  else raise exception 'Escolha o conteúdo da denúncia.';
  end if;
  if peer=actor then raise exception 'Escolha outra pessoa.'; end if;
  insert into duoeto_private.reports(reporter,subject,target,accused,reason,details,request_id)
    values(actor,subject,target,peer,reason,details,(payload->>'request_id')::uuid)
    on conflict(reporter,request_id) do nothing returning id into report_id;
  if report_id is null then select id into report_id from duoeto_private.reports where reporter=actor and request_id=(payload->>'request_id')::uuid; end if;
  return jsonb_build_object('id',report_id);
end; $$;
revoke all on function duoeto_private.safety(text,uuid,jsonb) from public,anon;
grant execute on function duoeto_private.safety(text,uuid,jsonb) to authenticated;
create function public.duoeto_safety(action text,target uuid default null,payload jsonb default '{}')
returns jsonb language sql volatile security invoker set search_path=''
as $$ select duoeto_private.safety(action,target,payload); $$;
revoke all on function public.duoeto_safety(text,uuid,jsonb) from public,anon;
grant execute on function public.duoeto_safety(text,uuid,jsonb) to authenticated;
commit;
