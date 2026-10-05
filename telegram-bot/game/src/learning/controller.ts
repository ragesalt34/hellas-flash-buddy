import type { Bus, BusEvents, ChallengeSource } from '../bus';
import type { Grader } from './grader';
import type { DailyQueue } from './queue';
import type { Challenge } from './types';

export interface ActiveChallenge {
  requestId: string;
  source: ChallengeSource;
  challenge: Challenge;
  picked: string | null;
  correct: boolean;
}

/** Turns world requests into dialogs: queue -> UI -> grade -> result back to the world. */
export class ChallengeController {
  private active: ActiveChallenge | null = null;
  private ver = 0;
  private readonly listeners = new Set<() => void>();

  constructor(
    private readonly queue: DailyQueue,
    private readonly grader: Pick<Grader, 'submit'>,
    private readonly bus: Bus,
  ) {}

  start(): () => void {
    return this.bus.on('challenge:request', (r) => this.handle(r));
  }

  current(): ActiveChallenge | null {
    return this.active;
  }

  /** Bumps on every change — a stable snapshot for useSyncExternalStore. */
  version(): number {
    return this.ver;
  }

  subscribe = (fn: () => void): (() => void) => {
    this.listeners.add(fn);
    return () => {
      this.listeners.delete(fn);
    };
  };

  progress(): { done: number; total: number } {
    return { done: this.queue.done, total: this.queue.total };
  }

  answer(choice: string): boolean {
    const a = this.active;
    if (!a) return false;
    if (a.picked !== null) return a.correct;
    const { challenge } = a;
    a.picked = choice;
    a.correct = choice === challenge.item.answer;
    this.queue.answer(challenge, a.correct);
    if (challenge.graded) {
      void this.grader.submit({ kind: challenge.item.kind, id: challenge.item.id, grade: a.correct ? 3 : 1 });
    }
    this.notify();
    return a.correct;
  }

  close(): void {
    const a = this.active;
    if (!a || a.picked === null) return;
    this.active = null;
    this.notify();
    this.bus.emit('challenge:result', { requestId: a.requestId, correct: a.correct });
  }

  private handle(req: BusEvents['challenge:request']): void {
    if (this.active) {
      this.bus.emit('challenge:result', { requestId: req.requestId, correct: false });
      return;
    }
    const challenge = this.queue.next(req.kind, req.preferTopics);
    if (!challenge) {
      // No cards at all (fresh offline install): never block the game.
      this.bus.emit('challenge:result', { requestId: req.requestId, correct: true });
      return;
    }
    this.active = { requestId: req.requestId, source: req.source, challenge, picked: null, correct: false };
    this.notify();
  }

  private notify(): void {
    this.ver++;
    for (const fn of [...this.listeners]) fn();
  }
}
