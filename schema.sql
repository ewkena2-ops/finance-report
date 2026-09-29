-- ==========================================================================
-- Group Finance Reporting — database schema (Supabase / Postgres)
-- Access is enforced here with row level security, not only in the page.
--   owner      : Chairman — sees and edits everything, manages access
--   controller : group finance controller — sees and edits everything
--   staff      : finance staff — only the company data sheets they fill in;
--                never personal records, salaries, staff reviews or reports
-- ==========================================================================

create table if not exists public.members (
  email      text primary key,
  name       text,
  role       text not null check (role in ('owner', 'controller', 'staff')),
  created_at timestamptz not null default now()
);

create table if not exists public.records (
  dataset    text not null,
  rid        text not null,
  data       jsonb not null,
  personal   boolean not null default false,
  updated_at timestamptz not null default now(),
  updated_by text,
  primary key (dataset, rid)
);

create table if not exists public.settings (
  id         text primary key check (id in ('general', 'private')),
  data       jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  updated_by text
);

-- Who am I? (role of the signed-in user, or null)
create or replace function public.my_role() returns text
language sql stable security definer set search_path = public as $$
  select role from public.members where lower(email) = lower(auth.jwt() ->> 'email')
$$;

-- Is there an owner yet? (lets the very first user set the system up)
create or replace function public.has_owner() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.members where role = 'owner')
$$;

-- First signed-in user becomes the owner, only while there is no owner
create or replace function public.claim_owner(display_name text) returns text
language plpgsql security definer set search_path = public as $$
declare me text := lower(auth.jwt() ->> 'email');
begin
  if me is null then raise exception 'Not signed in'; end if;
  if exists (select 1 from public.members where role = 'owner') then raise exception 'The system already has an owner'; end if;
  insert into public.members (email, name, role) values (me, display_name, 'owner')
    on conflict (email) do update set role = 'owner', name = excluded.name;
  return 'owner';
end $$;

create or replace function public.touch() returns trigger
language plpgsql as $$
begin
  new.updated_at := now();
  new.updated_by := auth.jwt() ->> 'email';
  return new;
end $$;

drop trigger if exists records_touch on public.records;
create trigger records_touch before insert or update on public.records for each row execute function public.touch();
drop trigger if exists settings_touch on public.settings;
create trigger settings_touch before insert or update on public.settings for each row execute function public.touch();

alter table public.members  enable row level security;
alter table public.records  enable row level security;
alter table public.settings enable row level security;

-- members: the owner manages everyone; each person can see their own row
drop policy if exists members_select on public.members;
create policy members_select on public.members for select to authenticated
  using (public.my_role() = 'owner' or lower(email) = lower(auth.jwt() ->> 'email'));
drop policy if exists members_write on public.members;
create policy members_write on public.members for all to authenticated
  using (public.my_role() = 'owner') with check (public.my_role() = 'owner');

-- records
drop policy if exists records_select on public.records;
create policy records_select on public.records for select to authenticated using (
  public.my_role() in ('owner', 'controller')
  or (public.my_role() = 'staff' and not personal
      and dataset in ('accounts', 'balances', 'transactions', 'forecast', 'reconItems', 'monthly'))
);
drop policy if exists records_insert on public.records;
create policy records_insert on public.records for insert to authenticated with check (
  public.my_role() in ('owner', 'controller')
  or (public.my_role() = 'staff' and not personal
      and dataset in ('balances', 'transactions', 'forecast', 'reconItems', 'monthly'))
);
drop policy if exists records_update on public.records;
create policy records_update on public.records for update to authenticated using (
  public.my_role() in ('owner', 'controller')
  or (public.my_role() = 'staff' and not personal
      and dataset in ('balances', 'transactions', 'forecast', 'reconItems', 'monthly'))
) with check (
  public.my_role() in ('owner', 'controller')
  or (public.my_role() = 'staff' and not personal
      and dataset in ('balances', 'transactions', 'forecast', 'reconItems', 'monthly'))
);
drop policy if exists records_delete on public.records;
create policy records_delete on public.records for delete to authenticated using (
  public.my_role() in ('owner', 'controller')
  or (public.my_role() = 'staff' and not personal
      and dataset in ('balances', 'transactions', 'forecast', 'reconItems', 'monthly'))
);

-- settings: everyone signed in reads the general settings; salaries are private
drop policy if exists settings_select on public.settings;
create policy settings_select on public.settings for select to authenticated using (
  (id = 'general' and public.my_role() is not null) or public.my_role() in ('owner', 'controller')
);
drop policy if exists settings_write on public.settings;
create policy settings_write on public.settings for all to authenticated
  using (public.my_role() in ('owner', 'controller')) with check (public.my_role() in ('owner', 'controller'));

grant execute on function public.my_role(), public.has_owner(), public.claim_owner(text) to authenticated;

-- live updates for the page
do $$ begin
  alter publication supabase_realtime add table public.records;
exception when duplicate_object then null; end $$;
