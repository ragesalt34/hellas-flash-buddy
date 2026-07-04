import { tg } from './telegram';
import { getStoredLanguage } from './i18n';
import { getToken } from './auth';

// Backend base URL — the bot's public API (Render). Set at build time.
const API_BASE = ((import.meta.env.VITE_API_BASE as string | undefined) ?? '').replace(/\/$/, '');

// Anonymous guest access: a shared app secret gates the demo sandbox. The
// server pins the guest to a fixed sandbox id and ignores any client-supplied
// id, so this secret being public (it ships in the bundle) can't be used to
// reach a real account. Signed-in accounts use X-Web-Token; Telegram uses
// initData, both of which take precedence below.
const APP_SECRET = (import.meta.env.VITE_APP_SECRET as string | undefined) ?? '';

// ---- Lightweight client cache (stale-while-revalidate) ----
// Read-only dashboard data (me/stats/history) is cached in memory + localStorage
// so switching sections paints instantly while fresh data loads in the background.
const mem = new Map<string, unknown>();

export function cacheGet<T>(key: string): T | undefined {
  if (mem.has(key)) return mem.get(key) as T;
  try {
    const s = localStorage.getItem(`hs_cache_${key}`);
    if (s) {
      const v = JSON.parse(s) as T;
      mem.set(key, v);
      return v;
    }
  } catch {
    /* ignore */
  }
  return undefined;
}

export function cacheSet<T>(key: string, value: T): void {
  mem.set(key, value);
  try {
    localStorage.setItem(`hs_cache_${key}`, JSON.stringify(value));
  } catch {
    /* ignore quota / private-mode errors */
  }
}

/** Drop all cached dashboard data — must be called on login/logout so the new
 * account doesn't briefly see the previous user's numbers. */
export function clearCache(): void {
  mem.clear();
  try {
    Object.keys(localStorage)
      .filter((k) => k.startsWith('hs_cache_'))
      .forEach((k) => localStorage.removeItem(k));
  } catch {
    /* ignore */
  }
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };
  const initData = tg?.initData ?? '';
  const webToken = getToken();
  if (initData) {
    headers['X-Telegram-Init-Data'] = initData;
  } else if (webToken) {
    // Signed-in web account takes precedence over the shared guest secret.
    headers['X-Web-Token'] = webToken;
  } else if (APP_SECRET) {
    // Guest sandbox — the server assigns the id, we only present the secret.
    headers['X-App-Secret'] = APP_SECRET;
  }

  // Tag every request with the current UI language so quiz/flashcard content
  // and topic labels come back in the right language (server defaults to 'el').
  const sep = path.includes('?') ? '&' : '?';
  const url = `${API_BASE}/api${path}${sep}lang=${getStoredLanguage()}`;

  const res = await fetch(url, { ...options, headers });
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`API ${res.status}: ${body || res.statusText}`);
  }
  return res.json() as Promise<T>;
}

export const api = {
  register: (username: string, password: string) =>
    request<AuthResponse>('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    }),
  login: (username: string, password: string) =>
    request<AuthResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    }),
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
export interface AuthResponse {
  token: string;
  user: { id: number; name: string };
}
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
