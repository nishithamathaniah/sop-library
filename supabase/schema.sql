-- SOP Library: database, access rules and screenshot storage for Supabase.
-- Paste this whole file into Supabase → SQL Editor → Run. Safe to run once
-- on a new project.
--
-- How access works
--   * The FIRST person to sign up becomes Admin automatically.
--   * The Admin adds people in the app (name, email, role). That creates an
--     invite. When that person signs up with that email (password or Google),
--     they get that role straight away.
--   * Anyone else who signs up waits as "pending" until an Admin activates them.
--   * Owners edit only their own SOPs; Readers see only published SOPs (F12).
--     These rules run on the server, so they hold even outside the app.

-- ---------- Tables ----------
create table public.profiles (
  id          uuid primary key references auth.users (id) on delete cascade,
  name        text not null,
  email       text not null unique,
  role        text not null default 'reader' check (role in ('admin', 'owner', 'reader')),
  active      boolean not null default false,
  created_at  timestamptz not null default now()
);

create table public.invites (
  email       text primary key,
  name        text not null,
  role        text not null default 'owner' check (role in ('admin', 'owner', 'reader')),
  invited_by  uuid references public.profiles (id) on delete set null,
  created_at  timestamptz not null default now()
);

create table public.settings (
  id          text primary key default 'settings',
  -- The separate accounts the team looks after; add yours in the app (Admin → Accounts & categories)
  accounts    text[] not null default '{}',
  categories  text[] not null default array['Cash','Bank transfers','Reimbursements','Invoices & bills','Tallying & reconciliation','Records & reports','Other']
);
insert into public.settings (id) values ('settings') on conflict do nothing;

create table public.sops (
  id              text primary key default gen_random_uuid()::text,
  name            text not null default '',
  owner_id        uuid not null references public.profiles (id),
  backup_id       uuid references public.profiles (id) on delete set null,
  accounts        text[] not null default '{}',  -- which account(s) this task is for; '*' = all accounts
  category        text not null,
  frequency       text not null check (frequency in ('Daily','Weekly','Monthly','Quarterly','Yearly','As needed')),
  purpose         text not null default '',
  when_to_do      text not null default '',
  tools           text[] not null default '{}',
  steps           jsonb not null default '[]',   -- [{id,text,imageId,caption,link,linkLabel,note,video}]
  links           jsonb not null default '[]',   -- [{label,url}]
  mistakes        text[] not null default '{}',
  done_checklist  text[] not null default '{}',
  output          text not null default '',
  status          text not null default 'Draft' check (status in ('Draft','Published','Needs update')),
  review_date     date,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  updated_by      uuid references public.profiles (id) on delete set null
);
create index sops_owner_idx on public.sops (owner_id);

create table public.sop_versions (
  id      text primary key default gen_random_uuid()::text,
  sop_id  text not null references public.sops (id) on delete cascade,
  at      timestamptz not null,
  by      uuid references public.profiles (id) on delete set null,
  data    jsonb not null
);
create index sop_versions_sop_idx on public.sop_versions (sop_id, at desc);

create table public.comments (
  id           text primary key default gen_random_uuid()::text,
  sop_id       text not null references public.sops (id) on delete cascade,
  step_id      text,
  user_id      uuid not null references public.profiles (id) on delete cascade,
  text         text not null,
  at           timestamptz not null default now(),
  resolved     boolean not null default false,
  resolved_by  uuid references public.profiles (id) on delete set null,
  resolved_at  timestamptz
);
create index comments_sop_idx on public.comments (sop_id);

-- ---------- Automatic fields and new sign-ups ----------

-- "Last updated" and "Last updated by" are set by the server (section 5: Auto)
create or replace function public.touch_sop() returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  new.updated_by := coalesce(auth.uid(), new.updated_by);
  return new;
end $$;
create trigger sops_touch before insert or update on public.sops
  for each row execute function public.touch_sop();

-- Every new account gets a profile: first account = Admin; invited = their role.
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  inv   public.invites%rowtype;
  first boolean;
