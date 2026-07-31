// Spaced-repetition scheduling — shared by flashcard (question) and vocab progress.
// Levels 0..6; grade 1 = hard (reset), 2 = good (+1), 3 = easy (+2).

export const SRS_INTERVALS_MS = [
  1 * 60 * 1000, // 0 → 1 min
  10 * 60 * 1000, // 1 → 10 min
  24 * 60 * 60 * 1000, // 2 → 1 day
  3 * 24 * 60 * 60 * 1000, // 3 → 3 days
  7 * 24 * 60 * 60 * 1000, // 4 → 7 days
  14 * 24 * 60 * 60 * 1000, // 5 → 14 days
  30 * 24 * 60 * 60 * 1000, // 6 → 30 days
];

export const MAX_LEVEL = SRS_INTERVALS_MS.length - 1;

/** The step a lapsed card is re-shown at, whatever its level.
 *
 * Ten minutes, not one: after a minute the answer is still in working memory, so
 * the repeat tests nothing. Ten is short enough to stay inside the session and
 * long enough to be a real retrieval. */
export const RELEARN_MS = 10 * 60 * 1000;

/** How far a lapse knocks the level down. */
export const LAPSE_DROP = 2;

/** Next SRS level from the current level and a 1–3 grade.
 *
 * A lapse drops two steps instead of resetting to zero. Zeroing threw away
 * everything the card had earned: a 30-day card went back to the very first step
 * and needed six more correct reviews to return, so one slip cost weeks of
 * schedule. Forgetting does not erase a memory that provably held for a month —
 * it shortens it. Dropping by two keeps the estimate honest while `RELEARN_MS`
 * takes care of showing the card again straight away, which is the part that
 * actually re-encodes it.
 *
 * `current` is clamped from below as well as above: it comes out of the
 * database, and a negative value there used to pass straight through
 * (-3 + 1 = -2), which indexes SRS_INTERVALS_MS as undefined and makes
 * nextReviewAt throw on `new Date(NaN).toISOString()`. */
export function nextLevel(current: number, grade: number): number {
  // Clamped to the ladder on BOTH sides before anything else: the lapse branch
  // subtracts rather than resetting now, so an out-of-range level from the
  // database would otherwise survive as one (99 → 97).
  const from = Number.isFinite(current) ? Math.min(Math.max(0, Math.trunc(current)), MAX_LEVEL) : 0;
  if (grade <= 1) return Math.max(0, from - LAPSE_DROP);
  if (grade >= 3) return Math.min(from + 2, MAX_LEVEL);
  return Math.min(from + 1, MAX_LEVEL);
}

/** Milliseconds until a card graded `grade` should surface again.
 *
 * Deliberately not just "the new level's interval": level answers *how well is
 * this known*, this answers *when to show it*. On a lapse the two part company —
 * the card comes back in ten minutes even though its level may still be 4. */
export function nextReviewMs(level: number, grade: number): number {
  if (grade <= 1) return RELEARN_MS;
  return SRS_INTERVALS_MS[Math.max(0, Math.min(level, MAX_LEVEL))];
}

/** ISO timestamp when a card graded `grade` at its new `level` should surface. */
export function nextReviewAt(level: number, grade = 2): string {
  return new Date(Date.now() + nextReviewMs(level, grade)).toISOString();
}

/** A quiz answer (correct/incorrect) mapped onto the 1–3 grade scale. */
export const gradeForCorrect = (correct: boolean): number => (correct ? 2 : 1);
