-- Update 3: full SOP template, sign-off, numbered versions, account details.
-- Run once in Supabase → SQL Editor → New query → paste → Run.
-- It only ADDS columns, so Supabase may still warn; nothing is deleted.

alter table public.sops add column if not exists sop_number   text  not null default '';  -- e.g. FHF-SOP-001
alter table public.sops add column if not exists department   text  not null default '';  -- e.g. Accounts
alter table public.sops add column if not exists scope        text  not null default '';
alter table public.sops add column if not exists roles        jsonb not null default '[]'; -- [{role, person, duties}]
alter table public.sops add column if not exists controls     text[] not null default '{}';
alter table public.sops add column if not exists exceptions   text[] not null default '{}';
alter table public.sops add column if not exists records      text  not null default '';
alter table public.sops add column if not exists example      jsonb not null default '{}'; -- {scenario, expected, imageId}
alter table public.sops add column if not exists prepared_by  text;
alter table public.sops add column if not exists prepared_on  date;
alter table public.sops add column if not exists reviewed_by  text;
alter table public.sops add column if not exists approved_by  text;
alter table public.sops add column if not exists version      text  not null default '1.0';
alter table public.sops add column if not exists changed_on   date;
alter table public.sops add column if not exists change_note  text  not null default '';

-- Account numbers and notes per account, e.g. {"Father's House": "ICICI 270605000777, 270605000924 · Sithalapakkam"}
alter table public.settings add column if not exists account_details jsonb not null default '{}';
