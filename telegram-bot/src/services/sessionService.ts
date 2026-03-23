import { supabase } from '../supabase';
import { QuizSession, QuizQuestion, AnswerRecord } from '../types';

export async function getActiveSession(telegramId: number): Promise<QuizSession | null> {
  const { data, error } = await supabase
    .from('telegram_quiz_sessions')
    .select()
    .eq('telegram_id', telegramId)
    .is('completed_at', null)
    .order('started_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  return data as QuizSession | null;
}

export async function createSession(
  telegramId: number,
  topic: string,
  questions: QuizQuestion[]
): Promise<QuizSession> {
  // Clean up old incomplete sessions first
  await supabase
    .from('telegram_quiz_sessions')
    .delete()
    .eq('telegram_id', telegramId)
    .is('completed_at', null);

  const { data, error } = await supabase
    .from('telegram_quiz_sessions')
    .insert({
      telegram_id: telegramId,
      topic,
      questions,
      current_index: 0,
      score: 0,
      answers: [],
    })
    .select()
    .single();

  if (error) throw error;
  return data as QuizSession;
}

export async function updateSession(
  sessionId: string,
  updates: Partial<{
    current_index: number;
    score: number;
    answers: AnswerRecord[];
    last_message_id: number | null;
    current_answer_order: string[];
    completed_at: string;
  }>
): Promise<void> {
  const { error } = await supabase
    .from('telegram_quiz_sessions')
    .update(updates)
    .eq('id', sessionId);

  if (error) throw error;
}

export async function completeSession(sessionId: string): Promise<void> {
  await updateSession(sessionId, { completed_at: new Date().toISOString() });
}

export interface UserStats {
  total_sessions: number;
  total_questions: number;
  total_correct: number;
  by_topic: Record<
    string,
    { sessions: number; correct: number; total: number }
  >;
  last_activity: string | null;
}

export async function getUserStats(telegramId: number): Promise<UserStats> {
  const { data, error } = await supabase
    .from('telegram_quiz_sessions')
    .select('topic, score, questions, completed_at')
    .eq('telegram_id', telegramId)
    .not('completed_at', 'is', null);

  if (error) throw error;

  const sessions = (data ?? []) as {
    topic: string;
    score: number;
    questions: unknown[];
    completed_at: string;
  }[];

  const stats: UserStats = {
    total_sessions: sessions.length,
    total_questions: 0,
    total_correct: 0,
    by_topic: {},
    last_activity: null,
  };

  for (const session of sessions) {
    const total = session.questions.length;
    stats.total_questions += total;
    stats.total_correct += session.score;

    if (!stats.by_topic[session.topic]) {
      stats.by_topic[session.topic] = { sessions: 0, correct: 0, total: 0 };
    }
    stats.by_topic[session.topic].sessions++;
    stats.by_topic[session.topic].correct += session.score;
    stats.by_topic[session.topic].total += total;

    if (
      !stats.last_activity ||
      session.completed_at > stats.last_activity
    ) {
      stats.last_activity = session.completed_at;
    }
  }

  return stats;
}
