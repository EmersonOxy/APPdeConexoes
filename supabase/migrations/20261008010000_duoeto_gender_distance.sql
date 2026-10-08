begin;
alter table public.duoeto_profiles add column gender text check(gender in ('woman','man','non_binary','other'));
create table duoeto_private.locations (
 user_id uuid primary key references auth.users(id) on delete cascade,
 latitude numeric(5,2) not null check(latitude between -90 and 90 and mod(latitude*20,1)=0),
 longitude numeric(6,2) not null check(longitude between -180 and 180 and mod(longitude*20,1)=0),
 updated_at timestamptz not null default now()
);
alter table duoeto_private.locations enable row level security;
revoke all on duoeto_private.locations from public,anon,authenticated;
create function public.duoeto_location(action text,latitude numeric default null,longitude numeric default null,consent boolean default false)
returns jsonb language plpgsql security definer set search_path='' as $$
#variable_conflict use_variable
declare actor uuid:=auth.uid(); updated timestamptz;
begin
 if actor is null or not duoeto_private.active_account(actor) then raise exception 'Complete seu perfil para usar a localização aproximada.'; end if;
 if action='save' then
  if consent is distinct from true or latitude is null or longitude is null or latitude not between -90 and 90 or longitude not between -180 and 180 then raise exception 'Autorize o uso de uma localização válida.'; end if;
  insert into duoeto_private.locations(user_id,latitude,longitude) values(actor,round(latitude*20)/20,round(longitude*20)/20)
   on conflict(user_id) do update set latitude=excluded.latitude,longitude=excluded.longitude,updated_at=now();
 elsif action='remove' then delete from duoeto_private.locations where user_id=actor;
 elsif action<>'status' or action is null then raise exception 'Ação inválida.';
 end if;
 select l.updated_at into updated from duoeto_private.locations l where l.user_id=actor;
 return jsonb_build_object('enabled',updated is not null,'updated_at',updated);
end; $$;
revoke all on function public.duoeto_location(text,numeric,numeric,boolean) from public,anon;
grant execute on function public.duoeto_location(text,numeric,numeric,boolean) to authenticated;
create function duoeto_private.distance_km(a numeric,b numeric,c numeric,d numeric)
returns double precision language sql immutable strict set search_path='' as $$
 select 6371.0088*acos(least(1::double precision,greatest(-1::double precision,
  sin(radians(a::double precision))*sin(radians(c::double precision))+
  cos(radians(a::double precision))*cos(radians(c::double precision))*cos(radians((b-d)::double precision)))));
$$;
revoke all on function duoeto_private.distance_km(numeric,numeric,numeric,numeric) from public,anon,authenticated;
create or replace function duoeto_private.discovery(seen uuid[],filters jsonb,selected uuid)
returns table(user_id uuid,display_name text,age integer,city text,state text,about text,interests text[],objectives text[])
language plpgsql volatile security definer set search_path=''
as $$
#variable_conflict use_variable
declare min_age integer:=coalesce((filters->>'min_age')::integer,18);
  max_age integer:=coalesce((filters->>'max_age')::integer,50);
  min_score numeric:=(filters->>'min_score')::numeric;
  interest text:=filters->>'interest'; objective text:=filters->>'objective';
  gender text:=nullif(filters->>'gender',''); radius integer:=(filters->>'max_distance')::integer; origin_lat numeric; origin_lon numeric;
  complete boolean:=coalesce((filters->>'complete')::boolean,false);
begin
  if auth.uid() is null or not duoeto_private.active_account(auth.uid()) then raise exception 'Complete seu perfil para acessar o Feed.'; end if;
  if coalesce(cardinality(seen),0)>5000 or min_age<18 or max_age>120 or min_age>max_age
    or min_score<1 or min_score>5
    or (gender is not null and gender not in ('woman','man','non_binary','other','undisclosed'))
    or (radius is not null and radius not in (10,30,50,100,200))
    or (interest is not null and interest not in ('Jogos','Filmes','Música','Academia','Corrida','Cozinhar','Viajar','Livros','Gatos','Cachorros','Arte'))
    or (objective is not null and objective not in ('Namoro','Amizade','Outras conexões','Ainda pensando')) then
    raise exception 'Confira os filtros do Feed.';
  end if;
  if radius is not null then
    select l.latitude,l.longitude into origin_lat,origin_lon from duoeto_private.locations l where l.user_id=auth.uid();
    if not found then raise exception 'Ative sua localização aproximada nos filtros ou escolha sem limite de distância.'; end if;
  end if;
  return query select p.user_id,p.display_name,extract(year from age(current_date,p.birth_date))::integer,
    p.city,p.state,p.about,p.interests,p.objectives from public.duoeto_profiles p
    where p.user_id<>all(coalesce(seen,'{}'::uuid[]))
      and (selected is null or p.user_id=selected)
      and extract(year from age(current_date,p.birth_date)) between min_age and max_age
      and duoeto_private.visible_profile(p.user_id)
      and (gender is null or p.gender=gender or (gender='undisclosed' and p.gender is null))
      and (radius is null or exists(select 1 from duoeto_private.locations l where l.user_id=p.user_id
        and duoeto_private.distance_km(origin_lat,origin_lon,l.latitude,l.longitude)<=radius))
      and (interest is null or interest=any(p.interests))
      and (objective is null or objective=any(p.objectives))
      and (not complete or ((btrim(p.about)<>'' or cardinality(p.interests)>0) and cardinality(p.objectives)>0))
      and (min_score is null or (duoeto_private.reputation_summary(p.user_id)->>'overall')::numeric>=min_score)
      and not exists(select 1 from duoeto_private.contacts c where c.status='pending' and c.created_at>now()-interval '30 days'
        and least(c.sender,c.recipient)=least(auth.uid(),p.user_id) and greatest(c.sender,c.recipient)=greatest(auth.uid(),p.user_id))
      and not exists(select 1 from duoeto_private.conversations v where v.status='active' and v.a=least(auth.uid(),p.user_id) and v.b=greatest(auth.uid(),p.user_id))
    order by random() limit 24;
end; $$;
commit;
