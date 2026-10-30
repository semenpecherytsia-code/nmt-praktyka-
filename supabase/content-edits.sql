-- НМТ Практика: правки адміністратора до тексту завдань.
-- Виконати один раз: Supabase → SQL Editor → New query → вставити весь файл → Run.
-- Потрібна таблиця admins і функція is_admin() із schema.sql (вже виконано раніше).

create table if not exists public.content_edits (
  simulation_id text not null,
  question_id   text not null,             -- '_simulation' — назва й предмет симуляції
  data          jsonb not null,
  updated_at    timestamptz not null default now(),
  updated_by    text default (auth.jwt() ->> 'email'),
  primary key (simulation_id, question_id)
);

alter table public.content_edits enable row level security;

drop policy if exists "edits: read all" on public.content_edits;
create policy "edits: read all" on public.content_edits
  for select to anon, authenticated using (true);

drop policy if exists "edits: admin insert" on public.content_edits;
create policy "edits: admin insert" on public.content_edits
  for insert to authenticated with check (public.is_admin());

drop policy if exists "edits: admin update" on public.content_edits;
create policy "edits: admin update" on public.content_edits
  for update to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists "edits: admin delete" on public.content_edits;
create policy "edits: admin delete" on public.content_edits
  for delete to authenticated using (public.is_admin());
