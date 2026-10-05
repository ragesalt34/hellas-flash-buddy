import type { Flashcard, VocabCard } from '@shared/api';

export type ChallengeKind = 'word' | 'exam';

/** One thing to recall: a vocab word or an exam question, normalised. */
export interface StudyItem {
  key: string; // 'w:<vocabId>' | 'q:<questionId>'
  kind: ChallengeKind;
  id: string | number; // what the grade endpoint expects
  prompt: string;
  answer: string;
  explanation: string | null;
  topic: string | null;
  level: number; // SRS level, 0 = never seen
}

export interface Challenge {
  item: StudyItem;
  options: string[]; // shuffled, always contains item.answer
  graded: boolean; // false = practice, never sent to the server
}

export function fromFlashcard(f: Flashcard): StudyItem {
  return {
    key: `q:${f.question_id}`,
    kind: 'exam',
    id: f.question_id,
    prompt: f.question,
    answer: f.correct_answer,
    explanation: f.explanation,
    topic: f.topic,
    level: f.level ?? 0,
  };
}

export function fromVocab(v: VocabCard): StudyItem {
  return {
    key: `w:${v.id}`,
    kind: 'word',
    id: v.id,
    prompt: v.word,
    answer: v.ru,
    explanation: v.note,
    topic: v.topic,
    level: v.level ?? 0,
  };
}
