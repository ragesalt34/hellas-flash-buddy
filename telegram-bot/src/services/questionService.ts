import { supabase } from '../supabase';
import { QuizQuestion, FlashcardItem } from '../types';

const TOPIC_MAP: Record<string, string> = {
  // Russian aliases (legacy)
  история: 'history',
  культура: 'culture',
  право: 'laws',
  законы: 'laws',
  география: 'geography',
  // Greek aliases
  ιστορία: 'history',
  πολιτισμός: 'culture',
  νομοθεσία: 'laws',
  δίκαιο: 'laws',
  γεωγραφία: 'geography',
};

export function parseTopic(input: string | undefined): string {
  if (!input) return 'mixed';
  const normalized = input.trim().toLowerCase();
  return TOPIC_MAP[normalized] ?? 'mixed';
}

export type ContentLang = 'ru' | 'el';

export const TOPIC_LABELS: Record<string, string> = {
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
  lang === 'ru' ? TOPIC_LABELS_RU : TOPIC_LABELS;

const nonEmpty = (s: string | null | undefined): boolean => !!s && s.trim().length > 0;

const QUESTION_COLS =
  'id, question, question_el, correct_answer, correct_answer_el, ' +
  'wrong_answers, wrong_answers_el, explanation, explanation_el, topic';

interface RawQuestion {
  id: string;
  question: string;
  question_el: string | null;
  correct_answer: string;
  correct_answer_el: string | null;
  wrong_answers: string[];
  wrong_answers_el: string[] | null;
  explanation: string | null;
  explanation_el: string | null;
  topic: string | null;
}

function toQuizQuestion(r: RawQuestion, lang: ContentLang = 'el'): QuizQuestion {
  // Pick ONE language for the whole answer set (question + correct + wrongs) so
  // options never mix alphabets — otherwise a lone Greek/Russian answer among
  // distractors in the other language would be the obvious giveaway. Only fall
  // back to the other language if the requested one isn't a complete set.
  // "Complete" requires all 3 distractors (not just >=1) — a row with only a
  // partial translation of wrong_answers would otherwise render a quiz question
  // with fewer than 4 total options instead of falling back to the full set.
  const elComplete = nonEmpty(r.question_el) && nonEmpty(r.correct_answer_el) && (r.wrong_answers_el?.length ?? 0) >= 3;
  const ruComplete = nonEmpty(r.question) && nonEmpty(r.correct_answer) && (r.wrong_answers?.length ?? 0) >= 3;
  const useRu = lang === 'ru' ? ruComplete || !elComplete : !elComplete && ruComplete;

  // Explanation is non-critical (not an option) — prefer the chosen language,
  // fall back to the other so it's shown whenever it exists.
  const explanation = useRu
    ? (nonEmpty(r.explanation) ? r.explanation : r.explanation_el)
    : (nonEmpty(r.explanation_el) ? r.explanation_el : r.explanation);

  return {
    id: r.id,
    question: (useRu ? r.question : r.question_el) ?? r.question,
    correct_answer: (useRu ? r.correct_answer : r.correct_answer_el) ?? r.correct_answer,
    wrong_answers: (useRu ? r.wrong_answers : r.wrong_answers_el) ?? r.wrong_answers,
    explanation,
    topic: r.topic,
  };
}

export async function fetchQuestionsRandom(
  topic: string,
  limit = 10,
  lang: ContentLang = 'el'
): Promise<QuizQuestion[]> {
  let query = supabase.from('questions').select(QUESTION_COLS);

  if (topic !== 'mixed') {
    query = query.eq('topic', topic);
  }

  const { data, error } = await query; // fetch all, shuffle locally for true randomness
  if (error) throw error;

  const all = ((data ?? []) as unknown as RawQuestion[]).map((r) => toQuizQuestion(r, lang));
  return shuffleArray(all).slice(0, limit);
}

export async function fetchDueFlashcards(
  userId: string,
  limit = 20,
  lang: ContentLang = 'el'
): Promise<FlashcardItem[]> {
  const now = new Date().toISOString();

  // 1. Due cards (already seen, review time passed)
  const { data: progressData, error: progressError } = await supabase
    .from('user_progress')
    .select(
      `question_id,
       next_review_at,
       questions!inner(${QUESTION_COLS})`
    )
    .eq('user_id', userId)
    .or(`next_review_at.is.null,next_review_at.lte.${now}`)
    .order('next_review_at', { ascending: true })
    .limit(limit);

  if (progressError) throw progressError;

  const dueCards: FlashcardItem[] = ((progressData ?? []) as unknown[])
    .filter((row: unknown) => (row as { questions?: unknown }).questions != null)
    .map((row: unknown) => {
      const r = row as {
        question_id: string;
        next_review_at: string | null;
        questions: RawQuestion;
      };
      const q = toQuizQuestion(r.questions, lang);
      return {
        question_id: r.question_id,
        question: q.question,
        correct_answer: q.correct_answer,
        explanation: q.explanation,
        topic: q.topic,
      };
    });

  // If we already have enough due cards, return them
  if (dueCards.length >= limit) return dueCards;

  // 2. Unseen cards (never rated — not in user_progress at all)
  const seenIds = dueCards.map(c => c.question_id);

  // Also fetch all seen question_ids (including not-yet-due) to exclude them
  const { data: allProgress } = await supabase
    .from('user_progress')
    .select('question_id')
    .eq('user_id', userId);

  const allSeenIds = (allProgress ?? []).map((r: { question_id: string }) => r.question_id);
  const excludeIds = [...new Set([...seenIds, ...allSeenIds])];

  const { data: allQuestions, error: qError } = await supabase
    .from('questions')
    .select(QUESTION_COLS);

  if (qError) throw qError;

  const unseenCards: FlashcardItem[] = shuffleArray(
    ((allQuestions ?? []) as unknown as RawQuestion[]).filter((q) => !excludeIds.includes(q.id))
  )
    .slice(0, limit - dueCards.length)
    .map((raw) => {
      const q = toQuizQuestion(raw, lang);
      return {
        question_id: q.id,
        question: q.question,
        correct_answer: q.correct_answer,
        explanation: q.explanation,
        topic: q.topic,
      };
    });

  return [...dueCards, ...unseenCards];
}

export async function fetchRandomFlashcards(
  limit = 20,
  lang: ContentLang = 'el'
): Promise<FlashcardItem[]> {
  const { data, error } = await supabase
    .from('questions')
    .select(QUESTION_COLS);

  if (error) throw error;

  const all = ((data ?? []) as unknown as RawQuestion[]).map((r) => toQuizQuestion(r, lang));
  return shuffleArray(all).slice(0, limit).map((q) => ({
    question_id: q.id,
    question: q.question,
    correct_answer: q.correct_answer,
    explanation: q.explanation,
    topic: q.topic,
  }));
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
