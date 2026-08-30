create table if not exists public.schools (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null unique,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint schools_code_format_check check (code ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  constraint schools_name_not_blank_check check (length(btrim(name)) > 0)
);

alter table public.schools enable row level security;

grant select on table public.schools to authenticated;
grant insert, update, delete on table public.schools to authenticated;

insert into public.schools (code, name)
values
  ('sdn-kalibaru-3', 'SDN Kalibaru 3'),
  ('sdn-cilangkap-8', 'SDN Cilangkap 8')
on conflict (code) do update set name = excluded.name, updated_at = now();

alter table public.employees add column if not exists school_id uuid;

update public.employees
set school_id = (select id from public.schools where code = 'sdn-kalibaru-3')
where school_id is null;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'employees_school_id_fkey'
      and conrelid = 'public.employees'::regclass
  ) then
    alter table public.employees
      add constraint employees_school_id_fkey
      foreign key (school_id) references public.schools(id)
      on delete restrict not valid;
  end if;
end $$;

alter table public.employees validate constraint employees_school_id_fkey;
alter table public.employees alter column school_id set not null;

create index if not exists employees_school_id_idx on public.employees (school_id);
create index if not exists employees_school_active_name_idx on public.employees (school_id, is_active, full_name);

drop policy if exists schools_select_authenticated on public.schools;
create policy schools_select_authenticated on public.schools
  for select to authenticated using (true);

drop policy if exists schools_admin_insert on public.schools;
create policy schools_admin_insert on public.schools
  for insert to authenticated
  with check (((select auth.jwt()) -> 'app_metadata' ->> 'role') = 'admin');

drop policy if exists schools_admin_update on public.schools;
create policy schools_admin_update on public.schools
  for update to authenticated
  using (((select auth.jwt()) -> 'app_metadata' ->> 'role') = 'admin')
  with check (((select auth.jwt()) -> 'app_metadata' ->> 'role') = 'admin');

drop policy if exists schools_admin_delete on public.schools;
create policy schools_admin_delete on public.schools
  for delete to authenticated
  using (((select auth.jwt()) -> 'app_metadata' ->> 'role') = 'admin');

drop trigger if exists schools_updated_at on public.schools;
create trigger schools_updated_at before update on public.schools
for each row execute function public.set_updated_at();
