-- Сколько времени человек реально занимался: секунды по дням и режимам.
--
-- Приложение считает только активное время: вкладка открыта на экране теста,
-- карточек, словаря или домашки, и последнее действие было не дольше 2 минут
-- назад. Раз в минуту (и при уходе с экрана) оно присылает накопленные секунды,
-- сервер прибавляет их к сегодняшнему дню в часовом поясе пользователя.
--
-- Применить один раз: Supabase Dashboard → SQL Editor → Run.
-- Скрипт идемпотентный, повторный запуск безопасен.
-- Пока скрипт не запущен, приложение работает как раньше, просто без минут.

create table if not exists public.study_time (
  account_id uuid    not null references public.accounts (id) on delete cascade,
  day        date    not null,
  mode       text    not null check (mode in ('quiz', 'flashcards', 'vocab', 'homework')),
  seconds    integer not null default 0 check (seconds >= 0),
  updated_at timestamptz not null default now(),
  primary key (account_id, day, mode)
);

alter table public.study_time enable row level security;

-- Как и study_days: клиент сюда не ходит, пишет и читает только сервер через
-- service-key. Политик нет — анонимный доступ запрещён по умолчанию.

-- Прибавить секунды одним запросом. Обычный upsert заменил бы значение, а не
-- прибавил, а «прочитать и записать» теряет секунды при двух вкладках сразу.
create or replace function public.add_study_time(
  p_account_id uuid,
  p_day        date,
  p_mode       text,
  p_seconds    integer
) returns void
language sql
as $$
  insert into public.study_time as t (account_id, day, mode, seconds)
  values (p_account_id, p_day, p_mode, greatest(p_seconds, 0))
  on conflict (account_id, day, mode)
  do update set seconds = t.seconds + excluded.seconds, updated_at = now();
$$;

revoke all on function public.add_study_time(uuid, date, text, integer) from public, anon, authenticated;
grant execute on function public.add_study_time(uuid, date, text, integer) to service_role;

comment on table public.study_time is
  'Активное время занятий: секунды за день по режиму (тест, карточки, словарь, домашка).';
