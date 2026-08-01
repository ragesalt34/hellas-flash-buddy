import { supabase } from '../supabase';
import { QuizQuestion, FlashcardItem } from '../types';
import { nextLevel, nextReviewAt } from '../srs';

export type ContentLang = 'ru' | 'el';

export const TOPIC_LABELS_EL: Record<string, string> = {
  history: 'Ιστορία',
  culture: 'Πολιτισμός',
  laws: 'Νομοθεσία',
  geography: 'Γεωγραφία',
  mixed: 'Όλα τα θέματα',
};

export const TOPIC_LABELS_RU: Record<string, string> = {
  history: 'История',
  culture: 'Культура',
  laws: 'Законы',
  geography: 'География',
  mixed: 'Все темы',
};

export const topicLabels = (lang: ContentLang): Record<string, string> =>
  lang === 'ru' ? TOPIC_LABELS_RU : TOPIC_LABELS_EL;

const nonEmpty = (s: string | null | undefined): boolean => !!s && s.trim().length > 0;

const QUESTION_COLS =
  'id, topic, question_ru, question_el, correct_answer_ru, correct_answer_el, ' +
  'wrong_answers_ru, wrong_answers_el, explanation_ru, explanation_el';

interface RawQuestion {
  id: string;
  topic: string | null;
  question_ru: string | null;
  question_el: string | null;
  correct_answer_ru: string | null;
  correct_answer_el: string | null;
  wrong_answers_ru: string[] | null;
  wrong_answers_el: string[] | null;
  explanation_ru: string | null;
  explanation_el: string | null;
}

function toQuizQuestion(r: RawQuestion, lang: ContentLang): QuizQuestion {
  // Pick ONE language for the whole answer set so options never mix alphabets.
  // Fall back to the other language only if the requested one is incomplete
  // (needs question + correct + all distractors).
  const elComplete =
    nonEmpty(r.question_el) && nonEmpty(r.correct_answer_el) && (r.wrong_answers_el?.length ?? 0) >= 3;
  const ruComplete =
    nonEmpty(r.question_ru) && nonEmpty(r.correct_answer_ru) && (r.wrong_answers_ru?.length ?? 0) >= 3;
  const useRu = lang === 'ru' ? ruComplete || !elComplete : !elComplete && ruComplete;

  const explanation = useRu
    ? nonEmpty(r.explanation_ru)
      ? r.explanation_ru
      : r.explanation_el
    : nonEmpty(r.explanation_el)
      ? r.explanation_el
      : r.explanation_ru;

  return {
    id: r.id,
    question: (useRu ? r.question_ru : r.question_el) ?? r.question_ru ?? r.question_el ?? '',
    correct_answer:
      (useRu ? r.correct_answer_ru : r.correct_answer_el) ?? r.correct_answer_ru ?? r.correct_answer_el ?? '',
    wrong_answers: (useRu ? r.wrong_answers_ru : r.wrong_answers_el) ?? r.wrong_answers_ru ?? [],
    explanation: explanation ?? null,
    topic: r.topic,
  };
}

