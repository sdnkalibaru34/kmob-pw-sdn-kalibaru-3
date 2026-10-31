-- Automatic Google Sheets sync: queue database changes and process them asynchronously.
create table if not exists public.google_sheets_sync_queue (
  school_id uuid not null references public.schools(id) on delete cascade,
  sync_month text not null check (sync_month ~ '^[0-9]{4}-(0[1-9]|1[0-2])$'),
  requested_at timestamptz not null default now(),
  synced_at timestamptz,
  claimed_at timestamptz,
  last_error text,
  primary key (school_id, sync_month)
);

create index if not exists google_sheets_sync_queue_pending_idx
  on public.google_sheets_sync_queue (requested_at)
  where synced_at is null;

alter table public.google_sheets_sync_queue enable row level security;
revoke all on table public.google_sheets_sync_queue from anon, authenticated;
grant select, update on table public.google_sheets_sync_queue to service_role;

create or replace function public.enqueue_google_sheets_sync(p_school_id uuid, p_month text)
returns void
language sql
security definer
set search_path = public, pg_temp
as $$
  insert into public.google_sheets_sync_queue (school_id, sync_month, requested_at, synced_at, claimed_at, last_error)
  values (p_school_id, p_month, now(), null, null, null)
  on conflict (school_id, sync_month)
  do update set requested_at = excluded.requested_at, synced_at = null, claimed_at = null, last_error = null;
$$;

create or replace function public.queue_google_sheets_sync_trigger()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  row_data jsonb;
  target_employee_id uuid;
  target_school_id uuid;
  target_date date;
  target_month text;
begin
  row_data := case when tg_op = 'DELETE' then to_jsonb(old) else to_jsonb(new) end;

  if tg_table_name = 'work_calendar' then
    target_date := (row_data ->> 'work_date')::date;
    target_month := to_char(target_date, 'YYYY-MM');
    for target_school_id in select id from public.schools where is_active = true loop
      perform public.enqueue_google_sheets_sync(target_school_id, target_month);
    end loop;
  elsif tg_table_name = 'employees' then
    target_school_id := (row_data ->> 'school_id')::uuid;
    target_month := to_char(now() at time zone 'Asia/Jakarta', 'YYYY-MM');
    if target_school_id is not null then
      perform public.enqueue_google_sheets_sync(target_school_id, target_month);
    end if;
  else
    target_employee_id := (row_data ->> 'employee_id')::uuid;
    if tg_table_name = 'attendance' then
      target_date := (row_data ->> 'attendance_date')::date;
    elsif tg_table_name = 'daily_reports' then
      target_date := (row_data ->> 'report_date')::date;
    else
      target_date := (now() at time zone 'Asia/Jakarta')::date;
    end if;
    target_month := to_char(target_date, 'YYYY-MM');
    select school_id into target_school_id
      from public.employees where id = target_employee_id;
    if target_school_id is not null then
      perform public.enqueue_google_sheets_sync(target_school_id, target_month);
    end if;
  end if;

  if tg_op = 'DELETE' then return old; end if;
  return new;
end;
$$;

revoke all on function public.enqueue_google_sheets_sync(uuid, text) from public, anon, authenticated;
revoke all on function public.queue_google_sheets_sync_trigger() from public, anon, authenticated;

drop trigger if exists attendance_queue_google_sheets_sync on public.attendance;
create trigger attendance_queue_google_sheets_sync
after insert or update or delete on public.attendance
for each row execute function public.queue_google_sheets_sync_trigger();

drop trigger if exists daily_reports_queue_google_sheets_sync on public.daily_reports;
create trigger daily_reports_queue_google_sheets_sync
after insert or update or delete on public.daily_reports
for each row execute function public.queue_google_sheets_sync_trigger();

drop trigger if exists employee_shift_preferences_queue_google_sheets_sync on public.employee_shift_preferences;
create trigger employee_shift_preferences_queue_google_sheets_sync
after insert or update or delete on public.employee_shift_preferences
for each row execute function public.queue_google_sheets_sync_trigger();

drop trigger if exists employees_queue_google_sheets_sync on public.employees;
create trigger employees_queue_google_sheets_sync
after insert or update or delete on public.employees
for each row execute function public.queue_google_sheets_sync_trigger();

drop trigger if exists work_calendar_queue_google_sheets_sync on public.work_calendar;
create trigger work_calendar_queue_google_sheets_sync
after insert or update or delete on public.work_calendar
for each row execute function public.queue_google_sheets_sync_trigger();

-- Replace the previous hourly full rewrite with a one-minute queue processor.
do $$
declare v_job_id bigint;
begin
  select jobid into v_job_id from cron.job where jobname = 'mbok-google-sheets-hourly';
  if v_job_id is not null then
    perform cron.alter_job(v_job_id, schedule := '* * * * *');
  end if;
end;
$$;

-- Queue an initial refresh for active schools so the new worker can verify its setup.
insert into public.google_sheets_sync_queue (school_id, sync_month)
select id, to_char(now() at time zone 'Asia/Jakarta', 'YYYY-MM')
from public.schools where is_active = true
on conflict (school_id, sync_month)
do update set requested_at = now(), synced_at = null, claimed_at = null, last_error = null;
