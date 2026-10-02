# Daily plan that counts down — design

Date: 2026-10-02. API `telegram-bot/src`, web app `telegram-bot/webapp`.

## Problem

"Today ≈ N min" counted everything due at that second. Learning new material
schedules it again in 10–60 minutes, so studying made the day's load grow
(63 → 102 reviews after a session).

## Rules

- "Today" is the account's calendar day (its time zone).
- Reviews left = progress rows due by the end of today and **not touched today**.
  Anything touched today is done; its same-day comeback is part of the session,
  not of the plan.
- New material target is fixed at the start of the day:
  `target = ceil(unseenAtDayStart / learnDays)`, `unseenAtDayStart = unseenNow + firstSeenToday`.
  Left = target − first seen today.
- A question counts as covered once seen **in Greek** (same rule as readiness):
  `question_progress.first_seen_el_at`, plus Greek answers in past quizzes.
  Flashcards graded in the Greek interface and Greek quiz answers set it.
- Pace is judged on the day's target, so studying more never changes it.
- Card: "Today left ≈ N min", "Done X of Y" bar, a "done for today" state.

## Database (owner applies once in Supabase → SQL Editor)

```sql
alter table public.question_progress add column if not exists first_seen_el_at timestamptz;
alter table public.vocab_progress   add column if not exists first_seen_at   timestamptz;
```

Until the columns exist the API keeps working: reads and writes probe for them
(`progressColumns.ts`, re-checked every 5 minutes), new-today counts are 0 and
any progress counts as covered.

## Known limit

Flashcard grades made before the columns existed carry no language, so those
questions count as covered in Greek only after the next Greek answer (quiz
history is used where it exists).
