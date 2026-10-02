import { supabase } from '../supabase';
import { VOCABULARY } from '../data/vocabulary';
import { computePlan, type StudyPlan } from './plan';
import { dayKeyIn, isValidTimeZone } from './sessionService';
import { hasColumn } from './progressColumns';
import { isDueAt } from '../srs';

const VOCAB_IDS = new Set(VOCABULARY.map((v) => v.id));

interface Row {
  question_id?: string;
  vocab_id?: number;
  next_review_at: string | null;
  updated_at: string | null;
  first_seen_at?: string | null;
}

/** Today's study targets for the account, from its stored interview date.
 *
 * "Today" is the account's calendar day. Reviews left = due by the end of the
 * day and not touched yet today; anything touched today is done, so learning
 * new material (which comes back in minutes) never inflates the day's load.
 * New material counts in any language: the plan has to be completable in the
 * interface the learner actually uses (the readiness report is the place that
 * judges Greek only). New today = first_seen_at today, once that column exists. */
export async function loadPlan(accountId: string, tz: string, now = new Date()): Promise<StudyPlan> {
  const zone = isValidTimeZone(tz) ? tz : 'UTC';
  const [qCol, wCol] = await Promise.all([
    hasColumn('question_progress', 'first_seen_at'),
    hasColumn('vocab_progress', 'first_seen_at'),
  ]);
  const [account, questions, progress, vocab] = await Promise.all([
    supabase.from('accounts').select('interview_date').eq('id', accountId).maybeSingle(),
    supabase.from('questions').select('id', { count: 'exact' }),
    supabase
      .from('question_progress')
      .select(`question_id, next_review_at, updated_at${qCol ? ', first_seen_at' : ''}`)
      .eq('account_id', accountId),
    supabase
      .from('vocab_progress')
      .select(`vocab_id, next_review_at, updated_at${wCol ? ', first_seen_at' : ''}`)
      .eq('account_id', accountId),
  ]);
  for (const r of [questions, progress, vocab]) if (r.error) throw r.error;

  const today = dayKeyIn(now, zone);
  const day = (iso: string | null | undefined) => (iso ? dayKeyIn(new Date(iso), zone) : null);
  const dueByToday = (at: string | null) => isDueAt(at, now.getTime()) || (day(at) ?? '') <= today;

  // Questions that no longer exist are not material. The total comes from the
  // exact count (the row list can be capped); the filter applies when complete.
  const questionIds = new Set(((questions.data ?? []) as { id: string }[]).map((q) => q.id));
  const totalQuestions = questions.count ?? questionIds.size;
  const idsComplete = questionIds.size >= totalQuestions;
  const cards = ((progress.data ?? []) as unknown as Row[]).filter((r) => !idsComplete || questionIds.has(r.question_id!));
  const words = ((vocab.data ?? []) as unknown as Row[]).filter((v) => VOCAB_IDS.has(v.vocab_id!));

  const count = (rows: Row[], track: boolean) => {
    let due = 0;
    let done = 0;
    let fresh = 0;
    for (const r of rows) {
      const firstToday = track && day(r.first_seen_at) === today;
      if (firstToday) fresh++;
      if (day(r.updated_at) === today) {
        if (!firstToday) done++;
      } else if (dueByToday(r.next_review_at)) due++;
    }
    return { due, done, fresh };
  };
  const q = count(cards, qCol);
  const w = count(words, wCol);

  return computePlan({
    // An error here means the interview_date column is not there yet: no date, not a failure.
    interviewDate: account.error ? null : ((account.data as { interview_date: string | null } | null)?.interview_date ?? null),
    today,
    totalQuestions,
    seenQuestions: cards.length,
    totalWords: VOCAB_IDS.size,
    seenWords: words.length,
    dueCards: q.due,
    dueWords: w.due,
    doneCards: q.done,
    doneWords: w.done,
    newQuestionsToday: q.fresh,
    newWordsToday: w.fresh,
  });
}

export async function setInterviewDate(accountId: string, date: string | null): Promise<void> {
  const { error } = await supabase.from('accounts').update({ interview_date: date }).eq('id', accountId);
  if (error) throw error;
}
