// Core domain types for the Hellas Study API (account-based, no Telegram).

export interface Account {
  id: string; // uuid
  username: string;
  display_name: string | null;
  is_guest: boolean;
}

export interface QuizQuestion {
  id: string;
  question: string;
  correct_answer: string;
  wrong_answers: string[];
  explanation: string | null;
  topic: string | null;
}

export interface AnswerRecord {
  question_id: string;
  chosen: string;
  correct: boolean;
  correct_answer: string;
}

export interface FlashcardItem {
  question_id: string;
  question: string;
  correct_answer: string;
  explanation: string | null;
  topic: string | null;
  /** Current SRS level (0 for unseen) — lets the client show real next-review intervals per grade. */
  level: number;
}
