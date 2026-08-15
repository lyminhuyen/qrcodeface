-- Run only in the isolated Supabase evaluation project.
create table if not exists public.profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  role text not null default 'user' check (role in ('user', 'admin')),
  state text not null default 'active' check (state in ('active', 'suspended', 'pending_deletion')),
  deletion_requested_at timestamptz,
  deletion_due_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.favorites (
  user_id uuid not null references auth.users(id) on delete cascade,
  qrcode_id text not null,
  created_at timestamptz not null default now(),
  primary key (user_id, qrcode_id)
);

create table if not exists public.audit_log (
  id bigint generated always as identity primary key,
  actor_user_id uuid not null,
  target_user_id uuid not null,
  action text not null,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;
alter table public.favorites enable row level security;
alter table public.audit_log enable row level security;

create or replace function public.is_active_user(target_user_id uuid default auth.uid())
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.profiles
    where user_id = target_user_id and state = 'active'
  );
$$;

revoke all on function public.is_active_user(uuid) from public;
grant execute on function public.is_active_user(uuid) to authenticated;

create policy "profile owner reads self" on public.profiles
  for select to authenticated using (user_id = auth.uid());
create policy "favorite owner reads" on public.favorites
  for select to authenticated using (user_id = auth.uid() and public.is_active_user());
create policy "favorite owner creates" on public.favorites
  for insert to authenticated with check (user_id = auth.uid() and public.is_active_user());
create policy "favorite owner deletes" on public.favorites
  for delete to authenticated using (user_id = auth.uid() and public.is_active_user());

create or replace function public.create_profile_for_new_user()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (user_id) values (new.id);
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
for each row execute procedure public.create_profile_for_new_user();

create or replace function public.admin_mutate_user(target_user_id uuid, requested_action text)
returns text language plpgsql security definer set search_path = '' as $$
declare
  actor_id uuid := auth.uid();
  target public.profiles%rowtype;
  active_admins integer;
begin
  if actor_id is null then raise exception 'Authentication required'; end if;
  if coalesce(auth.jwt()->>'aal', '') <> 'aal2' then raise exception 'A verified MFA session is required'; end if;
  if not exists (select 1 from public.profiles where user_id = actor_id and role = 'admin' and state = 'active') then
    raise exception 'Admin role required';
  end if;
  if actor_id = target_user_id then raise exception 'Admins cannot mutate their own role or lifecycle'; end if;
  if requested_action not in ('promote', 'demote', 'suspend', 'restore', 'request_deletion', 'cancel_deletion') then
    raise exception 'Unsupported action';
  end if;

  select * into target from public.profiles where user_id = target_user_id for update;
  if not found then raise exception 'User not found'; end if;
  select count(*) into active_admins from public.profiles where role = 'admin' and state = 'active';
  if target.role = 'admin' and target.state = 'active' and active_admins <= 1
     and requested_action in ('demote', 'suspend', 'request_deletion') then
    raise exception 'The final active admin cannot be removed';
  end if;
  if target.state = 'pending_deletion' and requested_action = 'promote' then
    raise exception 'An account pending deletion cannot be promoted';
  end if;

  update public.profiles set
    role = case requested_action when 'promote' then 'admin' when 'demote' then 'user' else role end,
    state = case requested_action when 'suspend' then 'suspended' when 'request_deletion' then 'pending_deletion' when 'restore' then 'active' when 'cancel_deletion' then 'active' else state end,
    deletion_requested_at = case when requested_action = 'request_deletion' then now() when requested_action = 'cancel_deletion' then null else deletion_requested_at end,
    deletion_due_at = case when requested_action = 'request_deletion' then now() + interval '30 days' when requested_action = 'cancel_deletion' then null else deletion_due_at end
  where user_id = target_user_id;

  if requested_action in ('suspend', 'request_deletion') then
    update auth.users set banned_until = now() + interval '100 years' where id = target_user_id;
    delete from auth.sessions where user_id = target_user_id;
  end if;
  if requested_action in ('restore', 'cancel_deletion') then
    update auth.users set banned_until = null where id = target_user_id;
  end if;
  insert into public.audit_log (actor_user_id, target_user_id, action) values (actor_id, target_user_id, requested_action);
  return 'User updated';
end;
$$;

revoke all on function public.admin_mutate_user(uuid, text) from public;
grant execute on function public.admin_mutate_user(uuid, text) to authenticated;
