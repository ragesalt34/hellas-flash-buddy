import { nextLevel } from '@shared/srs';
import type { LemmaId } from '../content/lexicon';

/** Days until the next review per level; mirrors the server ladder (sub-day steps → today). */
export const INTERVAL_DAYS = [0, 0, 1, 3, 7, 14, 30];

export interface SrsEntry {
  level: number;
  due: string; // YYYY-MM-DD, local
}
export type SrsState = Partial<Record<LemmaId, SrsEntry>>;

export function dayKey(d: Date = new Date()): string {
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

export function addDays(day: string, n: number): string {
  const [y, m, d] = day.split('-').map(Number);
  return dayKey(new Date(y, m - 1, d + n));
}

/** Freshly deciphered words start at level 0, due today. */
export function enroll(s: SrsState, ids: LemmaId[], today: string): SrsState {
  const fresh = ids.filter((id) => !s[id]);
  if (fresh.length === 0) return s;
  const next = { ...s };
  for (const id of fresh) next[id] = { level: 0, due: today };
  return next;
}

export function grade(s: SrsState, id: LemmaId, correct: boolean, today: string): SrsState {
  const cur = s[id];
  if (!cur) return s;
  const level = nextLevel(cur.level, correct ? 3 : 1);
  const due = correct ? addDays(today, INTERVAL_DAYS[level]) : today;
  return { ...s, [id]: { level, due } };
}

export function dueToday(s: SrsState, today: string): LemmaId[] {
  return (Object.entries(s) as [LemmaId, SrsEntry][])
    .filter(([, e]) => e.due <= today)
    .sort(([a, ea], [b, eb]) => (ea.due === eb.due ? a.localeCompare(b) : ea.due.localeCompare(eb.due)))
    .map(([id]) => id);
}

export function consolidated(s: SrsState, ids: LemmaId[], minLevel = 2): number {
  if (ids.length === 0) return 0;
  return ids.filter((id) => (s[id]?.level ?? 0) >= minLevel).length / ids.length;
}
