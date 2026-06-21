# Hellas Study — Telegram Mini App

Στυλιζαρισμένο Telegram Mini App пове́рх того же бота: те же вопросы, та же SRS-логика, тот же Supabase.

## Архитектура

```
Telegram client
   │  открывает (web_app кнопка / menu button)
   ▼
cloudflared tunnel  ──HTTPS──►  Vite dev (5173)
                                   │  /api/* proxy
                                   ▼
                              bot Express API (3001)  ──►  Supabase + сервисы бота
```

- **`webapp/`** — Vite + React + TS фронт. Тема берётся из Telegram (`themeParams`), бренд-акцент — греческий синий. Экраны: Home, Quiz, Flashcards, Vocab, Stats.
- **`src/api/`** — Express API в процессе бота.
  - `auth.ts` — валидация Telegram `initData` (HMAC по `BOT_TOKEN`).
  - `server.ts` — эндпоинты, переиспользующие `questionService` / `sessionService` / `vocabProgressService` / `userService`. В проде отдаёт `webapp/dist`.
- API стартует из `index.ts` (`startApiServer`, порт `API_PORT`, по умолчанию 3001).

## Эндпоинты (все требуют валидный initData в заголовке `X-Telegram-Init-Data`)

| Метод | Путь | Назначение |
|------|------|-----------|
| GET  | `/api/me` | профиль + стрик + сводка |
| GET  | `/api/quiz?topic=&limit=` | вопросы с перемешанными вариантами |
| POST | `/api/quiz/complete` | записать сессию + прогресс |
| GET  | `/api/flashcards` | due-карточки (SRS) |
| POST | `/api/flashcards/grade` | оценка карточки |
| GET  | `/api/vocab` | due-слова |
| POST | `/api/vocab/grade` | оценка слова |
| GET  | `/api/stats` | полная статистика |
| GET  | `/api/history` | последние 10 квизов |

## Запуск (dev)

Нужно **3 процесса**. Туннель trycloudflare эфемерный — при каждом перезапуске даёт новый URL, поэтому бот стартует последним с актуальным `WEBAPP_URL`.

```bash
# 1) фронт
cd webapp && npm install && npm run dev          # http://localhost:5173

# 2) туннель (в корне telegram-bot)
./cloudflared.exe tunnel --url http://localhost:5173 --no-autoupdate
#    → скопировать https://<...>.trycloudflare.com

# 3) бот + API (тот же URL!)
WEBAPP_URL="https://<...>.trycloudflare.com" npm run dev
```

В Telegram: открыть `@HellasStudy_bot` → кнопка меню «🚀 Εφαρμογή», либо `/start` → «🚀 Άνοιξε την εφαρμογή», либо `/app`.

### Локальный тест API без Telegram
Запустить бот с `ALLOW_DEV_AUTH=true` и слать заголовок `X-Dev-User-Id: <id>` (или `?devUserId=`).
**Не включать в проде** — туннель публичный.

## Прод

```bash
cd webapp && npm run build      # webapp/dist
# бот с NODE_ENV=production + WEBHOOK_URL отдаёт и API, и dist на одном origin
```

## Переменные окружения

| Var | Назначение |
|-----|-----------|
| `BOT_TOKEN` | токен бота (нужен и для валидации initData) |
| `SUPABASE_URL`, `SUPABASE_SERVICE_KEY` | доступ к БД |
| `WEBAPP_URL` | публичный HTTPS-URL мини-аппа (кнопки бота) |
| `API_PORT` | порт API (по умолчанию 3001) |
| `ALLOW_DEV_AUTH` | `true` — разрешить dev-обход авторизации (только локально) |
