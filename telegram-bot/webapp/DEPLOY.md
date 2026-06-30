# Deploying the Hellas Study web app (PWA)

A static Vite SPA. Builds to `dist/`. Talks to the bot's public API on Render.

## Cloudflare Pages (recommended, free)
1. Push the repo to GitHub.
2. Cloudflare dashboard → Workers & Pages → Create → Pages → connect the repo.
3. Build settings:
   - **Root directory:** `telegram-bot/webapp`
   - **Build command:** `npm run build`
   - **Build output directory:** `dist`
4. **Environment variables** (Settings → Environment variables) — these are inlined at build time:
   - `VITE_API_BASE` = `https://hellas-flash-buddy-bot.onrender.com`
   - `VITE_APP_SECRET` = same value as the bot's `APP_SECRET` on Render
   - `VITE_USER_ID` = your numeric account id (e.g. `536879860`)
5. Deploy. SPA routing handled by `public/_redirects`.

## Vercel (alternative)
- Framework preset: Vite · Root directory: `telegram-bot/webapp` · same env vars.

## iPhone install (PWA)
Open the deployed URL in Safari → Share → **Add to Home Screen**. Launches
fullscreen with the brand icon, no browser chrome, no App Store, no certificates.

## Notes
- `VITE_APP_SECRET` is shipped in the client bundle (any web build is). Fine for a
  single personal account on an obscure URL; for true multi-user, move to a real
  per-user auth (e.g. Supabase Auth) before sharing publicly.
- Local dev: `npm run dev` (reads `.env`). Render free tier sleeps after ~15 min idle,
  so the first request after a while takes ~30–50s (skeletons show meanwhile).
