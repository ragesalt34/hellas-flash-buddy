import { describe, expect, it, vi } from 'vitest';
import type { Flashcard, VocabCard } from '@shared/api';
import { memoryKV } from '../kv';
import { loadToday, withRetry } from './loader';

const card: Flashcard = {
  question_id: 'q1',
  question: 'Ποια;',
  correct_answer: 'Αθήνα',
  explanation: null,
  topic: 'geography',
  level: 2,
};
const word: VocabCard = { id: 5, word: 'σπίτι', ru: 'дом', note: null, topic: 'home', level: 0 };
const noSleep = async () => {};
const good = () => ({
  flashcards: vi.fn(async () => ({ cards: [card] })),
  vocab: vi.fn(async () => ({ cards: [word] })),
});
const down = () => ({
  flashcards: vi.fn(async (): Promise<{ cards: Flashcard[] }> => {
    throw new Error('down');
  }),
  vocab: vi.fn(async (): Promise<{ cards: VocabCard[] }> => {
    throw new Error('down');
  }),
});

describe('withRetry', () => {
  it('retries until success and reports each retry', async () => {
    let calls = 0;
    const onRetry = vi.fn();
    const v = await withRetry(
      async () => {
        if (++calls < 3) throw new Error('x');
        return 'ok';
      },
      { sleep: noSleep, onRetry },
    );
    expect(v).toBe('ok');
    expect(onRetry).toHaveBeenCalledTimes(2);
  });

  it('throws after the last attempt', async () => {
    await expect(
      withRetry(
        async () => {
          throw new Error('x');
        },
        { attempts: 2, sleep: noSleep },
      ),
    ).rejects.toThrow('x');
  });
});

describe('loadToday', () => {
  it('maps cards to study items and caches them', async () => {
    const store = memoryKV();
    const t = await loadToday(good(), store, 'acc', { sleep: noSleep });
    expect(t.offline).toBe(false);
    expect(t.exams[0]).toMatchObject({ key: 'q:q1', kind: 'exam', answer: 'Αθήνα', level: 2 });
    expect(t.words[0]).toMatchObject({ key: 'w:5', kind: 'word', prompt: 'σπίτι', answer: 'дом' });
    expect(store.getItem('hs_game_today_acc')).not.toBeNull();
  });

  it('falls back to the cache when the API stays down', async () => {
    const store = memoryKV();
    await loadToday(good(), store, 'acc', { sleep: noSleep });
    const t = await loadToday(down(), store, 'acc', { attempts: 2, sleep: noSleep });
    expect(t.offline).toBe(true);
    expect(t.words).toHaveLength(1);
  });

  it('throws no_data when the API is down and nothing is cached', async () => {
    await expect(loadToday(down(), memoryKV(), 'acc', { attempts: 1, sleep: noSleep })).rejects.toThrow('no_data');
  });
});
