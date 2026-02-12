/**
 * Helper to pick localized question fields based on current language.
 * Falls back to Russian (default) fields if Greek translations are not available.
 */

type QuestionRow = {
  question: string;
  correct_answer: string;
  wrong_answers: string[];
  explanation: string | null;
  question_el?: string | null;
  correct_answer_el?: string | null;
  wrong_answers_el?: string[] | null;
  explanation_el?: string | null;
  [key: string]: unknown;
};

export function localizeQuestion<T extends QuestionRow>(q: T, language: string): T {
  if (language === 'el') {
    return {
      ...q,
      question: q.question_el || q.question,
      correct_answer: q.correct_answer_el || q.correct_answer,
      wrong_answers: (q.wrong_answers_el && q.wrong_answers_el.length > 0) ? q.wrong_answers_el : q.wrong_answers,
      explanation: q.explanation_el ?? q.explanation,
    };
  }
  return q;
}

export function localizeQuestions<T extends QuestionRow>(questions: T[], language: string): T[] {
  return questions.map(q => localizeQuestion(q, language));
}
