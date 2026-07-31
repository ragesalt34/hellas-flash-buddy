// Client-side mirror of the server SRS (telegram-bot/src/srs.ts) — used only
// to show the REAL "come back in …" interval on the grade buttons for the
// card's current level, instead of static labels that lie for most levels.
import type { Language } from './i18n';

export const MAX_LEVEL = 6;

/** How far a lapse knocks the level down (must match the server). */
export const LAPSE_DROP = 2;

/** Next SRS level from the current level and a 1–3 grade (must match the server). */
export function nextLevel(current: number, grade: number): number {
  // Clamped to the ladder on both sides before anything else, exactly as on the
  // server: the lapse branch subtracts rather than resetting, so an
  // out-of-range level would otherwise survive as one (99 → 97) and index past
  // the end of the label list.
  const from = Number.isFinite(current) ? Math.min(Math.max(0, Math.trunc(current)), MAX_LEVEL) : 0;
  if (grade <= 1) return Math.max(0, from - LAPSE_DROP);
  if (grade >= 3) return Math.min(from + 2, MAX_LEVEL);
  return Math.min(from + 1, MAX_LEVEL);
}

// Interval labels per level: 1min, 10min, 1d, 3d, 7d, 14d, 30d.
const LABELS: Record<Language, string[]> = {
  ru: ['1 мин', '10 мин', '1 день', '3 дня', '7 дней', '14 дней', '30 дней'],
  el: ['1 λεπτό', '10 λεπτά', '1 ημέρα', '3 ημέρες', '7 ημέρες', '14 ημέρες', '30 ημέρες'],
};

// The relearning step a lapse is re-shown at — index 1 in the list above.
const RELEARN_LABEL_INDEX = 1;

/** Label of the interval a card at `level` graded `grade` will come back in.
 *
 * A lapse is not the new level's interval: the level falls by two but the card
 * returns in ten minutes, so "Сложно" always reads 10 мин. Reading it off
 * nextLevel would promise days on a mature card — the button would be lying. */
export function gradeIntervalLabel(level: number, grade: number, lang: Language): string {
  if (grade <= 1) return LABELS[lang][RELEARN_LABEL_INDEX];
  const l = Math.max(0, Math.min(nextLevel(level ?? 0, grade), MAX_LEVEL));
  return LABELS[lang][l];
}
