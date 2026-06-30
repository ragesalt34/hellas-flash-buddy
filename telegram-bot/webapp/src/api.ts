import { tg } from './telegram';

// Backend base URL — the bot's public API (Render). Set at build time.
const API_BASE = ((import.meta.env.VITE_API_BASE as string | undefined) ?? '').replace(/\/$/, '');

// Standalone website auth: shared app secret + the account's numeric id (same
// scheme the native app uses; backend checks X-App-Secret in constant time).
// Inside Telegram, initData takes precedence if present.
const APP_SECRET = (import.meta.env.VITE_APP_SECRET as string | undefined) ?? '';
const USER_ID =
  new URLSearchParams(location.search).get('devUserId') ??
  ((import.meta.env.VITE_USER_ID as string | undefined) || '');

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };
  const initData = tg?.initData ?? '';
  if (initData) {
    headers['X-Telegram-Init-Data'] = initData;
  } else {
    if (APP_SECRET) headers['X-App-Secret'] = APP_SECRET;
    if (USER_ID) headers['X-App-User-Id'] = USER_ID;
  }

  const res = await fetch(`${API_BASE}/api${path}`, { ...options, headers });
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`API ${res.status}: ${body || res.statusText}`);
  }
  return res.json() as Promise<T>;
}

export const api = {
  me: () => request<MeResponse>('/me'),
  quiz: (topic: string, limit = 10) =>
    request<QuizResponse>(`/quiz?topic=${encodeURIComponent(topic)}&limit=${limit}`),
  quizComplete: (body: QuizCompleteBody) =>
    request<{ ok: boolean }>('/quiz/complete', { method: 'POST', body: JSON.stringify(body) }),
  flashcards: () => request<{ cards: Flashcard[] }>('/flashcards'),
  flashcardGrade: (questionId: string, grade: number) =>
    request<{ ok: boolean }>('/flashcards/grade', {
      method: 'POST',
      body: JSON.stringify({ questionId, grade }),
    }),
  vocab: () => request<{ cards: VocabCard[]; stats: VocabStats }>('/vocab'),
  vocabGrade: (vocabId: number, grade: number) =>
    request<{ ok: boolean; stats: VocabStats }>('/vocab/grade', {
      method: 'POST',
      body: JSON.stringify({ vocabId, grade }),
    }),
  stats: () => request<StatsResponse>('/stats'),
  history: () => request<HistoryResponse>('/history'),
  tts: (text: string, cacheKey: string) =>
    request<{ audioUrl: string }>('/tts', {
      method: 'POST',
      body: JSON.stringify({ text, cacheKey }),
    }),
};

// ---- Shared types ----
export interface UserStats {
  total_sessions: number;
  total_questions: number;
  total_correct: number;
  by_topic: Record<string, { sessions: number; correct: number; total: number }>;
  last_activity: string | null;
}
export interface VocabStats {
  seen: number;
  mastered: number;
  total: number;
}
export interface MeResponse {
  user: { id: number; name: string; username: string | null };
  stats: UserStats;
  streak: number;
  vocab: VocabStats;
  topicLabels: Record<string, string>;
}
export interface QuizQuestion {
  id: string;
  question: string;
  options: string[];
  correct_answer: string;
  explanation: string | null;
  topic: string | null;
}
export interface QuizResponse {
  topic: string;
  topicLabel: string;
  questions: QuizQuestion[];
}
export interface QuizCompleteBody {
  topic: string;
  score: number;
  answers: { question_id: string; chosen: string; correct: boolean; correct_answer: string }[];
  questions: { id: string }[];
}
export interface Flashcard {
  question_id: string;
  question: string;
  correct_answer: string;
  explanation: string | null;
  topic: string | null;
}
export interface VocabCard {
  id: number;
  word: string;
  ru: string;
  note: string | null;
  topic: string;
}
export interface StatsResponse {
  stats: UserStats;
  streak: number;
  vocab: VocabStats;
  topicLabels: Record<string, string>;
}
export interface HistoryResponse {
  sessions: { topic: string; score: number; total: number; completed_at: string }[];
  topicLabels: Record<string, string>;
}
