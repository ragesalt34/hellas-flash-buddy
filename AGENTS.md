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
- Known issue: `ELEVENLABS_API_KEY` on Render is a key ID, not an `sk_` key, so new audio cannot be synthesized; the server falls back to any cached clip of the same text.
