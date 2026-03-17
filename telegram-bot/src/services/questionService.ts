import { supabase } from '../supabase';
import { QuizQuestion, FlashcardItem } from '../types';

const TOPIC_MAP: Record<string, string> = {
  история: 'history',
  культура: 'culture',
  право: 'laws',
  законы: 'laws',
  география: 'geography',
};

export function parseTopic(input: string | undefined): string {
  if (!input) return 'mixed';
  const normalized = input.trim().toLowerCase();
  return TOPIC_MAP[normalized] ?? 'mixed';
}

export const TOPIC_LABELS: Record<string, string> = {
  history: 'История',
  culture: 'Культура',
  laws: 'Законодательство',
  geography: 'География',
  mixed: 'Все темы',
};

export async function fetchQuizQuestions(
  topic: string,
  limit = 10
): Promise<QuizQuestion[]> {
  let query = supabase
    .from('questions')
    .select('id, question, correct_answer, wrong_answers, explanation, topic')
    .order('random' as never);

  if (topic !== 'mixed') {
    query = query.eq('topic', topic);
  }

  // Use random ordering via RPC or fallback to limit
  const { data, error } = await supabase.rpc('get_random_questions', {
    p_topic: topic === 'mixed' ? null : topic,
    p_limit: limit,
  });

  if (error) {
    // Fallback: direct query without random RPC
    const { data: fallback, error: fallbackError } = await supabase
      .from('questions')
      .select('id, question, correct_answer, wrong_answers, explanation, topic')
      .eq(topic !== 'mixed' ? 'topic' : 'id', topic !== 'mixed' ? topic : supabase)
      .limit(limit);

    if (fallbackError) throw fallbackError;
    return shuffleArray((fallback ?? []) as QuizQuestion[]);
  }

  return (data ?? []) as QuizQuestion[];
}

export async function fetchQuestionsRandom(
  topic: string,
  limit = 10
): Promise<QuizQuestion[]> {
  let query = supabase
    .from('questions')
    .select('id, question, correct_answer, wrong_answers, explanation, topic');

  if (topic !== 'mixed') {
    query = query.eq('topic', topic);
  }

  const { data, error } = await query.limit(limit * 3); // fetch more, shuffle locally
  if (error) throw error;

  const all = (data ?? []) as QuizQuestion[];
  return shuffleArray(all).slice(0, limit);
}

export async function fetchDueFlashcards(
  userId: string,
  limit = 20
): Promise<FlashcardItem[]> {
  const { data, error } = await supabase
    .from('user_progress')
    .select(
      `
      question_id,
      srs_level,
      next_review_at,
      questions!inner(id, question, correct_answer, explanation, topic)
    `
    )
    .eq('user_id', userId)
    .or(`next_review_at.is.null,next_review_at.lte.${new Date().toISOString()}`)
    .limit(limit);

  if (error) throw error;

  return ((data ?? []) as unknown[]).map((row: unknown) => {
    const r = row as {
      question_id: string;
      srs_level: number;
      next_review_at: string | null;
      questions: {
        id: string;
        question: string;
        correct_answer: string;
        explanation: string | null;
        topic: string | null;
      };
    };
    return {
      question_id: r.question_id,
      question: r.questions.question,
      correct_answer: r.questions.correct_answer,
      explanation: r.questions.explanation,
      topic: r.questions.topic,
      srs_level: r.srs_level,
      next_review_at: r.next_review_at,
    };
  });
}

export async function fetchRandomFlashcards(limit = 20): Promise<FlashcardItem[]> {
  const { data, error } = await supabase
    .from('questions')
    .select('id, question, correct_answer, explanation, topic')
    .limit(limit * 3);

  if (error) throw error;

  const shuffled = shuffleArray(data ?? []).slice(0, limit) as {
    id: string;
    question: string;
    correct_answer: string;
    explanation: string | null;
    topic: string | null;
  }[];

  return shuffled.map((q) => ({
    question_id: q.id,
    question: q.question,
    correct_answer: q.correct_answer,
    explanation: q.explanation,
    topic: q.topic,
    srs_level: 0,
    next_review_at: null,
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
