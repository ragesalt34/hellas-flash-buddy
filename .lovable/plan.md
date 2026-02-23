

# Statistics and Progress Tracking

## Problem
Currently only study **time** is tracked. Quiz and Flashcard results are displayed during the session but never saved to the database. The `user_progress` table exists but nothing writes to it. Only Exam results are persisted.

## Solution

### 1. Save Quiz results after each answer
After each answer in Quiz mode, upsert a record to `user_progress` with `correct_count` / `incorrect_count` incremented. This gives per-question accuracy data across all sessions.

### 2. Save Flashcard results (know/don't know)
When the user clicks "Know" or "Don't Know" in Flashcards, upsert `user_progress` similarly -- "Know" increments `correct_count`, "Don't Know" increments `incorrect_count`, and "Know" sets `is_known = true`.

### 3. Create a dedicated `/stats` page
A new page at `/stats` (linked from the header stats icon) with:

- **Overall accuracy** -- % correct across all quiz + flashcard answers
- **Questions mastered** -- count of questions marked `is_known`
- **Total questions answered** -- sum of all attempts
- **Study streak** -- consecutive days with activity (from `study_sessions`)
- **Study time widget** (existing component, moved here)
- **Accuracy by topic** -- bar chart showing % correct per topic (history, culture, laws, geography)
- **Exam history chart** -- existing progress chart from Profile (last 10 exams)
- **Recent activity feed** -- last 7 days of sessions with type and duration

### 4. Update header stats button
Change the stats icon link from `/profile` to `/stats`.

---

## Technical Details

### Files to modify:
- **`src/pages/Quiz.tsx`** -- add `upsertProgress()` call in `handleAnswer()` to save correct/incorrect to `user_progress`
- **`src/pages/Flashcards.tsx`** -- add `upsertProgress()` call in `handleKnow()` / `handleDontKnow()` to save to `user_progress`
- **`src/pages/Stats.tsx`** (new) -- dedicated stats page querying `user_progress`, `study_sessions`, and `exam_results`
- **`src/components/layout/Header.tsx`** -- change stats icon link to `/stats`
- **`src/App.tsx`** -- add `/stats` route

### Progress upsert logic (shared helper):
```text
upsert into user_progress:
  - match on (user_id, question_id)
  - on conflict: increment correct_count or incorrect_count
  - set is_known = true when user marks "Know" in flashcards
  - update last_reviewed_at
```

This requires a database function for atomic increment-on-conflict since the Supabase JS client doesn't support `ON CONFLICT DO UPDATE SET col = col + 1` directly. A small SQL migration will add an `upsert_progress` RPC function.

### Database migration:
```text
CREATE FUNCTION upsert_progress(
  p_user_id uuid, p_question_id uuid, p_correct boolean, p_known boolean default null
)
- INSERT or UPDATE user_progress
- Atomically increment correct_count or incorrect_count
- Optionally set is_known
```

No new tables needed -- the existing `user_progress`, `study_sessions`, and `exam_results` tables have all the data we need.
