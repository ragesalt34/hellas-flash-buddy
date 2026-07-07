# Отвязка от Lovable → собственная независимая БД

Цель: свой Supabase-проект, своя схема (`db/schema.sql`), никакой привязки к
Telegram-id и к Lovable. Ниже — точный порядок. Шаги «🧑 ТЫ» может сделать
только владелец (создание проекта, ключи, перенос данных — я к секретам и к
чужой БД доступа не имею). Шаги «🤖 Я» — это код, который я пишу.

Порядок важен: код-переключение (шаг 5) выходит в прод последним, когда новая
база уже готова и наполнена — иначе живой сайт ляжет.

---

## 1. 🧑 Создать новый проект Supabase
- supabase.com → New project (НЕ через Lovable). Регион — Европа.
- Запиши `Project URL` и `service_role` ключ (Settings → API). Это секреты —
  вводишь их ТОЛЬКО сам (в Render env на шаге 6), мне не присылай.

## 2. 🧑 Применить схему
- Dashboard → SQL Editor → вставить весь `db/schema.sql` → Run.
- Проверить, что таблицы `accounts`, `questions`, `quiz_sessions`,
  `question_progress`, `vocab_progress` создались.

## 3. 🧑 Перенести вопросы из старой базы
Контент вопросов сейчас в Lovable-базе (таблица `questions`). Перенос:
- Старый проект → SQL Editor → выгрузить как CSV:
  `select topic, question as question_ru, question_el, correct_answer as correct_answer_ru, correct_answer_el, wrong_answers as wrong_answers_ru, wrong_answers_el, explanation as explanation_ru, explanation_el from questions;`
  (Download CSV в правом верхнем углу результата.)
- Новый проект → Table editor → `questions` → Import data from CSV.
- Если колонки-массивы (`wrong_answers_*`) не импортируются как `text[]` —
  скажи мне, дам маленький скрипт-конвертер.
- Словарь переносить НЕ надо — он в коде (`src/data/vocabulary.ts`).

## 4. 🤖 Переписать код под новую схему (делаю я, в отдельном коммите)
- `src/db.ts` — клиент новой БД (тот же `@supabase/supabase-js`, новые env).
- `accountService.ts` — регистрация/вход своими силами: `accounts` +
  bcrypt-хэш пароля (пакет `bcryptjs`), без Supabase Auth и без GoTrue.
- Переписать `questionService` / `sessionService` / `vocabProgressService` на
  `account_id (uuid)` вместо `telegram_id`. Стрик — из `quiz_sessions`.
- `server.ts` — токен-сессия остаётся (HMAC), но `id` в токене становится
  account UUID. Гость = временный `is_guest` аккаунт (или общий guest-uuid).
- Убрать `telegram_*` таблицы и всю телеграм-терминологию из кода.
- Vocab-SRS переезжает в таблицу `vocab_progress` (durable, чинит потерю
  прогресса на Render).

## 5. 🧑 Выложить код + переключить окружение
- Запушить ветку с переписанным кодом (я подготовлю).
- Render → сервис бота → Environment → заменить `SUPABASE_URL` и
  `SUPABASE_SERVICE_KEY` на значения нового проекта; добавить, если нужно,
  `WEB_TOKEN_SECRET` (для подписи сессий, вместо APP_SECRET).
- Дождаться передеплоя.

## 6. 🧑 Проверить
- Регистрация → выход → вход тем же ником → прогресс на месте.
- Квиз RU/EL, карточки, словарь, статистика, история.

---

## Что это даёт
- Ноль зависимости от Lovable: своя база, свои ключи, своя схема.
- Ноль «кривых» телеграм-id: идентичность — `accounts.id` (UUID).
- Durable словарь (в БД, не в файле на эфемерном диске Render).
- Телеграм-бот (`src/index.ts` и команды) можно оставить на старой базе или
  тоже перевести — обсудим отдельно, чтобы не ломать работающего бота.

## Важное предупреждение
Пока это НЕ применено, всё работает на старой базе. Код-переключение (шаг 4–5)
я готовлю в отдельной ветке и оно уходит в прод только после шагов 1–3, иначе
сайт останется без данных.
