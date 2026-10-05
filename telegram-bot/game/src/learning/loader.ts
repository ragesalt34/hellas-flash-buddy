import type { Flashcard, VocabCard } from '@shared/api';
import { readJSON, writeJSON, type KV } from '../kv';
import { fromFlashcard, fromVocab, type StudyItem } from './types';

export interface RetryOptions {
  attempts?: number;
  delayMs?: number;
  sleep?: (ms: number) => Promise<void>;
  onRetry?: (attempt: number) => void;
}

const defaultSleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

/** Defaults cover a sleeping Render instance: 18 tries x 5 s = 90 s. */
export async function withRetry<T>(fn: () => Promise<T>, opts: RetryOptions = {}): Promise<T> {
  const { attempts = 18, delayMs = 5000, sleep = defaultSleep, onRetry } = opts;
  for (let i = 1; ; i++) {
    try {
      return await fn();
    } catch (e) {
      if (i >= attempts) throw e;
      onRetry?.(i);
      await sleep(delayMs);
    }
  }
}

export interface Fetchers {
  flashcards(): Promise<{ cards: Flashcard[] }>;
  vocab(): Promise<{ cards: VocabCard[] }>;
}

export interface Today {
  words: StudyItem[];
  exams: StudyItem[];
  offline: boolean;
}

export async function loadToday(f: Fetchers, store: KV, accountId: string, opts: RetryOptions = {}): Promise<Today> {
  const key = `hs_game_today_${accountId}`;
  try {
    const [fc, vc] = await withRetry(() => Promise.all([f.flashcards(), f.vocab()]), opts);
    const today = { words: vc.cards.map(fromVocab), exams: fc.cards.map(fromFlashcard) };
    writeJSON(store, key, today);
    return { ...today, offline: false };
  } catch {
    const cached = readJSON<Omit<Today, 'offline'>>(store, key);
    if (cached) return { ...cached, offline: true };
    throw new Error('no_data');
  }
}
