import { supabase } from '../supabase';
import { AnswerRecord } from '../types';

export interface UserStats {
  total_sessions: number;
  total_questions: number;
  total_correct: number;
  by_topic: Record<string, { sessions: number; correct: number; total: number }>;
  last_activity: string | null;
}

/** Persist a completed quiz session. */
export async function recordQuizSession(
  accountId: string,
  topic: string,
  score: number,
  total: number,
  answers: AnswerRecord[]
): Promise<void> {
  const { error } = await supabase.from('quiz_sessions').insert({
    account_id: accountId,
    topic,
    score,
    total,
    answers,
    completed_at: new Date().toISOString(),
  });
  if (error) throw error;
}

export async function getUserStats(accountId: string): Promise<UserStats> {
  const { data, error } = await supabase
    .from('quiz_sessions')
    .select('topic, score, total, completed_at')
    .eq('account_id', accountId);
  if (error) throw error;

  const sessions = (data ?? []) as {
    topic: string;
    score: number;
    total: number;
    completed_at: string;
  }[];

  const stats: UserStats = {
    total_sessions: sessions.length,
    total_questions: 0,
    total_correct: 0,
    by_topic: {},
    last_activity: null,
  };

  for (const s of sessions) {
    stats.total_questions += s.total;
    stats.total_correct += s.score;
    if (!stats.by_topic[s.topic]) stats.by_topic[s.topic] = { sessions: 0, correct: 0, total: 0 };
    stats.by_topic[s.topic].sessions++;
    stats.by_topic[s.topic].correct += s.score;
    stats.by_topic[s.topic].total += s.total;
    if (!stats.last_activity || s.completed_at > stats.last_activity) stats.last_activity = s.completed_at;
  }
  return stats;
}

/** A calendar day key (YYYY-MM-DD) for an instant, as seen in `tz`.
 *
 * Built from formatToParts rather than a locale string so the order of the
 * fields cannot depend on the locale. */
export function dayKeyIn(date: Date, tz: string): string {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: tz,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date);
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? '';
  return `${get('year')}-${get('month')}-${get('day')}`;
}

/** The calendar day before a YYYY-MM-DD key.
 *
 * Arithmetic on the date itself, not on an instant: stepping back 24h in real
 * time skips or repeats a day when the clocks change, because a local day can
 * be 23 or 25 hours long. A pure calendar step has no such problem. */
export function prevDayKey(key: string): string {
  const [y, m, d] = key.split('-').map(Number);
  const t = Date.UTC(y, m - 1, d) - 24 * 60 * 60 * 1000;
  return new Date(t).toISOString().slice(0, 10);
}

/** True if `tz` is a zone this runtime knows. */
export function isValidTimeZone(tz: string): boolean {
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}

/** Mark today as a study day for this account.
 *
 * The day is resolved in the user's own zone at write time and stored as a plain
 * date, so reading the streak later needs no timezone maths at all.
 *
 * Why a table and not `updated_at` on the progress rows: those hold only the
 * LAST review of each card, so a day whose cards were reviewed again later
 * leaves no trace, and the streak would break for days the user did study. */
export async function recordStudyDay(accountId: string, tz = 'UTC'): Promise<void> {
  const zone = isValidTimeZone(tz) ? tz : 'UTC';
  const { error } = await supabase
    .from('study_days')
    .upsert({ account_id: accountId, day: dayKeyIn(new Date(), zone) }, { onConflict: 'account_id,day' });
  if (error) throw error;
}

/** Consecutive-day streak (today or yesterday inclusive).
 *
 * Counts ANY study — quiz, flashcards or vocabulary. It used to read only
 * `quiz_sessions`, so someone who did cards and words every day but never
 * finished a quiz had a streak of zero, which flatly contradicts the promise on
 * the landing page. The activity log is the source of truth; if it has not been
 * created yet the old quiz-only path still answers, so deploying this before
 * running the SQL degrades instead of breaking.
 *
 * Days are the account's own calendar days: `tz` comes from the browser. On UTC
 * the boundary was wrong for everyone east or west of it — studying at 01:00
 * local in Greece counted towards the previous day, so a streak could break or
 * extend for no reason the user could see. */
export async function getUserStreak(accountId: string, tz = 'UTC'): Promise<number> {
  const zone = isValidTimeZone(tz) ? tz : 'UTC';
  const since = prevNDays(dayKeyIn(new Date(), zone), 62);
  const { data, error } = await supabase
    .from('study_days')
    .select('day')
    .eq('account_id', accountId)
    .gte('day', since);
  if (!error && data) {
    const days = new Set(
      (data as { day: string }[]).map((r) => String(r.day).slice(0, 10))
    );
    return streakFromDays(days, zone);
  }
  return streakFromQuizSessions(accountId, zone);
}

/** `key` moved back `n` calendar days. */
function prevNDays(key: string, n: number): string {
  let k = key;
  for (let i = 0; i < n; i++) k = prevDayKey(k);
  return k;
}

/** The pre-activity-log streak: quiz sessions only. Kept as the fallback. */
async function streakFromQuizSessions(accountId: string, zone: string): Promise<number> {
  const cutoff = new Date(Date.now() - 62 * 24 * 60 * 60 * 1000).toISOString();
  const { data, error } = await supabase
    .from('quiz_sessions')
    .select('completed_at')
    .eq('account_id', accountId)
    .gte('completed_at', cutoff)
    .order('completed_at', { ascending: false });
  if (error || !data || data.length === 0) return 0;

  const activeDays = new Set(
    (data as { completed_at: string }[])
      .map((r) => {
        const t = Date.parse(r.completed_at);
        return Number.isNaN(t) ? null : dayKeyIn(new Date(t), zone);
      })
      .filter((k): k is string => k !== null)
  );

  return streakFromDays(activeDays, zone);
}

/** Length of the run of active days ending today or yesterday.
 *
 * Split out from the query so it can be exercised directly — the whole point of
 * the streak is the day boundary, and that is not something to verify by eye.
 * `now` is injectable for the same reason. */
export function streakFromDays(activeDays: Set<string>, tz: string, now = new Date()): number {
  let key = dayKeyIn(now, isValidTimeZone(tz) ? tz : 'UTC');
  let streak = 0;
  for (let i = 0; i < 60; i++) {
    if (activeDays.has(key)) streak++;
    else if (i > 0) break; // a gap ends the run; an empty today does not
    key = prevDayKey(key);
  }
  return streak;
}

export interface HistorySession {
  topic: string;
  score: number;
  total: number;
  completed_at: string;
}

export async function getHistory(accountId: string, limit = 10): Promise<HistorySession[]> {
  const { data, error } = await supabase
    .from('quiz_sessions')
    .select('topic, score, total, completed_at')
    .eq('account_id', accountId)
    .order('completed_at', { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data ?? []) as HistorySession[];
}
