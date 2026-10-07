begin;

-- Repair already-installed versions without discarding their records.
do $$ begin
  execute replace(pg_get_functiondef('duoeto_private.connections(text,uuid,jsonb)'::regprocedure),
    'publilc.duoeto_profiles', 'public.duoeto_profiles');
end $$;

alter table duoeto_private.ratings add column id uuid not null default gen_random_uuid() unique;
create table duoeto_private.interaction_ratings (
  id uuid primary key default gen_random_uuid(),
  author uuid not null references auth.users(id) on delete cascade,
  target uuid not null references auth.users(id) on delete cascade,
  conversation_id uuid not null references duoeto_private.conversations(id),
  photos smallint not null check(photos between 1 and 5),
  conversation smallint not null check(conversation between 1 and 5),
  respect smallint not null check(respect between 1 and 5),
  humor smallint not null check(humor between 1 and 5),
  visibility text not null check(visibility in ('private','name','profile')),
  valid boolean not null default true,
  created_at timestamptz not null default now(),
  check(author<>target)
);
create index interaction_ratings_pair on duoeto_private.interaction_ratings(author,target,created_at desc);
alter table duoeto_private.interaction_ratings enable row level security;
revoke all on duoeto_private.interaction_ratings from public,anon,authenticated;

-- Latest submission per evaluator contributes; previous versions stay private
-- for moderation. Invalidating the latest does not revive an older assessment.
create view duoeto_private.current_interactions as
select distinct on (author,target) * from duoeto_private.interaction_ratings
order by author,target,created_at desc,id desc;
revoke all on duoeto_private.current_interactions from public,anon,authenticated;

create function duoeto_private.reputation_summary(peer uuid)
returns jsonb language plpgsql stable security definer set search_path=''
as $$ declare first_avg numeric; first_count bigint; photo_avg numeric;
  chat_avg numeric; respect_avg numeric; humor_avg numeric; interaction_count bigint;
  perception numeric; experience numeric;
begin
  select round(avg(score),2),count(*) into first_avg,first_count
    from duoeto_private.ratings where target=peer and valid;
  select round(avg(photos),2),round(avg(conversation),2),round(avg(respect),2),round(avg(humor),2),count(*)
    into photo_avg,chat_avg,respect_avg,humor_avg,interaction_count
    from duoeto_private.current_interactions where target=peer and valid;
  perception:=round((first_avg+photo_avg)/2,2);
  experience:=round((chat_avg+respect_avg+humor_avg)/3,2);
  return jsonb_build_object('average',first_avg,'count',first_count,
    'interaction_count',interaction_count,'photos',photo_avg,'conversation',chat_avg,
    'respect',respect_avg,'humor',humor_avg,'perception',perception,'experience',experience,
    'overall',round((perception+experience)/2,2));
end; $$;
revoke all on function duoeto_private.reputation_summary(uuid) from public,anon,authenticated;

alter function duoeto_private.connections(text,uuid,jsonb) rename to connections_core;
revoke all on function duoeto_private.connections_core(text,uuid,jsonb) from public,anon,authenticated;

create function duoeto_private.connections(action text,target uuid,payload jsonb)
returns jsonb language plpgsql volatile security definer set search_path=''
as $$
#variable_conflict use_variable
declare actor uuid:=auth.uid(); peer uuid; v duoeto_private.conversations;
  latest duoeto_private.interaction_ratings; result jsonb; vis text; own_count bigint; peer_count bigint;
  can_rate boolean; next_at timestamptz;
