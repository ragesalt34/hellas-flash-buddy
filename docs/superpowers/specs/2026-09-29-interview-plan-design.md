# Interview-date study plan — design

Date: 2026-09-29. Web app (`telegram-bot/webapp`) + API (`telegram-bot/src`).

## Goal

The learner sets the date of their citizenship interview. Every day the app
says how much to do today (new questions, new words, reviews, minutes) so that
all material is covered before the date, and whether the pace is realistic.

## Storage

`accounts.interview_date date` (nullable). The owner applies:

```sql
alter table public.accounts add column if not exists interview_date date;
```

Guests share one sandbox account, so a guest cannot set a date (API returns
403 `guest`); the UI asks them to sign in.

## Plan (pure, recomputed on every request)

Inputs: `interviewDate | null`, `today` (YYYY-MM-DD in the account's time
zone), `totalQuestions`, `seenQuestions` (rows in `question_progress`),
`totalWords`, `seenWords` (rows in `vocab_progress`), `dueCards`, `dueWords`.

- `daysLeft` = calendar days from today to the date.
- `buffer` = min(21, floor(daysLeft × 0.15)) review-only days; `learnDays` = daysLeft − buffer.
- unseen = total − seen, per kind.
- new per day = ceil(unseen / learnDays); when learnDays ≤ 0 and material is
  still unseen, ceil(unseen / max(1, daysLeft)).
- minutes = ceil((newQ·40 + dueCards·15 + newW·15 + dueWords·8) / 60).
- `phase`: `none` (no date) · `past` (date passed) · `learn` · `final` (learnDays ≤ 0).
- `pace`: `done` (nothing unseen) · `final` (final phase, nothing unseen) ·
  `behind` (minutes > 30, or final phase with unseen material) · `tight`
  (15 < minutes ≤ 30) · `calm` (≤ 15).
- `finishNewBy` = date − buffer days.

## API

- `GET /api/me` and `GET /api/readiness` gain `plan` (shape above plus `date`).
- `PUT /api/account/interview-date` `{ date: 'YYYY-MM-DD' | null }` — date must
  be today or later and within 3 years; guests get 403.

## UI

- Home, under the greeting card: "Plan to the interview".
  - No date: short explanation and a date field ("Set the date").
  - Guest: explanation and a sign-in button instead of the field.
  - With a date: days left, "today ≈ N min", the breakdown
    (new questions · new words · reviews), pace line, buttons to Flashcards and
    Vocabulary, and a link to change/clear the date.
- Stats verdict card: one line — on track / not on track for <date>.
- RU + EL strings; round and square themes.

## Testing

`plan.test.ts` (node:test): no date; past date; normal learn phase maths;
final phase with and without unseen material; pace thresholds; buffer cap at
21 days. Browser pass: set/change/clear the date on an account, guest prompt,
375 px and 1280 px.
