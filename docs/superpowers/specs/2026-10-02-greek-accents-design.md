# Greek accents, illustration packs and motion — design

Date: 2026-10-02. Web app `telegram-bot/webapp` (round theme only) + API `telegram-bot/src`.

## Goal

The site should read at a glance as a Greek-learning product: Greek illustration
on every screen, Greek words in the interface itself, and quiet motion that makes
the pages feel alive without distracting from study. Premium, saturated, never
clip-art.

## Part 1 — Illustration packs (assets from the owner, composition by us)

The owner generates asset sheets in ChatGPT from our prompts; we cut them out
(alpha already present or keyed) and lay them out.

| Pack | Used on | Composition |
|------|---------|-------------|
| `culture` | quiz scene for Culture | `SCENES` in `topicScenes.tsx`: vignette top-left, pair bottom-left, object top-right, object lower right, band under card, two accents |
| `laws` | quiz scene for Laws | same |
| `geography` | quiz scene for Geography | same |
| `rewards` | quiz result, flashcard/vocab/homework finish, Progress hero | wreath behind score, one object each side of the result card (desktop only) |
| `landing` | landing hero | watercolour panorama replacing the flat SVG one |

Perspective rules for every pack: light from top-left; objects turned towards the
centre column; one shared horizon line per scene; nothing overlaps content
(measured, as for History); scenes hide below 900px except the band.

## Part 2 — Motion (code only)

All motion is slow, small and decorative; `prefers-reduced-motion: reduce`
switches every animation off.

- Olive branches in scenes sway ±2° over 6–9 s, phase-shifted.
- Scene parallax on desktop with a fine pointer: the scene layer shifts up to
  8 px against the cursor (CSS variables `--px`/`--py` on `body`, set by one
  pointer listener in `App.tsx`).
- Quiz: a correct answer releases a short burst of laurel leaves from the
  chosen option (CSS-only, 700 ms); a wrong one shakes the card once (300 ms).
- The oil lamp (streak) flame flickers; the meander progress bar draws in.
- Finish screens: the wreath grows in, the number counts up.

## Part 3 — Greek in the interface

- Section eyebrows carry the Greek word next to the Russian one in RU mode
  ("Обучение · Μάθηση"), from i18n (`*.el` of the same key).
- Home: a "Word of the day" card — Greek word, transcription-free, Russian
  meaning, note, speak button. Picked on the server, deterministic per calendar
  day in the account's time zone (`pickWordOfDay(dayKey, words)`), returned in
  `GET /api/me` as `wordOfDay`. Speech uses the existing `vocab_<id>` clips.

## Testing

`pickWordOfDay` unit tests (deterministic, in range, changes day to day).
Browser: every screen at 375 / 838 / 1440 px, no overlap of decoration with
content, no horizontal scroll, reduced-motion check.
