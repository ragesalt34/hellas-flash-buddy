import { supabase } from '../supabase';
import { VOCABULARY } from '../data/vocabulary';
import { computeReadiness, type ReadinessCore, type SessionRow } from './readiness';
import { dayKeyIn, prevDayKey, isValidTimeZone, getUserStreak, getHistory, type HistorySession } from './sessionService';

const ACTIVITY_DAYS = 35;

export interface Readiness extends ReadinessCore {
  activity: { streak: number; days: string[] };
  history: HistorySession[];
}

export async function loadReadiness(accountId: string, tz: string, now = new Date()): Promise<Readiness> {
  const zone = isValidTimeZone(tz) ? tz : 'UTC';
  let since = dayKeyIn(now, zone);
  for (let i = 1; i < ACTIVITY_DAYS; i++) since = prevDayKey(since);

  const [questions, sessions, progress, vocab, days, streak, history] = await Promise.all([
    supabase.from('questions').select('id, topic'),
    supabase
      .from('quiz_sessions')
      .select('completed_at, answers')
      .eq('account_id', accountId)
      .order('completed_at', { ascending: true }),
    supabase.from('question_progress').select('question_id, level, next_review_at').eq('account_id', accountId),
    supabase.from('vocab_progress').select('vocab_id, level, next_review_at').eq('account_id', accountId),
    supabase.from('study_days').select('day').eq('account_id', accountId).gte('day', since),
    getUserStreak(accountId, zone).catch(() => 0),
    getHistory(accountId, 10),
  ]);
  for (const r of [questions, sessions, progress, vocab]) if (r.error) throw r.error;

  const core = computeReadiness(
    {
      questions: questions.data ?? [],
      sessions: (sessions.data ?? []) as SessionRow[],
      progress: progress.data ?? [],
      vocab: vocab.data ?? [],
      vocabIds: VOCABULARY.map((v) => v.id),
    },
    now
  );
  // study_days is optional (older databases lack it): no table, no grid.
  const activeDays = days.error
    ? []
    : [...new Set(((days.data ?? []) as { day: string }[]).map((d) => String(d.day).slice(0, 10)))].sort();

  return { ...core, activity: { streak, days: activeDays }, history };
}
