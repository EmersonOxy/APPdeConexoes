-- Rascunho não executável em produção: permissões e fluxos ainda precisam de validação.
create extension if not exists pgcrypto;

create type public.profile_status as enum ('active', 'suspended', 'banned');
create type public.feedback_visibility as enum ('public_profile', 'public_name', 'private');
create type public.contact_status as enum ('pending', 'accepted', 'rejected', 'cancelled', 'expired');
create type public.conversation_status as enum ('active', 'ended');
create type public.report_reason as enum ('spam', 'harassment', 'fraud', 'offensive_content', 'fake_profile', 'other');
create type public.report_status as enum ('open', 'reviewing', 'resolved', 'dismissed');
create type public.report_target_type as enum ('profile', 'initial_contact', 'conversation', 'message', 'evaluation');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  birth_date date,
  city text,
  state text,
  about text check (char_length(about) <= 500),
  seeking text[] not null default '{}',
  status public.profile_status not null default 'active',
  onboarding_completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (
    onboarding_completed_at is null
    or (
      nullif(trim(display_name), '') is not null
      and birth_date is not null
      and birth_date <= current_date - interval '18 years'
      and nullif(trim(city), '') is not null
      and nullif(trim(state), '') is not null
      and cardinality(seeking) > 0
    )
  )
);

create table public.profile_photos (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  storage_path text not null unique,
  position smallint not null check (position >= 0 and position <= 9),
  is_primary boolean not null default false,
  created_at timestamptz not null default now(),
  unique (user_id, position)
);

create unique index profile_photos_one_primary_per_user
  on public.profile_photos (user_id)
  where is_primary;

create table public.interests (
  slug text primary key,
  label text not null unique,
  active boolean not null default true
);

create table public.profile_interests (
  user_id uuid not null references public.profiles(id) on delete cascade,
  interest_slug text not null references public.interests(slug),
  created_at timestamptz not null default now(),
  primary key (user_id, interest_slug)
);

create table public.first_impression_reviews (
  id uuid primary key default gen_random_uuid(),
  evaluator_id uuid not null references public.profiles(id) on delete cascade,
  evaluated_id uuid not null references public.profiles(id) on delete cascade,
  rating smallint not null check (rating between 1 and 5),
  visibility public.feedback_visibility not null,
  is_valid boolean not null default true,
  created_at timestamptz not null default now(),
  check (evaluator_id <> evaluated_id),
  unique (evaluator_id, evaluated_id)
);

create table public.initial_contacts (
  id uuid primary key default gen_random_uuid(),
  sender_id uuid not null references public.profiles(id) on delete cascade,
  recipient_id uuid not null references public.profiles(id) on delete cascade,
  body text not null check (char_length(trim(body)) between 1 and 500),
  status public.contact_status not null default 'pending',
  expires_at timestamptz not null default now() + interval '30 days',
  edited_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (sender_id <> recipient_id)
);

create unique index initial_contacts_one_pending_per_pair
  on public.initial_contacts (sender_id, recipient_id)
  where status = 'pending';

create table public.conversations (
  id uuid primary key default gen_random_uuid(),
  participant_one_id uuid not null references public.profiles(id) on delete cascade,
  participant_two_id uuid not null references public.profiles(id) on delete cascade,
  source_contact_id uuid unique references public.initial_contacts(id) on delete set null,
  status public.conversation_status not null default 'active',
  ended_by uuid references public.profiles(id) on delete set null,
  ended_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (participant_one_id < participant_two_id),
  check (ended_at is null or status = 'ended')
);

create unique index conversations_one_per_pair
  on public.conversations (participant_one_id, participant_two_id);

create table public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  sender_id uuid not null references public.profiles(id) on delete cascade,
  body text not null check (char_length(trim(body)) between 1 and 2000),
  created_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table public.interaction_reviews (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  evaluator_id uuid not null references public.profiles(id) on delete cascade,
  evaluated_id uuid not null references public.profiles(id) on delete cascade,
  photo_rating smallint not null check (photo_rating between 1 and 5),
  conversation_rating smallint not null check (conversation_rating between 1 and 5),
  respect_rating smallint not null check (respect_rating between 1 and 5),
  humor_rating smallint not null check (humor_rating between 1 and 5),
  visibility public.feedback_visibility not null,
  is_valid boolean not null default true,
  created_at timestamptz not null default now(),
  check (evaluator_id <> evaluated_id)
);

