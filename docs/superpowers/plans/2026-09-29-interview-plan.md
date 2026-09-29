# Interview-Date Study Plan Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let a signed-in learner set their interview date and see, every day, how much to study to be ready by then.

**Architecture:** A pure `computePlan` turns counts (unseen/due questions and words) plus the date into today's targets; `loadPlan` reads those counts and the stored date; `/api/me` and `/api/readiness` return `plan`, `PUT /api/account/interview-date` stores it; Home shows a plan card, Stats a one-line on-track verdict.

**Tech Stack:** Node 24 + tsx, Express 5, Supabase JS, React 18 + Vite, `node:test`.

**Spec:** `docs/superpowers/specs/2026-09-29-interview-plan-design.md`

## Global Constraints

- Column `accounts.interview_date date`, applied by the owner (SQL in the spec). Until it exists, `loadPlan` treats the date as unset instead of failing.
- Guests cannot set a date: API 403 `{ error: 'guest' }`.
- Seconds per item: new question 40, question review 15, new word 15, word review 8.
- Buffer = min(21, floor(daysLeft × 0.15)); pace judges only new material: 10 / 20 minutes (reviews count toward today's minutes, not pace).
- Pure module `src/services/plan.ts` must not import `../supabase`.
- RU + EL strings in `webapp/src/i18n.tsx`; both themes.

---

### Task 1: Pure plan computation

**Files:** Create `telegram-bot/src/services/plan.ts`, `telegram-bot/src/services/plan.test.ts`

**Produces:** `computePlan(input: PlanInput): StudyPlan`, types `PlanInput`, `StudyPlan`, `PlanPhase`, `PlanPace`, const `PLAN_SECONDS`.

- [ ] Step 1 — tests (`plan.test.ts`):

```ts
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { computePlan, type PlanInput } from './plan';

const base: PlanInput = {
  interviewDate: null, today: '2026-09-29',
  totalQuestions: 163, seenQuestions: 3, totalWords: 150, seenWords: 10,
  dueCards: 12, dueWords: 5,
};

test('no date: only reviews, phase none', () => {
  const p = computePlan(base);
  assert.equal(p.phase, 'none');
  assert.equal(p.pace, 'none');
  assert.equal(p.newQuestions, 0);
  assert.equal(p.minutes, Math.ceil((12 * 15 + 5 * 8) / 60));
});

test('date in the past', () => {
  const p = computePlan({ ...base, interviewDate: '2026-09-01' });
  assert.equal(p.phase, 'past');
  assert.equal(p.daysLeft, -28);
});

test('six months out: material spread over learning days, 21-day buffer', () => {
  const p = computePlan({ ...base, interviewDate: '2027-03-29' });
  assert.equal(p.daysLeft, 181);
  assert.equal(p.phase, 'learn');
  assert.equal(p.newQuestions, 1); // 160 unseen / 160 learning days
  assert.equal(p.newWords, 1); // ceil(140 / 160)
  assert.equal(p.minutes, Math.ceil((40 + 12 * 15 + 15 + 5 * 8) / 60));
  assert.equal(p.pace, 'calm');
  assert.equal(p.finishNewBy, '2027-03-08');
});

test('short runway: buffer is 15% of the days left', () => {
  const p = computePlan({ ...base, interviewDate: '2026-10-19' }); // 20 days
  assert.equal(p.finishNewBy, '2026-10-16'); // buffer 3
  assert.equal(p.newQuestions, Math.ceil(160 / 17));
});

test('final phase with unseen material is behind; without it is final', () => {
  const today = computePlan({ ...base, interviewDate: '2026-09-29' });
  assert.equal(today.phase, 'final');
  assert.equal(today.pace, 'behind');
  assert.equal(today.newQuestions, 160);
  const covered = computePlan({ ...base, interviewDate: '2026-09-29', seenQuestions: 163, seenWords: 150 });
  assert.equal(covered.pace, 'final');
});

test('pace thresholds and done', () => {
  assert.equal(computePlan({ ...base, interviewDate: '2027-03-29', dueCards: 70 }).pace, 'tight');
  assert.equal(computePlan({ ...base, interviewDate: '2027-03-29', dueCards: 130 }).pace, 'behind');
  assert.equal(computePlan({ ...base, interviewDate: '2027-03-29', seenQuestions: 163, seenWords: 150 }).pace, 'done');
});
```

- [ ] Step 2 — run `cd telegram-bot && npx tsx --test src/services/plan.test.ts` → fails (module missing).
- [ ] Step 3 — implement `plan.ts`:

```ts
export type PlanPhase = 'none' | 'past' | 'learn' | 'final';
export type PlanPace = 'none' | 'done' | 'final' | 'behind' | 'tight' | 'calm';

export interface PlanInput {
  interviewDate: string | null;
  today: string;
  totalQuestions: number;
  seenQuestions: number;
  totalWords: number;
  seenWords: number;
  dueCards: number;
  dueWords: number;
}

export interface StudyPlan {
  date: string | null;
  daysLeft: number | null;
  phase: PlanPhase;
  pace: PlanPace;
  newQuestions: number;
  newWords: number;
  reviews: { cards: number; words: number };
  unseen: { questions: number; words: number };
  minutes: number;
  finishNewBy: string | null;
}

export const PLAN_SECONDS = { newQuestion: 40, reviewQuestion: 15, newWord: 15, reviewWord: 8 } as const;
const DAY_MS = 86_400_000;
const dayNumber = (key: string) => {
  const [y, m, d] = key.split('-').map(Number);
  return Date.UTC(y, m - 1, d) / DAY_MS;
};
const dayKey = (n: number) => new Date(n * DAY_MS).toISOString().slice(0, 10);

export function computePlan(i: PlanInput): StudyPlan {
  const unseen = {
    questions: Math.max(0, i.totalQuestions - i.seenQuestions),
    words: Math.max(0, i.totalWords - i.seenWords),
  };
  const reviews = { cards: i.dueCards, words: i.dueWords };
  const minutesFor = (q: number, w: number) =>
    Math.ceil(
      (q * PLAN_SECONDS.newQuestion +
        reviews.cards * PLAN_SECONDS.reviewQuestion +
        w * PLAN_SECONDS.newWord +
        reviews.words * PLAN_SECONDS.reviewWord) /
        60
    );
  const idle = { date: i.interviewDate, unseen, reviews, newQuestions: 0, newWords: 0, minutes: minutesFor(0, 0), finishNewBy: null };
  if (!i.interviewDate) return { ...idle, daysLeft: null, phase: 'none', pace: 'none' };
  const daysLeft = dayNumber(i.interviewDate) - dayNumber(i.today);
  if (daysLeft < 0) return { ...idle, daysLeft, phase: 'past', pace: 'none' };

  const buffer = Math.min(21, Math.floor(daysLeft * 0.15));
  const learnDays = daysLeft - buffer;
  const spread = learnDays > 0 ? learnDays : Math.max(1, daysLeft);
  const newQuestions = unseen.questions ? Math.ceil(unseen.questions / spread) : 0;
  const newWords = unseen.words ? Math.ceil(unseen.words / spread) : 0;
  const minutes = minutesFor(newQuestions, newWords);
  const phase: PlanPhase = learnDays > 0 ? 'learn' : 'final';
  const left = unseen.questions + unseen.words;
  const pace: PlanPace =
    left === 0 ? (phase === 'final' ? 'final' : 'done')
    : phase === 'final' || minutes > 30 ? 'behind'
    : minutes > 15 ? 'tight'
    : 'calm';
  return {
    date: i.interviewDate, daysLeft, phase, pace, newQuestions, newWords, reviews, unseen, minutes,
    finishNewBy: dayKey(dayNumber(i.interviewDate) - buffer),
  };
}
```

- [ ] Step 4 — tests pass; `npx tsc --noEmit` clean. Step 5 — commit "Add pure interview-plan computation".

### Task 2: Loader, API, client

**Files:** Create `telegram-bot/src/services/planService.ts`; modify `src/api/server.ts` (`/me`, `/readiness`, new `PUT /account/interview-date`), `webapp/src/api.ts`.

**Consumes:** `computePlan`, `StudyPlan`; `dayKeyIn`, `isValidTimeZone` from `sessionService`; `VOCABULARY`.
**Produces:** `loadPlan(accountId, tz, now?) → Promise<StudyPlan>`, `setInterviewDate(accountId, date | null)`; client `api.setInterviewDate(date)`, `StudyPlan` type, `plan` on `MeResponse` and `ReadinessResponse`.

- [ ] `planService.ts`: reads `accounts.interview_date` (error → null), `questions` count, `question_progress.next_review_at`, `vocab_progress (vocab_id, next_review_at)` filtered to known vocab ids; due = `next_review_at <= now`; `today = dayKeyIn(now, zone)`; returns `computePlan(...)`. `setInterviewDate` updates `accounts` by id and throws on error.
- [ ] Route: guest → 403 `guest`; body `date` must be `null` or `/^\d{4}-\d{2}-\d{2}$/` between today and today + 3 years (400 otherwise); responds `{ plan }`.
- [ ] `/me` and `/readiness` add `plan: await loadPlan(a.id, getTz(req))` (in their `Promise.all`).
- [ ] Smoke-test `loadPlan` against the DB (read-only); `tsc` both packages; commit "Serve the interview plan and store the date".

### Task 3: Home plan card and Stats line

**Files:** Create `webapp/src/screens/PlanCard.tsx`; modify `Home.tsx`, `Stats.tsx`, `i18n.tsx` (strings + `countWord` kinds `newQuestion`, `newWord`, `review`), `components/homeArt.tsx` (`Hourglass` drawing), `styles.css`.

- [ ] PlanCard states: guest (explain + sign-in), no date / past (explain + `<input type="date">` with min today, max +3 years, Save), set (days left, date, "today ≈ N min", breakdown, pace line, finish-new-by line, buttons Flashcards / Vocabulary, "change date" toggling the editor with Save and Clear). Saving calls `api.setInterviewDate` then reloads `me`.
- [ ] Stats: under the verdict hint, when `plan.date` and phase is `learn`/`final`: on track (`pace !== 'behind'`) or not, with the formatted date.
- [ ] Browser: set / change / clear the date on a test account; guest prompt; 375 px and 1280 px; both themes. Commit "Add the interview plan card".
