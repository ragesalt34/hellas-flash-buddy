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

/** Consecutive-day streak (today or yesterday inclusive) from completed sessions. */
export async function getUserStreak(accountId: string): Promise<number> {
  const cutoff = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString();
  const { data, error } = await supabase
    .from('quiz_sessions')
    .select('completed_at')
    .eq('account_id', accountId)
    .gte('completed_at', cutoff)
    .order('completed_at', { ascending: false });
  if (error || !data || data.length === 0) return 0;

  const activeDays = new Set(
    (data as { completed_at: string }[]).map((r) => r.completed_at.slice(0, 10))
  );
  const today = new Date();
  let streak = 0;
  for (let i = 0; i < 60; i++) {
    const key = new Date(today.getTime() - i * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    if (activeDays.has(key)) streak++;
    else if (i === 0) continue; // no activity today — streak may still stand from yesterday
    else break;
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
