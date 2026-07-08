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

/** Next SRS level from the current level and a 1–3 grade. */
export function nextLevel(current: number, grade: number): number {
  if (grade <= 1) return 0;
  if (grade >= 3) return Math.min(current + 2, MAX_LEVEL);
  return Math.min(current + 1, MAX_LEVEL);
}

/** ISO timestamp when a card at `level` should next surface. */
export function nextReviewAt(level: number): string {
  return new Date(Date.now() + SRS_INTERVALS_MS[level]).toISOString();
}

/** A quiz answer (correct/incorrect) mapped onto the 1–3 grade scale. */
export const gradeForCorrect = (correct: boolean): number => (correct ? 2 : 1);
