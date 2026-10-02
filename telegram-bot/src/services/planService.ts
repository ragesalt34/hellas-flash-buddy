import { supabase } from '../supabase';
import { VOCABULARY } from '../data/vocabulary';
import { computePlan, type StudyPlan } from './plan';
import { dayKeyIn, isValidTimeZone } from './sessionService';
import { sessionLangs, type AnswerRow } from './readiness';
import { hasColumn } from './progressColumns';
import { isDueAt } from '../srs';

const VOCAB_IDS = new Set(VOCABULARY.map((v) => v.id));

interface CardRow {
  question_id: string;
  next_review_at: string | null;
  updated_at: string | null;
  first_seen_el_at?: string | null;
}
interface WordRow {
  vocab_id: number;
  next_review_at: string | null;
  updated_at: string | null;
  first_seen_at?: string | null;
}

/** Today's study targets for the account, from its stored interview date.
 *
 * "Today" is the account's calendar day. Reviews left = due by the end of the
 * day and not touched yet today; anything touched today is done, so learning
 * new material (which comes back in minutes) never inflates the day's load.
 * Questions count as covered once seen in Greek (first_seen_el_at, plus Greek
 * answers in past quizzes); before that column exists, any progress counts. */
export async function loadPlan(accountId: string, tz: string, now = new Date()): Promise<StudyPlan> {
  const zone = isValidTimeZone(tz) ? tz : 'UTC';
  const [greekCol, wordCol] = await Promise.all([
    hasColumn('question_progress', 'first_seen_el_at'),
    hasColumn('vocab_progress', 'first_seen_at'),
  ]);
  const [account, questions, progress, vocab, sessions] = await Promise.all([
    supabase.from('accounts').select('interview_date').eq('id', accountId).maybeSingle(),
    supabase.from('questions').select('id', { count: 'exact' }),
    supabase
      .from('question_progress')
      .select(`question_id, next_review_at, updated_at${greekCol ? ', first_seen_el_at' : ''}`)
      .eq('account_id', accountId),
    supabase
      .from('vocab_progress')
      .select(`vocab_id, next_review_at, updated_at${wordCol ? ', first_seen_at' : ''}`)
      .eq('account_id', accountId),
    greekCol
      ? supabase.from('quiz_sessions').select('completed_at, answers').eq('account_id', accountId)
      : Promise.resolve({ data: [], error: null }),
  ]);
  for (const r of [questions, progress, vocab, sessions]) if (r.error) throw r.error;

  const today = dayKeyIn(now, zone);
  const day = (iso: string | null | undefined) => (iso ? dayKeyIn(new Date(iso), zone) : null);
  const dueByToday = (at: string | null) => isDueAt(at, now.getTime()) || (day(at) ?? '') <= today;

  // Questions that no longer exist are not material. The total comes from the
  // exact count (the row list can be capped); the filter applies when complete.
  const questionIds = new Set(((questions.data ?? []) as { id: string }[]).map((q) => q.id));
  const totalQuestions = questions.count ?? questionIds.size;
  const idsComplete = questionIds.size >= totalQuestions;
  const exists = (id: string) => !idsComplete || questionIds.has(id);
  const cards = ((progress.data ?? []) as unknown as CardRow[]).filter((r) => exists(r.question_id));
  const words = ((vocab.data ?? []) as unknown as WordRow[]).filter((v) => VOCAB_IDS.has(v.vocab_id));

  // First day each question was seen in Greek: the column, or a Greek answer in
  // a past quiz (history from before the column existed).
  const firstGreekDay = new Map<string, string>();
  const note = (id: string, d: string | null) => {
    if (!d || !exists(id)) return;
    const prev = firstGreekDay.get(id);
    if (!prev || d < prev) firstGreekDay.set(id, d);
  };
  if (greekCol) {
    for (const c of cards) note(c.question_id, day(c.first_seen_el_at));
    for (const s of (sessions.data ?? []) as { completed_at: string; answers: AnswerRow[] | null }[]) {
      const answers = Array.isArray(s.answers) ? s.answers : [];
      const langs = sessionLangs(answers);
      answers.forEach((a, k) => langs[k] === 'el' && note(a.question_id, day(s.completed_at)));
    }
  }
  const newToday = new Set([...firstGreekDay].filter(([, d]) => d === today).map(([id]) => id));
  const seenQuestions = greekCol ? firstGreekDay.size : cards.length;

  let dueCards = 0;
  let doneCards = 0;
  for (const c of cards) {
    const touched = day(c.updated_at) === today;
    if (touched) {
      if (!newToday.has(c.question_id)) doneCards++;
    } else if (dueByToday(c.next_review_at)) dueCards++;
  }
  let dueWords = 0;
  let doneWords = 0;
  let newWordsToday = 0;
  for (const w of words) {
    const touched = day(w.updated_at) === today;
    const firstToday = wordCol && day(w.first_seen_at) === today;
    if (firstToday) newWordsToday++;
    if (touched) {
      if (!firstToday) doneWords++;
    } else if (dueByToday(w.next_review_at)) dueWords++;
  }

  return computePlan({
    // An error here means the interview_date column is not there yet: no date, not a failure.
    interviewDate: account.error ? null : ((account.data as { interview_date: string | null } | null)?.interview_date ?? null),
    today,
    totalQuestions,
    seenQuestions,
    totalWords: VOCAB_IDS.size,
    seenWords: words.length,
    dueCards,
    dueWords,
    doneCards,
    doneWords,
    newQuestionsToday: newToday.size,
    newWordsToday,
  });
}

export async function setInterviewDate(accountId: string, date: string | null): Promise<void> {
  const { error } = await supabase.from('accounts').update({ interview_date: date }).eq('id', accountId);
  if (error) throw error;
}
