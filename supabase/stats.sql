-- НМТ Практика: статистика по завданнях (які завдання найважчі, у кого де помилки).
-- Виконати один раз: Supabase → SQL Editor → New query → вставити весь файл → Run.

-- Розбивка результату по завданнях: [{ "p": номер, "s": статус, "e": бали, "m": максимум }, ...]
alter table public.results add column if not exists questions jsonb;

-- Учень може лише доповнити свій старий результат розбивкою (бали й інші поля змінити не можна).
revoke update on public.results from authenticated;
grant update (questions) on public.results to authenticated;

drop policy if exists "results: add own details" on public.results;
create policy "results: add own details" on public.results
  for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
