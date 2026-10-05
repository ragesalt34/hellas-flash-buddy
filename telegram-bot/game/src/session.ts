import { api, clearCache, type MeResponse } from '@shared/api';
import { clearToken } from '@shared/auth';
import { bus } from './bus';
import { readJSON, writeJSON } from './kv';
import { ChallengeController } from './learning/controller';
import { Grader } from './learning/grader';
import { loadToday, withRetry } from './learning/loader';
import { DailyQueue } from './learning/queue';

export const GUEST_KEY = 'hs_game_guest';
const ME_KEY = 'hs_game_me';

export interface Session {
  accountId: string;
  streak: number;
  offline: boolean;
  controller: ChallengeController;
  stop(): void;
}

async function loadMe(onRetry: (attempt: number) => void): Promise<{ me: MeResponse; offline: boolean }> {
  try {
    const me = await withRetry(() => api.me(), { onRetry });
    writeJSON(localStorage, ME_KEY, me);
    return { me, offline: false };
  } catch {
    const me = readJSON<MeResponse>(localStorage, ME_KEY);
    if (!me) throw new Error('no_data');
    return { me, offline: true };
  }
}

export async function startSession(onRetry: (attempt: number) => void): Promise<Session> {
  const store = localStorage;
  const { me, offline } = await loadMe(onRetry);
  const accountId = me.user.id;
  const today = await loadToday(
    { flashcards: api.flashcards, vocab: api.vocab },
    store,
    accountId,
    offline ? { attempts: 1 } : { onRetry },
  );

  const grader = new Grader({ exam: api.flashcardGrade, word: api.vocabGrade }, store, accountId);
  void grader.flush();
  const flushTimer = window.setInterval(() => void grader.flush(), 60_000);

  const controller = new ChallengeController(new DailyQueue(today.words, today.exams), grader, bus);
  const unsubscribe = controller.start();

  return {
    accountId,
    streak: me.streak,
    offline: offline || today.offline,
    controller,
    stop() {
      unsubscribe();
      window.clearInterval(flushTimer);
    },
  };
}

export function logout(): void {
  clearToken();
  clearCache();
  localStorage.removeItem(GUEST_KEY);
  localStorage.removeItem(ME_KEY);
  window.location.reload();
}
