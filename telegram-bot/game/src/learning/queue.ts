import { buildOptions } from './options';
import type { Challenge, ChallengeKind, StudyItem } from './types';

export const NEW_CAP = 5;

/** Today's items from one pool: every due review plus at most NEW_CAP unseen. */
export function selectToday(items: StudyItem[]): StudyItem[] {
  const reviews = items.filter((i) => i.level >= 1);
  const fresh = items.filter((i) => i.level < 1).slice(0, NEW_CAP);
  return [...reviews, ...fresh];
}

export class DailyQueue {
  private readonly pool: Record<ChallengeKind, StudyItem[]>;
  private readonly pending: Record<ChallengeKind, StudyItem[]>;
  private readonly finished: Record<ChallengeKind, StudyItem[]> = { word: [], exam: [] };
  private readonly graded = new Set<string>();
  readonly total: number;
  done = 0;

  constructor(words: StudyItem[], exams: StudyItem[], private readonly rng: () => number = Math.random) {
    this.pool = { word: words, exam: exams };
    this.pending = { word: selectToday(words), exam: selectToday(exams) };
    this.total = this.pending.word.length + this.pending.exam.length;
  }

  get remaining(): number {
    return this.pending.word.length + this.pending.exam.length;
  }

  next(kind: ChallengeKind | 'any', preferTopics: string[] = []): Challenge | null {
    const k = this.resolveKind(kind);
    if (!k) return null;
    const pending = this.pending[k];
    if (pending.length > 0) {
      const item = pending.find((i) => i.topic !== null && preferTopics.includes(i.topic)) ?? pending[0];
      return { item, options: buildOptions(item, this.pool[k], this.rng), graded: !this.graded.has(item.key) };
    }
    // Nothing due: practise what was already answered today, never graded.
    const practice = this.finished[k].length > 0 ? this.finished[k] : this.pool[k];
    const item = practice[Math.floor(this.rng() * practice.length)];
    return { item, options: buildOptions(item, this.pool[k], this.rng), graded: false };
  }

  answer(challenge: Challenge, correct: boolean): void {
    const { item } = challenge;
    const pending = this.pending[item.kind];
    const idx = pending.findIndex((i) => i.key === item.key);
    if (idx === -1) return; // practice item — nothing to track
    this.graded.add(item.key);
    pending.splice(idx, 1);
    if (correct) {
      this.finished[item.kind].push(item);
      this.done++;
    } else {
      pending.push(item); // comes back at the end of the queue
    }
  }

  private resolveKind(kind: ChallengeKind | 'any'): ChallengeKind | null {
    let order: ChallengeKind[];
    if (kind === 'any') order = this.pending.exam.length > this.pending.word.length ? ['exam', 'word'] : ['word', 'exam'];
    else order = kind === 'word' ? ['word', 'exam'] : ['exam', 'word'];
    return order.find((k) => this.pool[k].length > 0) ?? null;
  }
}
