import type { VocabItem } from '../data/vocabulary';

const gcd = (a: number, b: number): number => (b === 0 ? a : gcd(b, a % b));

/** The word of the day for a calendar day (YYYY-MM-DD in the account's zone).
 *
 * Deterministic, so everyone sees the same word on the same day and a reload
 * does not change it. Days step through the list by a stride coprime with its
 * length: consecutive days land far apart in the list (it is ordered by topic),
 * and one full cycle shows every word exactly once. */
export function pickWordOfDay<T extends Pick<VocabItem, 'id'>>(dayKey: string, items: T[]): T {
  const [y, m, d] = dayKey.split('-').map(Number);
  const day = Math.floor(Date.UTC(y, (m || 1) - 1, d || 1) / 86_400_000);
  const n = items.length;
  let stride = 37;
  while (gcd(stride, n) !== 1) stride++;
  const i = (((day * stride) % n) + n) % n;
  return items[i];
}
