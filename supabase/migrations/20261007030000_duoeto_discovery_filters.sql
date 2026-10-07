begin;
create function duoeto_private.discovery(seen uuid[],filters jsonb,selected uuid)
returns table(user_id uuid,display_name text,age integer,city text,state text,about text,interests text[],objectives text[])
language plpgsql volatile security definer set search_path=''
as $$ declare min_age integer:=coalesce((filters->>'min_age')::integer,18);
  max_age integer:=coalesce((filters->>'max_age')::integer,50);
  min_score numeric:=(filters->>'min_score')::numeric;
  interest text:=filters->>'interest'; objective text:=filters->>'objective';
  complete boolean:=coalesce((filters->>'complete')::boolean,false);
begin
  if auth.uid() is null or not duoeto_private.active_account(auth.uid()) then raise exception 'Complete seu perfil para acessar o Feed.'; end if;
  if coalesce(cardinality(seen),0)>5000 or min_age<18 or max_age>120 or min_age>max_age
    or min_score<1 or min_score>5
    or (interest is not null and interest not in ('Jogos','Filmes','Música','Academia','Corrida','Cozinhar','Viajar','Livros','Gatos','Cachorros','Arte'))
    or (objective is not null and objective not in ('Namoro','Amizade','Outras conexões','Ainda pensando')) then
    raise exception 'Confira os filtros do Feed.';
  end if;
  return query select p.user_id,p.display_name,extract(year from age(current_date,p.birth_date))::integer,
    p.city,p.state,p.about,p.interests,p.objectives from public.duoeto_profiles p
    where p.user_id<>all(coalesce(seen,'{}'::uuid[]))
      and (selected is null or p.user_id=selected)
      and extract(year from age(current_date,p.birth_date)) between min_age and max_age
      and duoeto_private.visible_profile(p.user_id)
      and (interest is null or interest=any(p.interests))
      and (objective is null or objective=any(p.objectives))
      and (not complete or ((btrim(p.about)<>'' or cardinality(p.interests)>0) and cardinality(p.objectives)>0))
      and (min_score is null or (duoeto_private.reputation_summary(p.user_id)->>'overall')::numeric>=min_score)
      and not exists(select 1 from duoeto_private.contacts c where c.status='pending' and c.created_at>now()-interval '30 days'
        and least(c.sender,c.recipient)=least(auth.uid(),p.user_id) and greatest(c.sender,c.recipient)=greatest(auth.uid(),p.user_id))
      and not exists(select 1 from duoeto_private.conversations v where v.status='active' and v.a=least(auth.uid(),p.user_id) and v.b=greatest(auth.uid(),p.user_id))
    order by random() limit 24;
end; $$;
revoke all on function duoeto_private.discovery(uuid[],jsonb,uuid) from public,anon;
grant execute on function duoeto_private.discovery(uuid[],jsonb,uuid) to authenticated;
create function public.duoeto_discovery(seen uuid[] default '{}',filters jsonb default '{}',selected uuid default null)
returns table(user_id uuid,display_name text,age integer,city text,state text,about text,interests text[],objectives text[])
language sql volatile security invoker set search_path=''
as $$ select * from duoeto_private.discovery(seen,filters,selected); $$;
revoke all on function public.duoeto_discovery(uuid[],jsonb,uuid) from public,anon;
grant execute on function public.duoeto_discovery(uuid[],jsonb,uuid) to authenticated;
-- Preserve the existing API and its anonymous empty-result behavior.
create or replace function duoeto_private.feed(seen uuid[])
returns table(user_id uuid,display_name text,age integer,city text,state text,about text,interests text[],objectives text[])
language plpgsql volatile security definer set search_path=''
as $$ begin
  if auth.uid() is null or not duoeto_private.active_account(auth.uid()) or coalesce(cardinality(seen),0)>5000 then return; end if;
  return query select * from duoeto_private.discovery(seen,'{}',null);
end; $$;
commit;
