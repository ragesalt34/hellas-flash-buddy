# Hellas Metroidvania — design

Date: 2026-10-05
Status: approved by user ("делаем все как считаешь нужным")

## Goal

A side-view 2D metroidvania for PC that the user plays every day to learn Greek
and prepare for the citizenship-interview exam. Learning is driven by the same
SRS queue as the web app, so daily play counts as daily review.

Learning focus: Greek vocabulary and the 163 exam questions, roughly equal weight.

## Scope of v1 (vertical slice)

- One zone, about 12 rooms: Piraeus (start) -> Plaka -> Agora -> Acropolis (boss).
- Placeholder art: coloured rectangles and simple shapes drawn in code. No assets.
- PC only: keyboard (gamepad later). Shipped as a Tauri 2 `.exe`; also runs in the
  browser via the Vite dev server for development.
- Out of scope: real art, sound/music, more zones (Crete, Meteora), gamepad,
  touch controls, cloud saves of world progress.

## Architecture

New standalone app at `telegram-bot/game/` (Vite + React 18 + TypeScript + Phaser 3),
with its own `package.json`. It does not live inside the web app bundle.

### Shared code

`vite.config.ts` and `tsconfig.json` define an alias `@shared` -> `../webapp/src`.
The game imports only these modules from the web app:

- `api.ts` (the `api` object, `clearCache`, types `Flashcard`, `VocabCard`, `MeResponse`)
- `auth.ts` (token storage)
- `speech.ts` (`speakGreek`, `textKey`, `hasGreek`)
- `i18n.tsx` (`t`, `getStoredLanguage`, `Language`)

`envDir` points at `../webapp`, so the game reuses the web app's `.env`
(`VITE_API_BASE`, `VITE_APP_SECRET`). Nothing is copied.

### Backend

No backend changes. The game uses existing endpoints:

| Need | Endpoint |
|---|---|
| Account, streak | `GET /api/me` |
| Exam questions due | `GET /api/flashcards` -> `Flashcard[]` (no options) |
| Words due | `GET /api/vocab` -> `VocabCard[]` |
| Grade exam answer | `POST /api/flashcards/grade` (grade 3 correct / 1 wrong) |
| Grade word | `POST /api/vocab/grade` (grade 3 correct / 1 wrong) |
| Login / register | `POST /api/auth/login`, `/api/auth/register` |

Flashcards and vocab cards have no answer options, so the game builds
multiple-choice options client-side: the correct answer plus 3 distractors taken
from other cards in the same pool (same topic first, then any), deduplicated.
The pool is every card of that kind fetched today (up to 20 per kind), not
just the remaining queue; word distractors come from words, exam distractors
from exam answers. If fewer than 3 distractors exist, show 2–3 options instead of 4.

### Layers

1. **Phaser (`src/world/`)** — scenes, rooms, physics, player, enemies, camera.
   Knows nothing about learning.
2. **Learning (`src/learning/`)** — plain TypeScript, no Phaser or React.
   Builds the daily queue, hands out the next challenge, builds options,
   sends grades, handles offline buffering.
3. **React overlay (`src/ui/`)** — rendered over the canvas: question dialog,
   HUD, pause menu, login screen, loading screen. Uses `speech.ts` and `i18n`.

Layers talk only through a typed event bus (`src/bus.ts`), for example:

- world -> ui: `challenge:request { source: 'altar' | 'shield' | 'amphora' | 'boss', kind: 'word' | 'exam' | 'any', id }`
- ui -> world: `challenge:result { id, correct }`
- world -> ui: `hud:update { hp, maxHp, abilities }`

While a dialog is open the Phaser scene is paused.

### Saves

World progress (abilities, opened rooms, collected amphorae, checkpoint room,
boss defeated) lives in `localStorage` under `hs_game_save_<accountId>`.
In the Tauri build this is the webview's persistent storage. Learning progress
is on the server only.

Because the Tauri origin differs from `pages.dev`, the user logs in once inside
the game (login screen reuses `api.login` / `api.register`; guest mode allowed).

## Gameplay

### Controls

A/D or arrows — move. Space — jump. J — attack. K — dash. E — interact.
1–4 — choose an answer. Esc — pause. F11 — fullscreen (Tauri).

### Abilities and gates

| Ability | Source | Gate it opens |
|---|---|---|
| Sword attack | start | breakable walls (also used in combat) |
| Dash | Altar in Plaka: 3 correct **word** answers | wide gaps |
| Double jump | Altar in Agora: 3 correct **exam** answers | high ledges |
| +1 heart | Amphora caches (4 total): 1 correct answer each | — |

### Enemies

- **Slime** — plain enemy, no questions. Contact damage, dies in 2 hits.
- **Shield-bearer** — carries a shield with a Greek word. Press E near it to get
  a translation question. Correct: shield drops, dies in 1 hit. Wrong: shield
  stays, takes 4 hits.
- **Sphinx (boss, Acropolis)** — 3 phases. Between phases, 3 exam questions
  (history/laws topics first); each correct answer removes 10% of the boss's HP.

### Daily loop

- On start the game loads today's queue from `/api/flashcards` and `/api/vocab`
  (each returns up to 20 due cards; unseen cards have `level` 0 or no level).
  Reviews (level >= 1) all go in; new cards are capped at 5 per pool.
- Every challenge takes the next item of the matching kind from the queue.
- When the queue is empty, challenges draw from today's already-answered
  cards in practice mode: answers are **not** graded to the server, so SRS
  intervals are not disturbed.
- HUD shows "Сегодня: done/total" and the streak from `/api/me`.

### Wrong answers

A wrong answer never costs HP or progress. The object cools down for 30 s, the
item goes back to the end of the queue, and the correct answer is shown with
its explanation (if any) and Greek audio.

## Error handling

- Backend asleep (Render free tier, up to ~50 s): loading screen with retries
  every 5 s, up to 90 s.
- Backend unreachable after that: play from the last cached queue
  (`localStorage`). Grades are buffered in `localStorage` (per account) and
  flushed on start and every 60 s once the API answers again.
- 401 with a stale token: handled by the shared `api.ts` (falls back to guest).
- TTS failures stay silent (existing `speech.ts` behaviour).

## Testing

- Vitest unit tests for `src/learning/`: queue building, new-item cap,
  requeue after wrong answer, empty queue -> practice mode (no grading),
  distractor building (no duplicates, correct answer present, fallback when the
  pool is small), offline grade buffering and flush.
- World: manual play in the browser via the Vite dev server; check console for
  errors.
- Release: `tauri build` produces the `.exe`; smoke-test launch, login, one altar.

## Build and run

- Dev: `cd telegram-bot/game && npm run dev` (port 5174).
- Exe: `npm run tauri build` (needs Rust + MSVC build tools, installed once).
