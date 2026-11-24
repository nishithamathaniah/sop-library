-- Update 2: task tracker ("Mark as done" and the Checklist page).
-- Run once in Supabase → SQL Editor → New query → paste → Run.
-- Safe to run on a project that already has schema.sql.

create table if not exists public.task_runs (
  id       text primary key default gen_random_uuid()::text,
  sop_id   text not null references public.sops (id) on delete cascade,
  period   text not null,                 -- e.g. 2026-11, W2026-11-23, Q2026-10-01, Y2026, adhoc
  label    text not null default '',      -- e.g. "November 2026", shown in history
  done_at  timestamptz not null default now(),
  done_by  uuid references public.profiles (id) on delete set null,
  note     text not null default ''
);
create index if not exists task_runs_sop_idx on public.task_runs (sop_id, done_at desc);
create index if not exists task_runs_done_idx on public.task_runs (done_at desc);

alter table public.task_runs enable row level security;
grant select, insert, update, delete on public.task_runs to authenticated;

-- Anyone who can see the task can see when it was done
drop policy if exists runs_read on public.task_runs;
create policy runs_read on public.task_runs for select using (
  public.my_role() is not null and exists (select 1 from public.sops s where s.id = sop_id)
);
-- Anyone on the team who can see the task can mark it as done, as themselves
drop policy if exists runs_insert on public.task_runs;
create policy runs_insert on public.task_runs for insert with check (
  done_by = auth.uid() and public.my_role() is not null and exists (select 1 from public.sops s where s.id = sop_id)
);
-- Only the person who marked it (or an Admin) can change or undo it
drop policy if exists runs_update on public.task_runs;
create policy runs_update on public.task_runs for update using (done_by = auth.uid() or public.my_role() = 'admin');
drop policy if exists runs_delete on public.task_runs;
create policy runs_delete on public.task_runs for delete using (done_by = auth.uid() or public.my_role() = 'admin');
