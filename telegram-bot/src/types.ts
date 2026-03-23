export interface TelegramUser {
  telegram_id: number;
  user_id: string | null;
  username: string | null;
  display_name: string | null;
  remind_time: string | null;
  remind_tz: string;
  created_at: string;
  updated_at: string;
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

export interface QuizSession {
  id: string;
  telegram_id: number;
  topic: string;
  questions: QuizQuestion[];
  current_index: number;
  score: number;
  answers: AnswerRecord[];
  last_message_id: number | null;
  current_answer_order: string[] | null;
  started_at: string;
  completed_at: string | null;
}

export interface FlashcardItem {
  question_id: string;
  question: string;
  correct_answer: string;
  explanation: string | null;
  topic: string | null;
  srs_level: number;
  next_review_at: string | null;
}
