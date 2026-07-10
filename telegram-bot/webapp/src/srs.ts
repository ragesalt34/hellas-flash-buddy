// Client-side mirror of the server SRS (telegram-bot/src/srs.ts) — used only
// to show the REAL "come back in …" interval on the grade buttons for the
// card's current level, instead of static labels that lie for most levels.
import type { Language } from './i18n';

export const MAX_LEVEL = 6;

/** Next SRS level from the current level and a 1–3 grade (must match the server). */
export function nextLevel(current: number, grade: number): number {
  if (grade <= 1) return 0;
  if (grade >= 3) return Math.min(current + 2, MAX_LEVEL);
  return Math.min(current + 1, MAX_LEVEL);
}

// Interval labels per level: 1min, 10min, 1d, 3d, 7d, 14d, 30d.
const LABELS: Record<Language, string[]> = {
  ru: ['1 мин', '10 мин', '1 день', '3 дня', '7 дней', '14 дней', '30 дней'],
  el: ['1 λεπτό', '10 λεπτά', '1 ημέρα', '3 ημέρες', '7 ημέρες', '14 ημέρες', '30 ημέρες'],
};

/** Label of the interval a card at `level` graded `grade` will come back in. */
export function gradeIntervalLabel(level: number, grade: number, lang: Language): string {
  const l = Math.max(0, Math.min(nextLevel(level ?? 0, grade), MAX_LEVEL));
  return LABELS[lang][l];
}
