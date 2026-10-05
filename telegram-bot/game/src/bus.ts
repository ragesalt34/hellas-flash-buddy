import type { ChallengeKind } from './learning/types';

export type ChallengeSource = 'altar' | 'shield' | 'amphora' | 'boss';
export type ToastKey =
  | 'abilityDash'
  | 'abilityDoubleJump'
  | 'altarProgress'
  | 'heartUp'
  | 'wallBroken'
  | 'shieldDown'
  | 'died';

export interface HudState {
  hp: number;
  maxHp: number;
  dash: boolean;
  doubleJump: boolean;
  room: string;
}

export interface BusEvents {
  'challenge:request': {
    requestId: string;
    source: ChallengeSource;
    kind: ChallengeKind | 'any';
    preferTopics?: string[];
  };
  'challenge:result': { requestId: string; correct: boolean };
  'hud:update': HudState;
  'game:pause': { paused: boolean };
  toast: { key: ToastKey; value?: string };
  'boss:defeated': { room: string };
}

type Handler<T> = (payload: T) => void;

/** Tiny typed pub/sub — the only channel between the Phaser world and the React overlay. */
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
