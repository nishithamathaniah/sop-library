-- SOP Library: hosted backend for phase 2 (Supabase / Postgres).
-- Not wired into the app yet: today js/db.js stores data in the browser.
-- Run this in the Supabase SQL editor, then replace js/db.js with calls to
-- supabase-js against these tables. Access rules (F12) are enforced here,
-- on the server, by row-level security.

create table public.profiles (
  id          uuid primary key references auth.users (id) on delete cascade,
  name        text not null,
  email       text not null unique,
  role        text not null default 'owner' check (role in ('admin', 'owner', 'reader')),
  active      boolean not null default true,
  created_at  timestamptz not null default now()
);

create table public.settings (
  id          text primary key default 'settings',
  categories  text[] not null default array['Admin','Finance','Communication','Operations','Other']
);
insert into public.settings (id) values ('settings') on conflict do nothing;

create table public.sops (
  id              uuid primary key default gen_random_uuid(),
  name            text not null default '',
  owner_id        uuid not null references public.profiles (id),
  backup_id       uuid references public.profiles (id),
  category        text not null,
  frequency       text not null check (frequency in ('Daily','Weekly','Monthly','Termly','Yearly','As needed')),
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
  updated_by      uuid references public.profiles (id)
);
create index sops_owner_idx on public.sops (owner_id);
-- Full-text search over titles and step text (F10)
create index sops_search_idx on public.sops using gin (
  to_tsvector('simple', name || ' ' || purpose || ' ' || coalesce(steps::text, ''))
);

create table public.sop_versions (
  id          uuid primary key default gen_random_uuid(),
  sop_id      uuid not null references public.sops (id) on delete cascade,
  at          timestamptz not null,
  by          uuid references public.profiles (id),
  data        jsonb not null
);
create index sop_versions_sop_idx on public.sop_versions (sop_id, at desc);

create table public.comments (
  id           uuid primary key default gen_random_uuid(),
  sop_id       uuid not null references public.sops (id) on delete cascade,
  step_id      text,
  user_id      uuid not null references public.profiles (id),
  text         text not null,
  at           timestamptz not null default now(),
  resolved     boolean not null default false,
  resolved_by  uuid references public.profiles (id),
  resolved_at  timestamptz
);

-- Stamp who changed an SOP and when (the "Auto" fields in section 5)
create or replace function public.touch_sop() returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  new.updated_by := auth.uid();
  return new;
end $$;
create trigger sops_touch before insert or update on public.sops
  for each row execute function public.touch_sop();

-- Helpers for the policies
create or replace function public.my_role() returns text language sql stable security definer set search_path = public as $$
  select role from public.profiles where id = auth.uid() and active
$$;

alter table public.profiles     enable row level security;
alter table public.settings     enable row level security;
alter table public.sops         enable row level security;
alter table public.sop_versions enable row level security;
alter table public.comments     enable row level security;

-- Profiles: everyone signed in can see the team; only admins manage people
create policy profiles_read  on public.profiles for select using (public.my_role() is not null);
create policy profiles_admin on public.profiles for all    using (public.my_role() = 'admin') with check (public.my_role() = 'admin');

create policy settings_read  on public.settings for select using (public.my_role() is not null);
create policy settings_admin on public.settings for update using (public.my_role() = 'admin');

-- SOPs (F12): readers see only non-drafts; owners edit only their own; admins edit all
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

-- Versions follow the SOP's edit rights
create policy versions_read on public.sop_versions for select using (
  exists (select 1 from public.sops s where s.id = sop_id)
);
create policy versions_write on public.sop_versions for insert with check (
  exists (select 1 from public.sops s where s.id = sop_id
          and (public.my_role() = 'admin' or (public.my_role() = 'owner' and s.owner_id = auth.uid())))
);

-- Comments: anyone who can read the SOP can ask; the asker or the SOP's editors can resolve
create policy comments_read   on public.comments for select using (exists (select 1 from public.sops s where s.id = sop_id));
create policy comments_insert on public.comments for insert with check (user_id = auth.uid() and exists (select 1 from public.sops s where s.id = sop_id));
create policy comments_update on public.comments for update using (
  user_id = auth.uid() or public.my_role() = 'admin'
  or exists (select 1 from public.sops s where s.id = sop_id and s.owner_id = auth.uid())
);

-- Screenshots: create a private storage bucket named "screenshots" in the
-- dashboard, then allow signed-in team members to read and upload:
-- create policy shots_read   on storage.objects for select using (bucket_id = 'screenshots' and public.my_role() is not null);
-- create policy shots_upload on storage.objects for insert with check (bucket_id = 'screenshots' and public.my_role() in ('admin','owner'));
