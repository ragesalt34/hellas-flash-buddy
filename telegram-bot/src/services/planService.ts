import { supabase } from '../supabase';
import { VOCABULARY } from '../data/vocabulary';
import { computePlan, type StudyPlan } from './plan';
import { dayKeyIn, isValidTimeZone } from './sessionService';
import { isDueAt } from '../srs';

const VOCAB_IDS = new Set(VOCABULARY.map((v) => v.id));

/** Today's study targets for the account, from its stored interview date. */
export async function loadPlan(accountId: string, tz: string, now = new Date()): Promise<StudyPlan> {
  const zone = isValidTimeZone(tz) ? tz : 'UTC';
  const [account, questions, progress, vocab] = await Promise.all([
    supabase.from('accounts').select('interview_date').eq('id', accountId).maybeSingle(),
    supabase.from('questions').select('id'),
    supabase.from('question_progress').select('question_id, next_review_at').eq('account_id', accountId),
    supabase.from('vocab_progress').select('vocab_id, next_review_at').eq('account_id', accountId),
  ]);
  for (const r of [questions, progress, vocab]) if (r.error) throw r.error;

  // Same "due" rule as the flashcard queue, so the plan's count matches what the cards show.
  const isDue = (r: { next_review_at: string | null }) => isDueAt(r.next_review_at, now.getTime());
  // Progress rows of questions that no longer exist are not "seen" material.
  const questionIds = new Set(((questions.data ?? []) as { id: string }[]).map((q) => q.id));
  const cards = ((progress.data ?? []) as { question_id: string; next_review_at: string | null }[]).filter((r) =>
    questionIds.has(r.question_id)
  );
  const words = ((vocab.data ?? []) as { vocab_id: number; next_review_at: string | null }[]).filter((v) =>
    VOCAB_IDS.has(v.vocab_id)
  );

  return computePlan({
    // An error here means the interview_date column is not there yet: no date, not a failure.
    interviewDate: account.error ? null : ((account.data as { interview_date: string | null } | null)?.interview_date ?? null),
    today: dayKeyIn(now, zone),
    totalQuestions: questionIds.size,
    seenQuestions: cards.length,
    totalWords: VOCAB_IDS.size,
    seenWords: words.length,
    dueCards: cards.filter(isDue).length,
    dueWords: words.filter(isDue).length,
  });
}

export async function setInterviewDate(accountId: string, date: string | null): Promise<void> {
  const { error } = await supabase.from('accounts').update({ interview_date: date }).eq('id', accountId);
  if (error) throw error;
}
