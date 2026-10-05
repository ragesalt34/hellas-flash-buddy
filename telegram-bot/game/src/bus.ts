import type { ChallengeKind } from './learning/types';

export type ChallengeSource = 'historian';
export type ToastKey = 'newWords' | 'itemGot' | 'pageSolved' | 'pageWrong' | 'examDone';

export interface BusEvents {
  'challenge:request': {
    requestId: string;
    source: ChallengeSource;
    kind: ChallengeKind | 'any';
    preferTopics?: string[];
  };
  'challenge:result': { requestId: string; correct: boolean };
  /** World → UI: the player pressed E next to an NPC or object. */
  'npc:talk': { npcId: string };
  /** World → UI: the closest talkable thing changed. */
  'world:near': { npcId: string | null };
  /** UI → world: stop/resume movement and E. */
  'world:freeze': { frozen: boolean };
  /** UI → world: story flags changed (re-check doors and bars). */
  'world:flags': Record<string, never>;
  /** World → UI: the player walked through the open gate. */
  'chapter:end': Record<string, never>;
  toast: { key: ToastKey; value?: string };
}

type Handler<T> = (payload: T) => void;

/** Tiny typed pub/sub — the only channel between the 3D world and the React overlay. */
export class Bus {
  private handlers = new Map<keyof BusEvents, Set<Handler<never>>>();

  on<K extends keyof BusEvents>(event: K, fn: Handler<BusEvents[K]>): () => void {
    let set = this.handlers.get(event);
    if (!set) {
      set = new Set();
      this.handlers.set(event, set);
    }
    const handlers = set as Set<Handler<BusEvents[K]>>;
    handlers.add(fn);
    return () => {
      handlers.delete(fn);
    };
  }

  emit<K extends keyof BusEvents>(event: K, payload: BusEvents[K]): void {
    const set = this.handlers.get(event) as Set<Handler<BusEvents[K]>> | undefined;
    if (!set) return;
    for (const fn of [...set]) fn(payload);
  }
}

export const bus = new Bus();