begin
  select not exists (select 1 from public.profiles) into first;
  select * into inv from public.invites where email = lower(new.email);
  insert into public.profiles (id, name, email, role, active)
  values (
    new.id,
    coalesce(nullif(inv.name, ''), new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name', split_part(new.email, '@', 1)),
    lower(new.email),
    case when first then 'admin' else coalesce(inv.role, 'reader') end,
    first or inv.email is not null
  );
  if inv.email is not null then
    delete from public.invites where email = inv.email;
  end if;
  return new;
end $$;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- The signed-in person's role, or null if they are pending/deactivated
create or replace function public.my_role() returns text
language sql stable security definer set search_path = public as $$
  select role from public.profiles where id = auth.uid() and active
$$;

-- ---------- Access rules (row-level security) ----------
alter table public.profiles     enable row level security;
alter table public.invites      enable row level security;
alter table public.settings     enable row level security;
alter table public.sops         enable row level security;
alter table public.sop_versions enable row level security;
alter table public.comments     enable row level security;

grant usage on schema public to authenticated;
grant select, insert, update, delete on all tables in schema public to authenticated;

-- People: the team can see each other; you can always see yourself; Admins manage
create policy profiles_read  on public.profiles for select using (public.my_role() is not null or id = auth.uid());
create policy profiles_admin on public.profiles for update using (public.my_role() = 'admin') with check (public.my_role() = 'admin');

create policy invites_admin on public.invites for all using (public.my_role() = 'admin') with check (public.my_role() = 'admin');

create policy settings_read  on public.settings for select using (public.my_role() is not null);
create policy settings_admin on public.settings for update using (public.my_role() = 'admin') with check (public.my_role() = 'admin');

-- SOPs (F12)
create policy sops_read on public.sops for select using (
  public.my_role() in ('admin', 'owner') or (public.my_role() = 'reader' and status <> 'Draft')
);
create policy sops_insert on public.sops for insert with check (
  public.my_role() = 'admin' or (public.my_role() = 'owner' and owner_id = auth.uid())
);
create policy sops_update on public.sops for update
  using      (public.my_role() = 'admin' or (public.my_role() = 'owner' and owner_id = auth.uid()))
  with check (public.my_role() = 'admin' or (public.my_role() = 'owner' and owner_id = auth.uid()));
create policy sops_delete on public.sops for delete using (
  public.my_role() = 'admin' or (public.my_role() = 'owner' and owner_id = auth.uid() and status = 'Draft')
);

-- Version history follows the SOP's edit rights
create policy versions_read on public.sop_versions for select using (
  exists (select 1 from public.sops s where s.id = sop_id)
);
create policy versions_insert on public.sop_versions for insert with check (
  exists (select 1 from public.sops s where s.id = sop_id
          and (public.my_role() = 'admin' or (public.my_role() = 'owner' and s.owner_id = auth.uid())))
);
create policy versions_delete on public.sop_versions for delete using (
  exists (select 1 from public.sops s where s.id = sop_id
          and (public.my_role() = 'admin' or (public.my_role() = 'owner' and s.owner_id = auth.uid())))
);

-- Questions on steps: anyone who can read the SOP can ask; the asker, the
-- SOP's owner or an Admin can resolve
create policy comments_read   on public.comments for select using (exists (select 1 from public.sops s where s.id = sop_id));
create policy comments_insert on public.comments for insert with check (
  user_id = auth.uid() and public.my_role() is not null and exists (select 1 from public.sops s where s.id = sop_id)
);
create policy comments_update on public.comments for update using (
  public.my_role() is not null and (
    user_id = auth.uid() or public.my_role() = 'admin'
    or exists (select 1 from public.sops s where s.id = sop_id and s.owner_id = auth.uid()))
);

-- ---------- Screenshot storage ----------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('screenshots', 'screenshots', false, 5242880, array['image/webp', 'image/jpeg', 'image/png'])
on conflict (id) do nothing;

create policy screenshots_read on storage.objects for select to authenticated
  using (bucket_id = 'screenshots' and public.my_role() is not null);
create policy screenshots_upload on storage.objects for insert to authenticated
  with check (bucket_id = 'screenshots' and public.my_role() in ('admin', 'owner'));

-- ---------- Task tracker (also in migrations/002_task_runs.sql) ----------
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
