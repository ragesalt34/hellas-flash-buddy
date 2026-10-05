import { readJSON, writeJSON, type KV } from '../kv';
import type { ChallengeKind } from './types';

export interface Grade {
  kind: ChallengeKind;
  id: string | number;
  grade: 1 | 3;
}

export interface GradeSender {
  exam(id: string, grade: number): Promise<unknown>;
  word(id: number, grade: number): Promise<unknown>;
}

/** Sends SRS grades; anything that fails is kept in storage and retried by flush(). */
export class Grader {
  private readonly key: string;

  constructor(private readonly sender: GradeSender, private readonly store: KV, accountId: string) {
    this.key = `hs_game_grades_${accountId}`;
  }

  async submit(g: Grade): Promise<void> {
    try {
      await this.send(g);
    } catch {
      this.save([...this.pending(), g]);
    }
  }

  /** Retry buffered grades in order; returns how many went through. */
  async flush(): Promise<number> {
    const list = this.pending();
    if (list.length === 0) return 0;
    const left: Grade[] = [];
    let sent = 0;
    for (const g of list) {
      try {
        await this.send(g);
        sent++;
      } catch {
        left.push(g);
      }
    }
    this.save(left);
    return sent;
  }

  pending(): Grade[] {
    return readJSON<Grade[]>(this.store, this.key) ?? [];
  }

  private save(list: Grade[]): void {
    if (list.length > 0) writeJSON(this.store, this.key, list);
    else this.store.removeItem(this.key);
  }

  private send(g: Grade): Promise<unknown> {
    return g.kind === 'exam' ? this.sender.exam(String(g.id), g.grade) : this.sender.word(Number(g.id), g.grade);
  }
}
