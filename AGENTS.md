# Hellas Study — agent guide

Prep app for the Greek citizenship interview. Live at https://hellas.study.
Talk to the owner in Russian.

## Where the real code is

- `telegram-bot/webapp/` — **the web app** (React 18 + TS + Vite). Deployed to Cloudflare Pages.
  - `src/screens/` — Home, Quiz, Flashcards, Vocab, Stats (interview readiness), Landing, Auth
  - `src/styles.css` — all styling; two themes via `data-theme` (`soft`, `brut`). New styling is scoped `[data-theme='soft'] .<screen>-screen`; decorative elements carry `.hs-deco` (hidden in `brut`).
  - `src/i18n.tsx` — every UI string, RU + EL. Never hard-code text.
  - `src/api.ts` — API client (`VITE_API_BASE`).
- `telegram-bot/src/` — **the API** (Express 5 + Supabase), deployed on Render (`hellas-flash-buddy-bot.onrender.com`).
  - `api/server.ts` routes, `services/*` logic, `srs.ts` spaced-repetition levels, `data/vocabulary.ts` 150 words.
  - `services/readiness.ts` — pure readiness computation (tested).
  - `services/ttsService.ts` — ElevenLabs pronunciation, cached in Supabase storage `tts-audio`.
- Root `src/`, `mobile/`, `supabase/migrations` — older/other projects. Do not edit unless asked.

## Copies and folders on this PC

Several copies of the project exist; check which one you are in before editing.

- `C:/Users/user/Desktop/hellas-flash-buddy` — the main clone (remote `ragesalt34/hellas-flash-buddy`). Its branch is not always `main`: it was on `game/godot-2d` with unrelated uncommitted work (`mobile/`, game, homework AI) when this was written. Run `git branch --show-current` and `git status` first, and never mix that work into a commit for something else.
- `C:/Users/user/.codex/worktrees/blue-pureplay/hellas-flash-buddy` — a git worktree with `main` checked out (a branch can only be checked out in one worktree). Web-app design work is committed here; its Vite dev server is `http://127.0.0.1:5173`.
- `C:/Users/user/Desktop/Hellas Study Bot` — the owner's launcher (portable Node + autostart), not a git repo. Port 3001 is its; never kill it.
- `C:/Users/user/Downloads/hellas-flash-buddy-main` — a scratch working directory for assistant sessions, not a repo. Real edits go to one of the copies above.
- `design-handoff/` (main clone, untracked) — design packages from Codex. One folder per package (`<name>-v1`, with its README and CLAUDE_PROMPT.md); the original zips are in `design-handoff/_архив/`. Not part of any build.
- `telegram-bot/game`, `telegram-bot/game2d` — separate game projects (branches `game/*`); not part of the web app or the API.
- `telegram-bot/.git` is a stale nested repo ("Initial commit"). Commit from the repository root, not from inside `telegram-bot`.
- Local-only files in `telegram-bot/` that `.gitignore` keeps out of git: `_tunnel.bat`, `_tunnel.vbs`, `cloudflared.exe`, `tunnel.log`, `vocab_progress.json`. They belong to the old temporary tunnel / bot setup; leave them where they are, since the scripts call each other by relative name.

## Run and check

```bash
cd telegram-bot/webapp && npm install && npm run dev   # http://localhost:5173, uses the Render API
cd telegram-bot && npx tsc --noEmit                   # API types
cd telegram-bot/webapp && npx tsc --noEmit && npm run build
cd telegram-bot && npx tsx --test src/services/readiness.test.ts
```

Local API: `cd telegram-bot && API_PORT=3002 npx tsx src/index.ts`, with
`webapp/.env.development.local` setting `VITE_API_BASE=http://localhost:3002`.
Port 3001 is taken by the owner's own launcher (`Desktop\Hellas Study Bot`) — never kill it.
Delete `.env.development.local` when done.

## Rules

- Keep existing functionality; redesigns change looks, not logic, unless asked.
- Check UI changes in a browser at desktop (≥1440px) and phone (375px): no horizontal scroll, decor never overlaps content.
- Commit to `main` with clear messages. **Do not push** — the owner pushes via GitHub Desktop.
- Never print or commit secrets from `.env`. Database schema changes are applied by the owner in the Supabase dashboard.
- Homework mode (tutor's notes -> questions -> answer check): routes `/api/homework/*`, pure helpers in `services/homework.ts`, Gemini calls in `services/homeworkAi.ts`. Works without AI (heuristic parser + word-overlap check); with `GEMINI_API_KEY` on Render (paid tier — the free tier gets 503 "high demand" at peak) plus optional `GEMINI_PARSE_MODEL` (default `gemini-3.1-pro-preview`) and `GEMINI_MODEL` (answer checks, default `gemini-3.8-flash`); each falls back to other flash models on 404/429/5xx/timeout, signed-in accounts get AI parsing and teacher-style checks. Sets are stored in the browser (`hs_homework_v1`), no DB table.
- Known issue: `ELEVENLABS_API_KEY` on Render is a key ID, not an `sk_` key, so new audio cannot be synthesized; the server falls back to any cached clip of the same text.
