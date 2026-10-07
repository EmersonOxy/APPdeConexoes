begin;
-- Existing preferences had no creation date: preserve them for seven days from this upgrade.
alter table public.duoeto_feed_hidden add column expires_at timestamptz not null default (now()+interval '7 days');
revoke insert on public.duoeto_feed_hidden from authenticated;
create function public.duoeto_hide_profile(target uuid)
returns void language plpgsql volatile security definer set search_path=''
as $$ begin
  if target=auth.uid() or not duoeto_private.can_connect(target) then raise exception 'Perfil indisponível.'; end if;
  insert into public.duoeto_feed_hidden(owner_id,target_id,expires_at)
    values(auth.uid(),target,now()+interval '7 days')
    on conflict(owner_id,target_id) do update set expires_at=excluded.expires_at;
end; $$;
revoke all on function public.duoeto_hide_profile(uuid) from public,anon;
grant execute on function public.duoeto_hide_profile(uuid) to authenticated;
-- Visibility for discovery only. Contact, rating and photos use can_connect.
create or replace function duoeto_private.visible_profile(target uuid)
returns boolean language sql stable security definer set search_path=''
as $$ select target<>auth.uid() and duoeto_private.can_connect(target)
  and not exists(select 1 from public.duoeto_feed_hidden h where h.owner_id=auth.uid() and h.target_id=target and h.expires_at>now()); $$;

alter table public.duoeto_profiles add column gallery_paths text[] not null default '{}' check(cardinality(gallery_paths)<=5);
create function public.duoeto_validate_gallery()
returns trigger language plpgsql security invoker set search_path=''
as $$ declare path text; paths text[]:=array[new.photo_path]||new.gallery_paths;
begin
  if cardinality(paths)<>(select count(distinct p) from unnest(paths) p) then raise exception 'As fotos devem ser diferentes.'; end if;
  foreach path in array paths loop
    if path is null or split_part(path,'/',1)<>new.user_id::text or not exists(
      select 1 from storage.objects where bucket_id='duoeto-profile-photos' and name=path
    ) then raise exception 'Foto inválida.'; end if;
  end loop;
  return new;
end; $$;
revoke all on function public.duoeto_validate_gallery() from public;
create trigger duoeto_gallery_validate before insert or update on public.duoeto_profiles for each row execute function public.duoeto_validate_gallery();
create function duoeto_private.profile_photos(target uuid)
returns text[] language sql stable security definer set search_path=''
as $$ select array[p.photo_path]||p.gallery_paths from public.duoeto_profiles p where p.user_id=target and duoeto_private.can_connect(target); $$;
revoke all on function duoeto_private.profile_photos(uuid) from public,anon;
grant execute on function duoeto_private.profile_photos(uuid) to authenticated;
create function public.duoeto_profile_photos(target uuid)
returns text[] language sql stable security invoker set search_path=''
as $$ select duoeto_private.profile_photos(target); $$;
revoke all on function public.duoeto_profile_photos(uuid) from public,anon;
grant execute on function public.duoeto_profile_photos(uuid) to authenticated;
create or replace function duoeto_private.feed_photo(target uuid)
returns text language sql stable security definer set search_path=''
as $$ select (duoeto_private.profile_photos(target))[1]; $$;
drop policy duoeto_feed_photo_read on storage.objects;
create policy duoeto_feed_photo_read on storage.objects for select to authenticated
using(bucket_id='duoeto-profile-photos' and name=any(duoeto_private.profile_photos(
 case when split_part(name,'/',1) ~ '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$' then split_part(name,'/',1)::uuid else null end)));

create function duoeto_private.both_rated(a uuid,b uuid)
returns boolean language sql stable security definer set search_path=''
as $$ select exists(select 1 from duoeto_private.ratings where author=a and target=b and valid)
  and exists(select 1 from duoeto_private.ratings where author=b and target=a and valid); $$;
revoke all on function duoeto_private.both_rated(uuid,uuid) from public,anon,authenticated;
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
    return jsonb_build_object('status',v.status,'first_contact',c.body,'first_author',c.sender,'both_rated',duoeto_private.both_rated(actor,peer),
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
create or replace function duoeto_private.connections(action text,target uuid,payload jsonb)
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
    can_rate:=duoeto_private.both_rated(actor,peer) and own_count>=5 and peer_count>=5 and (latest.id is null or next_at<=now());
    if action='rate_interaction' then
      if not duoeto_private.both_rated(actor,peer) then raise exception 'As duas pessoas precisam avaliar a primeira impressão antes da interação.'; end if;
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
commit;
