begin;
-- Search only peers in the caller's existing contacts/conversations; no username directory.
create or replace function public.duoeto_inbox(action text,payload jsonb default '{}') returns jsonb language plpgsql volatile security definer set search_path='' as $$
#variable_conflict use_variable
declare actor uuid:=auth.uid(); peer uuid; target uuid:=(payload->>'target')::uuid; kind text:=payload->>'kind'; search text:=left(btrim(coalesce(payload->>'search','')),80);
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
    and (position(lower(search) in lower(p.display_name))>0 or exists(select 1 from duoeto_private.usernames u where u.user_id=p.user_id and nullif(ltrim(lower(search),'@'),'') is not null and position(ltrim(lower(search),'@') in u.username)>0)) and (cursor_time is null or (c.created_at,c.id)<(cursor_time,cursor_id))
    and (not unread_only or exists(select 1 from duoeto_private.notifications n where recipient=actor and n.target=c.id and read_at is null and n.kind in('contact_received','contact_accepted','contact_declined')))
   order by c.created_at desc,c.id desc limit 31
  ) x;
 else
  select coalesce(jsonb_agg(x order by x.created_at desc,x.id desc),'[]') into rows from (
   select v.id,p.display_name as name,p.user_id as peer_id,v.status,v.created_at,
    (select count(*) from duoeto_private.notifications n where recipient=actor and n.target=v.id and read_at is null and n.kind='message') as unread
   from duoeto_private.conversations v join public.duoeto_profiles p on p.user_id=case when v.a=actor then v.b else v.a end
   where actor in(v.a,v.b) and duoeto_private.can_connect(p.user_id) and (position(lower(search) in lower(p.display_name))>0 or exists(select 1 from duoeto_private.usernames u where u.user_id=p.user_id and nullif(ltrim(lower(search),'@'),'') is not null and position(ltrim(lower(search),'@') in u.username)>0))
    and (cursor_time is null or (v.created_at,v.id)<(cursor_time,cursor_id))
    and (not unread_only or exists(select 1 from duoeto_private.notifications n where recipient=actor and n.target=v.id and read_at is null and n.kind='message'))
   order by v.created_at desc,v.id desc limit 31
  ) x;
 end if;
 return jsonb_build_object('items',case when jsonb_array_length(rows)>30 then rows-30 else rows end,'has_more',jsonb_array_length(rows)>30,'counts',counts);
end; $$;
revoke all on function public.duoeto_inbox(text,jsonb) from public,anon;
grant execute on function public.duoeto_inbox(text,jsonb) to authenticated;
commit;
