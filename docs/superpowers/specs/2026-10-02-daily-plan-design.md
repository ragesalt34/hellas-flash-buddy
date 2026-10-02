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
- New material counts in **any language** (`question_progress.first_seen_at`):
  a Greek-only rule made the plan impossible to complete in the Russian
  interface. The readiness report stays Greek-only. `first_seen_el_at` is still
  recorded (Greek quiz answers, flashcards in the Greek interface) for later use.
- Pace is judged on the day's target, so studying more never changes it.
- Card: "Today left ≈ N min", "Done X of Y" bar, a "done for today" state.

## Database (owner applies once in Supabase → SQL Editor)

```sql
alter table public.question_progress add column if not exists first_seen_el_at timestamptz;
alter table public.question_progress add column if not exists first_seen_at    timestamptz;
alter table public.vocab_progress   add column if not exists first_seen_at   timestamptz;
```

Until the columns exist the API keeps working: reads and writes probe for them
(`progressColumns.ts`, re-checked every 5 minutes), new-today counts are 0 and
any progress counts as covered.

## Known limit

Rows created before `first_seen_at` existed have no date, so they never count
as "new today" (correct for anything older than today).
