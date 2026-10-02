/* One rule for "what is due today", shared by the flashcard and vocabulary
   queues, the grade step, the daily plan and the readiness report. Pure (no
   database), so it is tested directly.

   - A card scheduled for today is due all day, in the account's own calendar:
     a one-day interval from yesterday 20:00 is due this morning, not at 20:00.
     Without this the plan listed it while the queue would not show it yet.
   - A card already touched today follows its exact time: the 10-minute and
     1-hour comebacks of today's learning are part of the session.
   - Missing or unparseable times count as due (see isDueAt). */
import { isDueAt } from '../srs';

export function dayKeyAt(d: Date, tz: string): string {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: tz,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(d);
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? '';
  return `${get('year')}-${get('month')}-${get('day')}`;
}

export interface ScheduledRow {
  next_review_at: string | null;
  updated_at?: string | null;
  first_seen_at?: string | null;
}

const dayOf = (iso: string | null | undefined, tz: string): string | null => {
  if (!iso) return null;
  const t = Date.parse(iso);
  return Number.isNaN(t) ? null : dayKeyAt(new Date(t), tz);
};

export const touchedToday = (r: ScheduledRow, now: Date, tz: string): boolean =>
  dayOf(r.updated_at, tz) === dayKeyAt(now, tz);

/** Should this card be shown (and its review count as on time) now? */
export function dueToday(r: ScheduledRow, now: Date, tz: string): boolean {
  if (isDueAt(r.next_review_at, now.getTime())) return true;
  if (touchedToday(r, now, tz)) return false;
  const next = dayOf(r.next_review_at, tz);
  return next !== null && next <= dayKeyAt(now, tz);
}

/** The day's tally for the plan: left to review, reviewed today, first seen today. */
export function countDay(
  rows: ScheduledRow[],
  now: Date,
  tz: string,
  trackFirstSeen: boolean
): { left: number; done: number; fresh: number } {
  const today = dayKeyAt(now, tz);
  let left = 0;
  let done = 0;
  let fresh = 0;
  for (const r of rows) {
    const firstToday = trackFirstSeen && dayOf(r.first_seen_at, tz) === today;
    if (firstToday) fresh++;
    if (touchedToday(r, now, tz)) {
      if (!firstToday) done++;
    } else if (dueToday(r, now, tz)) left++;
  }
  return { left, done, fresh };
}
