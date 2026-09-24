# Readiness statistics — design

Date: 2026-09-24. Replaces the current Stats screen of the web app (`telegram-bot/webapp`).

## Goal

Answer one question for the learner: "Can I go to the citizenship interview now?"
The interview is in Greek, so the verdict is decided by Greek only. Russian is
shown next to it as an aid to understanding and never affects the verdict.

## Data (read-only, no schema change)

- `questions` — 163 rows, 4 topics (history 108, culture 22, laws 17,
  geography 16). Every row has a Greek question and answer.
- `quiz_sessions.answers` (jsonb) — one entry per answered question:
  `{ question_id, chosen, correct, correct_answer }`.
- `question_progress` — per-question SRS `level`, `next_review_at` (quiz answers and flashcard grades).
- `vocab_progress` — per-word SRS `level`, `next_review_at`; words live in `src/data/vocabulary.ts` (150).
- `study_days` — one row per account per active day.

## Definitions

- **Answer language.** `el` if `chosen` contains Greek letters, `ru` if it has
  letters and none are Greek. A neutral answer (digits, punctuation) takes the
  majority language of the other answers in the same session; if the session has
  none, the answer is ignored for language stats.
- **Known in language L.** The most recent answer to that question in language L
  was correct. A question never answered in L is "unchecked", not "unknown".
- **In memory.** `question_progress.level >= 4` (next review 7+ days out) — the
  same bar as a mastered word.
- **Word learned.** `vocab_progress.level >= 4` (unchanged).
- **Due.** `next_review_at <= now` for questions (flashcards) and words.

## Verdict

Thresholds live in one exported constant object.

- **ready** — Greek known ≥ 85% in every topic AND words learned ≥ 80%.
- **almost** — Greek known ≥ 60% in every topic AND words ≥ 60%.
- **early** — otherwise.

`blockers`: up to 2 weakest criteria below the next verdict level, each with
`known / total`, weakest first (topic Greek coverage or words).

## API

`GET /api/readiness` (authenticated like the other `/api` routes) returns:

```
{
  verdict: 'early' | 'almost' | 'ready',
  score: number,                // 0..100, min of per-topic Greek % and words %
  blockers: { kind: 'topic' | 'words', topic?: string, known: number, total: number }[],
  greek:   { known, checked, total },
  russian: { known, checked, total },
  memory:  { strong, total },
  words:   { learned, seen, total },
  topics:  { topic, total, greek: {known, checked}, russian: {known, checked}, memory }[],
  due:     { cards: number, words: number },
  activity:{ streak: number, days: string[] },   // YYYY-MM-DD, last 35 days
  history: { topic, score, total, completed_at }[], // last 10
  topicLabels: Record<string,string>
}
```

`/api/stats` and `/api/me` are unchanged (Home still uses them).

## Components

- `src/services/readinessService.ts` — `computeReadiness(input, now)`: pure,
  no I/O. `loadReadiness(accountId, tz)`: fetches the inputs and calls it.
- `src/services/readinessService.test.ts` — `node:test` via `npx tsx --test`.
- `webapp/src/screens/Stats.tsx` — rewritten; sections top to bottom:
  1. Verdict card (status, score, blockers).
  2. Four criteria bars: Greek questions (decides), Words (decides),
     In memory, Russian questions (labelled as an aid).
  3. Topic table: rows = topics, columns = Greek / Russian / memory; the
     weakest Greek cell is highlighted with a "Train" button that opens the
     quiz for that topic.
  4. Today: due cards and words with buttons to Flashcards / Vocabulary.
  5. Regularity: streak + 5-week day grid.
  6. Quiz history: last 5, "show more" reveals up to 10.
- Styling follows the soft theme pastel look already used by Vocabulary /
  Flashcards; RU and EL strings in `i18n.tsx`.

## Error handling

Endpoint failure → existing `Empty` error state with retry. A brand-new user
(nothing answered, no words) sees the verdict "early" with "unchecked" counts
and buttons to start, not an empty screen.

## Testing

Unit tests for `computeReadiness`: empty user; language detection incl.
neutral answers; latest answer wins; per-topic threshold (one weak topic keeps
"almost"); words threshold; blockers order; due counts. Then a browser pass on a
real account at desktop and phone widths.