export function shuffleArray<T>(arr: T[]): T[] {
  const result = [...arr];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

export function buildAnswerOptions(question: QuizQuestion): string[] {
  return shuffleArray([question.correct_answer, ...question.wrong_answers]);
}

/** Even coverage across topics, for the "all topics" mode.
 *
 * The pool is lopsided — 108 history questions against 16–22 for each of the
 * other three — so drawing uniformly gave a 10-question mixed quiz an average of
 * 6.6 history and 1.0 geography. The interview treats the four areas as equals,
 * so practice for it should too.
 *
 * Round-robin rather than fixed shares: it hands each topic one slot per pass,
 * and a topic that runs out simply stops taking its turn, so the short topics
 * cannot starve the quiz of length. The result is shuffled because otherwise the
 * questions would arrive in a repeating topic order. */
function pickBalanced(all: QuizQuestion[], limit: number): QuizQuestion[] {
  const byTopic = new Map<string, QuizQuestion[]>();
  for (const q of all) {
    const key = q.topic ?? 'unknown';
    const arr = byTopic.get(key);
    if (arr) arr.push(q);
    else byTopic.set(key, [q]);
  }
  const groups = [...byTopic.values()].map((g) => shuffleArray(g));
  const picked: QuizQuestion[] = [];
  let tookOne = true;
  while (picked.length < limit && tookOne) {
    tookOne = false;
    for (const g of groups) {
      if (picked.length >= limit) break;
      const q = g.pop();
      if (q) {
        picked.push(q);
        tookOne = true;
      }
    }
  }
  return shuffleArray(picked);
}

export async function fetchQuestionsRandom(
  topic: string,
  limit = 10,
  lang: ContentLang = 'el'
): Promise<QuizQuestion[]> {
  let query = supabase.from('questions').select(QUESTION_COLS);
  if (topic !== 'mixed') query = query.eq('topic', topic);

  const { data, error } = await query;
  if (error) throw error;

  const all = ((data ?? []) as unknown as RawQuestion[]).map((r) => toQuizQuestion(r, lang));
  // A single-topic quiz is already one topic — only "all topics" needs balancing.
  return topic === 'mixed' ? pickBalanced(all, limit) : shuffleArray(all).slice(0, limit);
}

const toFlashcard = (q: QuizQuestion, level = 0): FlashcardItem => ({
  question_id: q.id,
  question: q.question,
  correct_answer: q.correct_answer,
  explanation: q.explanation,
  topic: q.topic,
  level,
});

/** Due + unseen SRS flashcards for an account. */
export async function fetchDueFlashcards(
  accountId: string,
  limit = 20,
  lang: ContentLang = 'el'
): Promise<FlashcardItem[]> {
  const [{ data: qData, error: qErr }, { data: pData, error: pErr }] = await Promise.all([
    supabase.from('questions').select(QUESTION_COLS),
    supabase
      .from('question_progress')
      .select('question_id, next_review_at, level')
      .eq('account_id', accountId),
  ]);
  if (qErr) throw qErr;
  if (pErr) throw pErr;

  const now = Date.now();
  const progress = new Map<string, { due: number; level: number }>();
  for (const p of (pData ?? []) as { question_id: string; next_review_at: string | null; level: number }[]) {
    // An unparseable timestamp yields NaN, and `NaN <= now` is false — the card
    // would silently never come up again. Treat it as due now instead.
    const parsed = p.next_review_at ? Date.parse(p.next_review_at) : 0;
    progress.set(p.question_id, {
      due: Number.isNaN(parsed) ? 0 : parsed,
      level: p.level ?? 0,
    });
  }

  const all = (qData ?? []) as unknown as RawQuestion[];
  const due: RawQuestion[] = [];
  const unseen: RawQuestion[] = [];
  for (const q of all) {
    const p = progress.get(q.id);
    if (!p) unseen.push(q);
    else if (p.due <= now) due.push(q);
  }

  // Most overdue first. Without this the order was whatever the table returned,
  // so when more cards are due than fit in `limit` the subset was arbitrary and
  // a card overdue by a month could keep losing to one overdue by a minute.
  due.sort((a, b) => (progress.get(a.id)?.due ?? 0) - (progress.get(b.id)?.due ?? 0));

  const picked = [...due];
  if (picked.length < limit) picked.push(...shuffleArray(unseen).slice(0, limit - picked.length));
  return picked
    .slice(0, limit)
    .map((r) => toFlashcard(toQuizQuestion(r, lang), progress.get(r.id)?.level ?? 0));
}

/** Random flashcards regardless of SRS state (fallback / guests without history). */
export async function fetchRandomFlashcards(
  limit = 20,
  lang: ContentLang = 'el'
): Promise<FlashcardItem[]> {
  const { data, error } = await supabase.from('questions').select(QUESTION_COLS);
  if (error) throw error;
  const all = ((data ?? []) as unknown as RawQuestion[]).map((r) => toFlashcard(toQuizQuestion(r, lang)));
  return shuffleArray(all).slice(0, limit);
}

/** Record one SRS review for a question (flashcard grade or quiz answer). */
export async function recordQuestionProgress(
  accountId: string,
  questionId: string,
  grade: number,
  correct: boolean
): Promise<void> {
  const { data } = await supabase
    .from('question_progress')
    .select('level, correct_count, seen_count')
    .eq('account_id', accountId)
    .eq('question_id', questionId)
    .maybeSingle();

  const prev = (data as { level: number; correct_count: number; seen_count: number } | null) ?? {
    level: 0,
    correct_count: 0,
    seen_count: 0,
  };
  const level = nextLevel(prev.level, grade);

  const { error } = await supabase.from('question_progress').upsert(
    {
      account_id: accountId,
      question_id: questionId,
      level,
      correct_count: prev.correct_count + (correct ? 1 : 0),
      seen_count: prev.seen_count + 1,
      // grade matters, not just the level: a lapse comes back in ten minutes
      // even when the level it fell to would say days.
      next_review_at: nextReviewAt(level, grade),
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'account_id,question_id' }
  );
  if (error) throw error;
}
