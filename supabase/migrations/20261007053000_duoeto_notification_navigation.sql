begin;
-- The history and each linked destination re-check identity and visibility.
create function public.duoeto_notification_page(before_id bigint default null) returns jsonb
language plpgsql security definer set search_path='' as $$
declare actor uuid:=auth.uid(); items jsonb; unread bigint;
begin
 if actor is null or not duoeto_private.active_account(actor) then raise exception 'Complete seu perfil para continuar.'; end if;
 select count(*) into unread from duoeto_private.notifications n where n.recipient=actor and n.read_at is null
  and (n.peer is null or duoeto_private.can_connect(n.peer));
 select coalesce(jsonb_agg(x order by x.sort_id desc),'[]') into items from (
  select n.id as sort_id,n.id::text,n.kind,n.target,n.created_at,n.read_at,
   (select c.id from duoeto_private.conversations c where c.contact_id=n.target and actor in(c.a,c.b)) as conversation_id
  from duoeto_private.notifications n where n.recipient=actor and (before_id is null or n.id<before_id)
   and (n.peer is null or duoeto_private.can_connect(n.peer)) order by n.id desc limit 31
 ) x;
 -- bigint cursor is exposed only as text to avoid JavaScript precision loss.
 return jsonb_build_object('items',(select coalesce(jsonb_agg(value-'sort_id' order by ord),'[]') from jsonb_array_elements(items) with ordinality as e(value,ord) where ord<=30),'has_more',jsonb_array_length(items)>30,'unread',unread);
end; $$;
revoke all on function public.duoeto_notification_page(bigint) from public,anon;
grant execute on function public.duoeto_notification_page(bigint) to authenticated;

create function public.duoeto_message_target(kind text,target uuid) returns jsonb
language plpgsql security definer set search_path='' as $$
#variable_conflict use_variable
declare actor uuid:=auth.uid(); result jsonb;
begin
 if actor is null or not duoeto_private.active_account(actor) then raise exception 'Complete seu perfil para continuar.'; end if;
 if kind='conversation' then
  select jsonb_build_object('id',v.id,'name',p.display_name,'peer_id',p.user_id,'status',v.status,'created_at',v.created_at) into result
  from duoeto_private.conversations v join public.duoeto_profiles p on p.user_id=case when v.a=actor then v.b else v.a end
  where v.id=target and actor in(v.a,v.b) and duoeto_private.can_connect(p.user_id);
 elsif kind='contact' then
  select jsonb_build_object('id',c.id,'outgoing',c.sender=actor,'name',p.display_name,'peer_id',p.user_id,
   'status',case when c.status='pending' and c.created_at<=now()-interval '30 days' then 'expired' else c.status end,
   'created_at',c.created_at,'decided_at',c.decided_at,'editable',c.sender=actor and c.status='pending' and c.created_at>now()-interval '1 hour',
   'unread',(select count(*) from duoeto_private.notifications n where n.recipient=actor and n.target=c.id and n.read_at is null),
   'read_cursor',(select max(n.id)::text from duoeto_private.notifications n where n.recipient=actor and n.target=c.id),
   'conversation_id',(select v.id from duoeto_private.conversations v where v.contact_id=c.id and actor in(v.a,v.b))) into result
  from duoeto_private.contacts c join public.duoeto_profiles p on p.user_id=case when c.sender=actor then c.recipient else c.sender end
  where c.id=target and actor in(c.sender,c.recipient) and c.status in('pending','declined','accepted','expired') and duoeto_private.can_connect(p.user_id);
 elsif kind='report' then
  select jsonb_build_object('id',r.id,'subject',r.subject,'reason',r.reason,'details',r.details,'status',r.status,'created_at',r.created_at,'updated_at',r.updated_at) into result
  from duoeto_private.reports r where r.id=target and r.reporter=actor;
 else raise exception 'Destino inválido.';
 end if;
 return result;
end; $$;
revoke all on function public.duoeto_message_target(text,uuid) from public,anon;
grant execute on function public.duoeto_message_target(text,uuid) to authenticated;
commit;