create index interaction_reviews_latest_by_pair
  on public.interaction_reviews (evaluator_id, evaluated_id, conversation_id, created_at desc);

create table public.feed_exclusions (
  viewer_id uuid not null references public.profiles(id) on delete cascade,
  excluded_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (viewer_id, excluded_id),
  check (viewer_id <> excluded_id)
);

create table public.blocks (
  blocker_id uuid not null references public.profiles(id) on delete cascade,
  blocked_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (blocker_id, blocked_id),
  check (blocker_id <> blocked_id)
);

create table public.reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references public.profiles(id) on delete cascade,
  reported_id uuid not null references public.profiles(id) on delete cascade,
  target_type public.report_target_type not null,
  target_id uuid,
  reason public.report_reason not null,
  details text check (char_length(details) <= 1000),
  status public.report_status not null default 'open',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (reporter_id <> reported_id)
);

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  kind text not null,
  reference_id uuid,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.moderation_audit_events (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references public.profiles(id) on delete set null,
  subject_id uuid references public.profiles(id) on delete set null,
  action text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_set_updated_at
before update on public.profiles
for each row execute procedure public.set_updated_at();

create trigger initial_contacts_set_updated_at
before update on public.initial_contacts
for each row execute procedure public.set_updated_at();

create trigger conversations_set_updated_at
before update on public.conversations
for each row execute procedure public.set_updated_at();

create trigger reports_set_updated_at
before update on public.reports
for each row execute procedure public.set_updated_at();

create or replace function public.is_blocked_between(first_user uuid, second_user uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.blocks
    where (blocker_id = first_user and blocked_id = second_user)
       or (blocker_id = second_user and blocked_id = first_user)
  );
$$;

create or replace function public.has_completed_profile(target_user uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles profile
    where profile.id = target_user
      and profile.status = 'active'
      and profile.onboarding_completed_at is not null
      and exists (
        select 1
        from public.profile_photos photo
        where photo.user_id = profile.id
          and photo.is_primary
      )
  );
$$;

create or replace function public.is_conversation_participant(target_conversation uuid, target_user uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.conversations
    where id = target_conversation
      and target_user in (participant_one_id, participant_two_id)
  );
$$;

create or replace function public.submit_first_impression(
  target_user uuid,
  submitted_rating smallint,
  submitted_visibility public.feedback_visibility
)
returns public.first_impression_reviews
language plpgsql
security definer
set search_path = public
as $$
declare
  created_review public.first_impression_reviews;
begin
  if auth.uid() is null then
    raise exception 'Autenticação obrigatória';
  end if;

  if submitted_rating not between 1 and 5 then
    raise exception 'A nota deve estar entre 1 e 5';
  end if;

  if auth.uid() = target_user then
    raise exception 'Não é possível avaliar o próprio perfil';
  end if;

  if not public.has_completed_profile(auth.uid()) or not public.has_completed_profile(target_user) then
    raise exception 'Perfil não elegível para avaliação';
  end if;

  if public.is_blocked_between(auth.uid(), target_user) then
    raise exception 'Interação indisponível';
  end if;

  insert into public.first_impression_reviews (evaluator_id, evaluated_id, rating, visibility)
  values (auth.uid(), target_user, submitted_rating, submitted_visibility)
  returning * into created_review;

  return created_review;
end;
$$;

create or replace function public.send_initial_contact(target_user uuid, submitted_body text)
returns public.initial_contacts
language plpgsql
security definer
set search_path = public
as $$
declare
  created_contact public.initial_contacts;
begin
  if auth.uid() is null then
    raise exception 'Autenticação obrigatória';
  end if;

  if char_length(trim(submitted_body)) not between 1 and 500 then
    raise exception 'A mensagem deve ter entre 1 e 500 caracteres';
  end if;

  if submitted_body ~* 'https?://' then
    raise exception 'Links não são permitidos no primeiro contato';
  end if;

  if not exists (
    select 1
    from public.first_impression_reviews
    where evaluator_id = auth.uid()
      and evaluated_id = target_user
      and is_valid
  ) then
    raise exception 'Avalie o perfil antes de iniciar contato';
  end if;

  if public.is_blocked_between(auth.uid(), target_user) then
    raise exception 'Interação indisponível';
  end if;

  if exists (
    select 1
    from public.initial_contacts
    where sender_id = auth.uid()
      and recipient_id = target_user
      and status = 'pending'
  ) then
    raise exception 'Já existe um primeiro contato pendente';
  end if;

  if exists (
    select 1
    from public.initial_contacts
    where sender_id = auth.uid()
      and recipient_id = target_user
      and status = 'rejected'
      and updated_at > now() - interval '30 days'
  ) then
    raise exception 'Aguarde antes de iniciar outro contato';
  end if;

  insert into public.initial_contacts (sender_id, recipient_id, body)
  values (auth.uid(), target_user, trim(submitted_body))
  returning * into created_contact;

  insert into public.notifications (user_id, kind, reference_id)
  values (target_user, 'initial_contact_received', created_contact.id);

  return created_contact;
end;
$$;

create or replace function public.respond_to_initial_contact(
  contact_id uuid,
  should_accept boolean
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  selected_contact public.initial_contacts;
  created_conversation_id uuid;
  first_participant uuid;
  second_participant uuid;
begin
  select * into selected_contact
  from public.initial_contacts
  where id = contact_id
  for update;

  if selected_contact.id is null or selected_contact.recipient_id <> auth.uid() then
    raise exception 'Primeiro contato indisponível';
  end if;

  if selected_contact.status <> 'pending' or selected_contact.expires_at <= now() then
    raise exception 'Primeiro contato expirado ou já respondido';
  end if;

  if public.is_blocked_between(selected_contact.sender_id, selected_contact.recipient_id) then
    raise exception 'Interação indisponível';
  end if;

  if not should_accept then
    update public.initial_contacts
    set status = 'rejected'
    where id = selected_contact.id;

    insert into public.notifications (user_id, kind, reference_id)
    values (selected_contact.sender_id, 'initial_contact_rejected', selected_contact.id);

    return null;
  end if;

  first_participant := least(selected_contact.sender_id, selected_contact.recipient_id);
  second_participant := greatest(selected_contact.sender_id, selected_contact.recipient_id);

  insert into public.conversations (
    participant_one_id,
    participant_two_id,
    source_contact_id
  )
  values (
    first_participant,
    second_participant,
    selected_contact.id
  )
  on conflict (participant_one_id, participant_two_id)
  do update set status = 'active', ended_at = null, ended_by = null
  returning id into created_conversation_id;

  update public.initial_contacts
  set status = 'accepted'
  where id = selected_contact.id;

  insert into public.notifications (user_id, kind, reference_id)
  values (selected_contact.sender_id, 'initial_contact_accepted', created_conversation_id);

  return created_conversation_id;
end;
$$;

create or replace function public.send_message(target_conversation uuid, submitted_body text)
returns public.messages
language plpgsql
security definer
set search_path = public
as $$
declare
  created_message public.messages;
  recipient uuid;
begin
  if not public.is_conversation_participant(target_conversation, auth.uid()) then
    raise exception 'Conversa indisponível';
  end if;

  if char_length(trim(submitted_body)) not between 1 and 2000 then
    raise exception 'A mensagem deve ter entre 1 e 2000 caracteres';
  end if;

  select case
    when participant_one_id = auth.uid() then participant_two_id
    else participant_one_id
  end
  into recipient
  from public.conversations
  where id = target_conversation
    and status = 'active';

  if recipient is null or public.is_blocked_between(auth.uid(), recipient) then
    raise exception 'Conversa indisponível';
  end if;

  insert into public.messages (conversation_id, sender_id, body)
  values (target_conversation, auth.uid(), trim(submitted_body))
  returning * into created_message;

  insert into public.notifications (user_id, kind, reference_id)
  values (recipient, 'new_message', created_message.id);

  return created_message;
end;
$$;

create or replace function public.end_conversation(target_conversation uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.conversations
  set status = 'ended',
      ended_at = now(),
      ended_by = auth.uid()
  where id = target_conversation
    and auth.uid() in (participant_one_id, participant_two_id)
    and status = 'active';

  if not found then
    raise exception 'Conversa indisponível';
  end if;
end;
$$;

create or replace function public.submit_interaction_review(
  target_conversation uuid,
  photo_score smallint,
  conversation_score smallint,
  respect_score smallint,
  humor_score smallint,
  submitted_visibility public.feedback_visibility
)
returns public.interaction_reviews
language plpgsql
security definer
set search_path = public
as $$
declare
  other_user uuid;
  previous_review_at timestamptz;
  created_review public.interaction_reviews;
begin
  if not public.is_conversation_participant(target_conversation, auth.uid()) then
    raise exception 'Conversa indisponível';
  end if;

  if photo_score not between 1 and 5
    or conversation_score not between 1 and 5
    or respect_score not between 1 and 5
    or humor_score not between 1 and 5 then
    raise exception 'Todas as notas devem estar entre 1 e 5';
  end if;

  select case
    when participant_one_id = auth.uid() then participant_two_id
    else participant_one_id
  end
  into other_user
  from public.conversations
  where id = target_conversation;

  if public.is_blocked_between(auth.uid(), other_user) then
    raise exception 'Interação indisponível';
  end if;

  if (select count(*) from public.messages
      where conversation_id = target_conversation
        and sender_id = auth.uid()
        and deleted_at is null) < 5
    or (select count(*) from public.messages
        where conversation_id = target_conversation
          and sender_id = other_user
          and deleted_at is null) < 5 then
    raise exception 'São necessárias cinco mensagens válidas por participante';
  end if;

  select max(created_at) into previous_review_at
  from public.interaction_reviews
  where conversation_id = target_conversation
    and evaluator_id = auth.uid()
    and evaluated_id = other_user;

  if previous_review_at is not null and previous_review_at > now() - interval '7 days' then
    raise exception 'Aguarde sete dias para reavaliar';
  end if;

  insert into public.interaction_reviews (
    conversation_id,
    evaluator_id,
    evaluated_id,
    photo_rating,
    conversation_rating,
    respect_rating,
    humor_rating,
    visibility
  )
  values (
    target_conversation,
    auth.uid(),
    other_user,
    photo_score,
    conversation_score,
    respect_score,
    humor_score,
    submitted_visibility
  )
  returning * into created_review;

  return created_review;
end;
$$;

create or replace function public.block_user(target_user uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null or auth.uid() = target_user then
    raise exception 'Bloqueio inválido';
  end if;

  insert into public.blocks (blocker_id, blocked_id)
  values (auth.uid(), target_user)
  on conflict do nothing;

  update public.conversations
  set status = 'ended',
      ended_at = now(),
      ended_by = auth.uid()
  where auth.uid() in (participant_one_id, participant_two_id)
    and target_user in (participant_one_id, participant_two_id)
    and status = 'active';
end;
$$;

create or replace view public.reputation_summary as
with first_scores as (
  select
    evaluated_id as profile_id,
    round(avg(rating)::numeric, 2) as first_impression_average,
    count(*)::integer as first_impression_count
  from public.first_impression_reviews
  where is_valid
  group by evaluated_id
),
latest_interactions as (
  select distinct on (evaluator_id, evaluated_id, conversation_id)
    evaluator_id,
    evaluated_id,
    conversation_id,
    photo_rating,
    conversation_rating,
    respect_rating,
    humor_rating
  from public.interaction_reviews
  where is_valid
  order by evaluator_id, evaluated_id, conversation_id, created_at desc
),
interaction_scores as (
  select
    evaluated_id as profile_id,
    round(avg(photo_rating)::numeric, 2) as photo_average,
    round(avg(conversation_rating)::numeric, 2) as conversation_average,
    round(avg(respect_rating)::numeric, 2) as respect_average,
    round(avg(humor_rating)::numeric, 2) as humor_average,
    count(*)::integer as interaction_count
  from latest_interactions
  group by evaluated_id
)
select
  profile.id as profile_id,
  coalesce(first_scores.first_impression_count, 0) as first_impression_count,
  first_scores.first_impression_average,
  interaction_scores.interaction_count,
  interaction_scores.photo_average,
  interaction_scores.conversation_average,
  interaction_scores.respect_average,
  interaction_scores.humor_average,
  case
    when first_scores.first_impression_average is not null
      and interaction_scores.photo_average is not null
    then round(((first_scores.first_impression_average + interaction_scores.photo_average) / 2)::numeric, 2)
    else first_scores.first_impression_average
  end as initial_perception,
  case
    when interaction_scores.conversation_average is not null
      and interaction_scores.respect_average is not null
      and interaction_scores.humor_average is not null
    then round(((interaction_scores.conversation_average + interaction_scores.respect_average + interaction_scores.humor_average) / 3)::numeric, 2)
    else null
  end as experience,
  case
    when first_scores.first_impression_average is not null
      and interaction_scores.photo_average is not null
      and interaction_scores.conversation_average is not null
      and interaction_scores.respect_average is not null
      and interaction_scores.humor_average is not null
    then round((
      (
        (first_scores.first_impression_average + interaction_scores.photo_average) / 2
        + (interaction_scores.conversation_average + interaction_scores.respect_average + interaction_scores.humor_average) / 3
      ) / 2
    )::numeric, 2)
    else null
  end as overall_score,
  case
    when coalesce(interaction_scores.interaction_count, 0) >= 35 then 'consolidated'
    when coalesce(first_scores.first_impression_count, 0) >= 15 then 'initial_established'
    when coalesce(first_scores.first_impression_count, 0) > 0 then 'forming'
    else 'none'
  end as reputation_status
from public.profiles profile
left join first_scores on first_scores.profile_id = profile.id
left join interaction_scores on interaction_scores.profile_id = profile.id
where profile.status = 'active';

alter table public.profiles enable row level security;
alter table public.profile_photos enable row level security;
alter table public.interests enable row level security;
alter table public.profile_interests enable row level security;
alter table public.first_impression_reviews enable row level security;
alter table public.initial_contacts enable row level security;
alter table public.conversations enable row level security;
alter table public.messages enable row level security;
alter table public.interaction_reviews enable row level security;
alter table public.feed_exclusions enable row level security;
alter table public.blocks enable row level security;
alter table public.reports enable row level security;
alter table public.notifications enable row level security;
alter table public.moderation_audit_events enable row level security;

create policy "authenticated users can view eligible profiles"
on public.profiles for select to authenticated
using (not public.is_blocked_between(auth.uid(), id));

create policy "users can create their profile"
on public.profiles for insert to authenticated
with check (id = auth.uid());

create policy "users can update their profile"
on public.profiles for update to authenticated
using (id = auth.uid())
with check (id = auth.uid());

create policy "authenticated users can view visible photos"
on public.profile_photos for select to authenticated
using (not public.is_blocked_between(auth.uid(), user_id));

create policy "users manage their photos"
on public.profile_photos for all to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

create policy "authenticated users can view interests"
on public.interests for select to authenticated
using (active);

create policy "authenticated users can view profile interests"
on public.profile_interests for select to authenticated
using (not public.is_blocked_between(auth.uid(), user_id));

create policy "users manage their interests"
on public.profile_interests for all to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

create policy "review authors can view their first impressions"
on public.first_impression_reviews for select to authenticated
using (evaluator_id = auth.uid());

create policy "review authors can view their interaction reviews"
on public.interaction_reviews for select to authenticated
using (evaluator_id = auth.uid());

create policy "participants can view first contacts"
on public.initial_contacts for select to authenticated
using (auth.uid() in (sender_id, recipient_id));

create policy "participants can view conversations"
on public.conversations for select to authenticated
using (auth.uid() in (participant_one_id, participant_two_id));

create policy "participants can view messages"
on public.messages for select to authenticated
using (public.is_conversation_participant(conversation_id, auth.uid()));

create policy "users manage feed exclusions"
on public.feed_exclusions for all to authenticated
using (viewer_id = auth.uid())
with check (viewer_id = auth.uid());

create policy "users view their blocks"
on public.blocks for select to authenticated
using (blocker_id = auth.uid());

create policy "users create their blocks"
on public.blocks for insert to authenticated
with check (blocker_id = auth.uid());

create policy "reporters can view their reports"
on public.reports for select to authenticated
using (reporter_id = auth.uid());

create policy "reporters can create reports"
on public.reports for insert to authenticated
with check (reporter_id = auth.uid());

create policy "users view their notifications"
on public.notifications for select to authenticated
using (user_id = auth.uid());

create policy "users mark their notifications read"
on public.notifications for update to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

grant select on public.reputation_summary to authenticated;
grant execute on function public.submit_first_impression(uuid, smallint, public.feedback_visibility) to authenticated;
grant execute on function public.send_initial_contact(uuid, text) to authenticated;
grant execute on function public.respond_to_initial_contact(uuid, boolean) to authenticated;
grant execute on function public.send_message(uuid, text) to authenticated;
grant execute on function public.end_conversation(uuid) to authenticated;
grant execute on function public.submit_interaction_review(uuid, smallint, smallint, smallint, smallint, public.feedback_visibility) to authenticated;
grant execute on function public.block_user(uuid) to authenticated;
