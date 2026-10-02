# Greek Accents, Packs and Motion Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make every screen read as a Greek-learning product: Greek words in the UI, a Word of the day, quiet motion, and per-screen watercolour packs.

**Architecture:** A pure `pickWordOfDay` on the server feeds `/api/me`; Home renders a card. Motion is CSS keyframes scoped to `[data-theme='soft']` plus one pointer listener that sets `--px/--py` on `body`. Packs plug into the existing `SCENES` config of `topicScenes.tsx` and a new `RewardArt` piece for finish screens.

**Tech Stack:** Node 24 + tsx + node:test, Express 5, React 18 + Vite, plain CSS.

**Spec:** `docs/superpowers/specs/2026-10-02-greek-accents-design.md`

## Global Constraints

- Round theme only: every new rule is under `[data-theme='soft']`; decorative nodes carry `.hs-deco`.
- `prefers-reduced-motion: reduce` disables every new animation.
- No decoration may overlap content (measured at 375 / 838 / 1440 px); no horizontal scroll.
- RU + EL strings in `src/i18n.tsx`.

---

### Task 1: Word of the day (server)

**Files:** Create `telegram-bot/src/services/wordOfDay.ts`, `telegram-bot/src/services/wordOfDay.test.ts`; modify `telegram-bot/src/api/server.ts` (`GET /me`).

**Produces:** `pickWordOfDay(dayKey: string, items: VocabItem[]): VocabItem`; `/api/me` gains `wordOfDay: { id, word, ru, note }`.

- [ ] Test:

```ts
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { pickWordOfDay } from './wordOfDay';
import { VOCABULARY } from '../data/vocabulary';

test('same day, same word; in range', () => {
  const a = pickWordOfDay('2026-10-02', VOCABULARY);
  assert.equal(a.id, pickWordOfDay('2026-10-02', VOCABULARY).id);
  assert.ok(VOCABULARY.includes(a));
});
test('changes across a week', () => {
  const ids = new Set(['01','02','03','04','05','06','07'].map((d) => pickWordOfDay(`2026-10-${d}`, VOCABULARY).id));
  assert.ok(ids.size >= 6);
});
```

- [ ] Implement: day number since epoch (UTC date of the key) × a stride coprime with the list length, modulo length.
- [ ] `/me`: `wordOfDay: pick(dayKeyIn(new Date(), getTz(req)))` reduced to `{ id, word, ru, note }`.
- [ ] Run `npx tsx --test src/services/*.test.ts`, `npx tsc --noEmit`; commit.

### Task 2: Word of the day card + Greek eyebrows (client)

**Files:** Create `webapp/src/screens/WordOfDay.tsx`; modify `webapp/src/api.ts` (`MeResponse.wordOfDay`), `Home.tsx`, `Quiz.tsx`/`Stats.tsx` section labels, `i18n.tsx`, `styles.css`.

- [ ] Card: Greek word (Manrope 800), speak button (`speakGreek(word, 'vocab_' + id)`), RU meaning, note, eyebrow «Слово дня · Λέξη της ημέρας», meander corner.
- [ ] `SectionLabel` helper: in RU mode renders `ru · el` (el muted); EL mode renders el only.
- [ ] Browser check at 375 / 1440; commit.

### Task 3: Motion layer

**Files:** modify `webapp/src/App.tsx` (pointer listener), `webapp/src/screens/Quiz.tsx` (feedback classes + leaf burst), `styles.css`.

- [ ] Keyframes: `hs-sway` (olive ±2°, 7 s), `hs-shimmer` (sea), `hs-flicker` (lamp flame), `hs-shake` (wrong option, 300 ms), `hs-burst` (6 leaves from the correct option, 700 ms), `hs-grow` (finish wreath).
- [ ] Parallax: `body` gets `--px/--py` in −1..1 from a single `pointermove` listener (fine pointer only, rAF-throttled); `.topic-scene`, `.home-decor` translate by up to 8 px.
- [ ] All under `@media (prefers-reduced-motion: no-preference)`; commit.

### Task 4: Packs (needs the owner's sheets)

**Files:** `webapp/public/assets/topics/{culture,laws,geography}/*.webp`, `webapp/public/assets/rewards/*.webp`, `topicScenes.tsx` (`SCENES` entries), finish screens.

- [ ] Prompts for ChatGPT delivered to the owner (same style block as History/Homework).
- [ ] On arrival: cut with the alpha pipeline, add `SCENES.culture/laws/geography`, measure overlaps at 1750/1440/1280, commit per pack.