begin
  if actor is null or not duoeto_private.active_account(actor) then
    raise exception 'Complete seu perfil e confirme seu e-mail para continuar.';
  end if;
  if action in ('interaction','rate_interaction') then
    select * into v from duoeto_private.conversations where id=target and actor in(a,b);
    if not found then raise exception 'Conversa indisponível.'; end if;
    peer:=case when v.a=actor then v.b else v.a end;
    if not duoeto_private.can_connect(peer) then raise exception 'Este perfil está indisponível.'; end if;
    perform duoeto_private.lock_pair(actor,peer);
    if not duoeto_private.can_connect(peer) then raise exception 'Este perfil está indisponível.'; end if;
    select count(*) filter(where author=actor),count(*) filter(where author=peer)
      into own_count,peer_count from duoeto_private.messages where conversation_id=v.id;
    select * into latest from duoeto_private.interaction_ratings
      where author=actor and interaction_ratings.target=peer order by created_at desc,id desc limit 1;
    next_at:=latest.created_at+interval '7 days';
    can_rate:=own_count>=5 and peer_count>=5 and (latest.id is null or next_at<=now());
    if action='rate_interaction' then
      if own_count<5 or peer_count<5 then raise exception 'São necessárias cinco mensagens de cada pessoa nesta conversa.'; end if;
      if not can_rate then raise exception 'Aguarde sete dias após sua última avaliação de interação.'; end if;
      vis:=payload->>'visibility';
      if vis is null or vis not in ('private','name','profile') then raise exception 'Escolha a privacidade da avaliação.'; end if;
      if latest.id is not null and latest.visibility<>vis then raise exception 'A privacidade da avaliação não pode ser alterada.'; end if;
      if not (payload ?& array['photos','conversation','respect','humor']) or
        exists(select 1 from unnest(array['photos','conversation','respect','humor']) as k
          where coalesce(payload->>k,'') !~ '^[1-5]$') then
        raise exception 'Informe quatro notas inteiras de 1 a 5.';
      end if;
      insert into duoeto_private.interaction_ratings(author,target,conversation_id,photos,conversation,respect,humor,visibility)
        values(actor,peer,v.id,(payload->>'photos')::smallint,(payload->>'conversation')::smallint,
          (payload->>'respect')::smallint,(payload->>'humor')::smallint,vis) returning * into latest;
      can_rate:=false; next_at:=latest.created_at+interval '7 days';
    end if;
    return jsonb_build_object('eligible',can_rate,'own_messages',own_count,'peer_messages',peer_count,'next_at',next_at,
      'previous',case when latest.id is null then null else jsonb_build_object('photos',latest.photos,
        'conversation',latest.conversation,'respect',latest.respect,'humor',latest.humor,'visibility',latest.visibility) end);
  end if;
  result:=duoeto_private.connections_core(action,target,payload);
  if action in ('reputation','rate') and not (result->>'locked')::boolean then
    result:=result||duoeto_private.reputation_summary(target)||jsonb_build_object('reviews',coalesce((
      select jsonb_agg(x order by x.created_at desc) from (
        select r.id,'first_impression' as kind,r.score::numeric,null::smallint as photos,null::smallint as conversation,null::smallint as respect,null::smallint as humor,r.visibility,p.display_name as name,
          case when r.visibility='profile' then r.author else null end as profile_id,r.created_at
        from duoeto_private.ratings r join public.duoeto_profiles p on p.user_id=r.author
        where r.target=target and r.valid and r.visibility<>'private' and duoeto_private.can_connect(r.author)
        union all
        select r.id,'interaction',null::numeric,r.photos,r.conversation,r.respect,r.humor,
          r.visibility,p.display_name,case when r.visibility='profile' then r.author else null end,r.created_at
        from duoeto_private.current_interactions r join public.duoeto_profiles p on p.user_id=r.author
        where r.target=target and r.valid and r.visibility<>'private' and duoeto_private.can_connect(r.author)
        order by created_at desc limit 50
      ) x),'[]'::jsonb));
  end if;
  return result;
end; $$;
revoke all on function duoeto_private.connections(text,uuid,jsonb) from public,anon;
grant execute on function duoeto_private.connections(text,uuid,jsonb) to authenticated;
-- Rebind the public wrapper after the rename, including sessions that called
-- the old implementation before this migration.
create or replace function public.duoeto_connections(action text,target uuid default null,payload jsonb default '{}')
returns jsonb language sql volatile security invoker set search_path=''
as $$ select duoeto_private.connections(action,target,payload); $$;
commit;
