-- НМТ Практика: власні симуляції адміністратора й файли (рисунки, довідники).
-- Виконати один раз: Supabase → SQL Editor → New query → вставити весь файл → Run.
-- Потрібні таблиця admins і функція is_admin() із schema.sql та таблиця content_edits із content-edits.sql.

create table if not exists public.simulations (
  id          text primary key,
  package     jsonb not null,                      -- увесь пакет завдань (ContentPackage)
  published   boolean not null default false,      -- false — чернетка, учні не бачать
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

alter table public.simulations enable row level security;

drop policy if exists "simulations: read published or admin" on public.simulations;
create policy "simulations: read published or admin" on public.simulations
  for select to anon, authenticated using (published or public.is_admin());

drop policy if exists "simulations: admin insert" on public.simulations;
create policy "simulations: admin insert" on public.simulations
  for insert to authenticated with check (public.is_admin());

drop policy if exists "simulations: admin update" on public.simulations;
create policy "simulations: admin update" on public.simulations
  for update to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists "simulations: admin delete" on public.simulations;
create policy "simulations: admin delete" on public.simulations
  for delete to authenticated using (public.is_admin());

-- is_admin() потрібна й анонімним відвідувачам (у політиці читання вище).
grant execute on function public.is_admin() to anon;

-- Кошик для файлів: читати може кожен (рисунки бачать учні), завантажувати й видаляти — лише адміністратор.
insert into storage.buckets (id, name, public, file_size_limit)
values ('content', 'content', true, 20971520)
on conflict (id) do update set public = true, file_size_limit = 20971520;

drop policy if exists "content files: admin insert" on storage.objects;
create policy "content files: admin insert" on storage.objects
  for insert to authenticated with check (bucket_id = 'content' and public.is_admin());

drop policy if exists "content files: admin update" on storage.objects;
create policy "content files: admin update" on storage.objects
  for update to authenticated using (bucket_id = 'content' and public.is_admin());

drop policy if exists "content files: admin delete" on storage.objects;
create policy "content files: admin delete" on storage.objects
  for delete to authenticated using (bucket_id = 'content' and public.is_admin());
