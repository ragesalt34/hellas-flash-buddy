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

  const { data, error } = await query; // fetch all, shuffle locally for true randomness
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

  return ((data ?? []) as unknown[])
    .filter((row: unknown) => {
      const r = row as { questions?: unknown };
      return r.questions != null;
    })
    .map((row: unknown) => {
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
    .select('id, question, correct_answer, explanation, topic');

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

// SRS intervals: grade 1 (Hard) resets, grade 2 (Good) advances +1, grade 3 (Easy) advances +2
const SRS_INTERVALS_MS = [
  1 * 60 * 1000,            // level 0 → 1 min
  10 * 60 * 1000,           // level 1 → 10 min
  24 * 60 * 60 * 1000,      // level 2 → 1 day
  3 * 24 * 60 * 60 * 1000,  // level 3 → 3 days
  7 * 24 * 60 * 60 * 1000,  // level 4 → 7 days
  14 * 24 * 60 * 60 * 1000, // level 5 → 14 days
  30 * 24 * 60 * 60 * 1000, // level 6 → 30 days
];

export function computeNextReview(
  currentLevel: number,
  grade: number
): { newLevel: number; nextReviewAt: string } {
  let newLevel: number;
  if (grade === 1) {
    newLevel = 0;
  } else if (grade === 3) {
    newLevel = Math.min(currentLevel + 2, SRS_INTERVALS_MS.length - 1);
  } else {
    newLevel = Math.min(currentLevel + 1, SRS_INTERVALS_MS.length - 1);
  }

  const interval = SRS_INTERVALS_MS[newLevel] ?? SRS_INTERVALS_MS[SRS_INTERVALS_MS.length - 1];
  const nextReviewAt = new Date(Date.now() + interval).toISOString();
  return { newLevel, nextReviewAt };
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
