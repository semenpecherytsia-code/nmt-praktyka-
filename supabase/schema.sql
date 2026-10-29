-- НМТ Практика: таблиця результатів і доступ адміністратора.
-- Виконати один раз: Supabase → SQL Editor → New query → вставити весь файл → Run.
-- Замініть ADMIN@EMAIL.COM у кінці файлу на свою пошту.

create table if not exists public.results (
  id                text primary key,                  -- ідентифікатор спроби з браузера
  user_id           uuid not null default auth.uid() references auth.users (id) on delete cascade,
  email             text,
  full_name         text,
  simulation_id     text not null,
  simulation_title  text,
  content_version   text,
  primary_score     numeric not null,
  max_score         numeric not null,
  percent           numeric,
  nmt_score         integer,                           -- бал НМТ 100–200 (null, якщо «не склав»)
  correct           integer,
  partial           integer,
  wrong             integer,
  skipped           integer,
  started_at        timestamptz not null,
  finished_at       timestamptz not null,
  duration_seconds  integer,
  finish_reason     text,
  created_at        timestamptz not null default now()
);
create index if not exists results_user_idx on public.results (user_id);
create index if not exists results_finished_idx on public.results (finished_at desc);

create table if not exists public.admins (email text primary key);

alter table public.results enable row level security;
alter table public.admins  enable row level security;   -- без політик: напряму не читається

create or replace function public.is_admin() returns boolean
  language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.admins where lower(email) = lower(auth.jwt() ->> 'email'));
$$;
revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to authenticated;

drop policy if exists "results: insert own" on public.results;
create policy "results: insert own" on public.results
  for insert to authenticated with check (user_id = auth.uid());

drop policy if exists "results: read own or admin" on public.results;
create policy "results: read own or admin" on public.results
  for select to authenticated using (user_id = auth.uid() or public.is_admin());

drop policy if exists "results: admin delete" on public.results;
create policy "results: admin delete" on public.results
  for delete to authenticated using (public.is_admin());

insert into public.admins (email) values (lower('ADMIN@EMAIL.COM')) on conflict do nothing;
