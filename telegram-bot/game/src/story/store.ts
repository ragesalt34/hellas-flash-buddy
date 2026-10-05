import type { KV } from '../kv';
import { loadStory, saveStory, type StoryState } from './state';

/** The one mutable holder of story state: persists every change and notifies React. */
export class StoryStore {
  private state: StoryState;
  private ver = 0;
  private readonly listeners = new Set<() => void>();

  constructor(private readonly accountId: string, private readonly storage: KV) {
    this.state = loadStory(storage, accountId);
  }

  get(): StoryState {
    return this.state;
  }

  version = (): number => this.ver;

  subscribe = (fn: () => void): (() => void) => {
    this.listeners.add(fn);
    return () => {
      this.listeners.delete(fn);
    };
  };

  update(fn: (s: StoryState) => StoryState): void {
    const next = fn(this.state);
    if (next === this.state) return;
    this.state = next;
    saveStory(this.storage, this.accountId, next);
    this.ver++;
    for (const l of [...this.listeners]) l();
  }
}
