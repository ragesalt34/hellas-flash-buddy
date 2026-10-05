import { START, type SceneId } from '../content/chapter1';
import { readJSON, writeJSON, type KV } from '../kv';
import type { WorldState } from './dialogue';
import { emptyJournal, type JournalState } from './journal';
import { emptyRequests, type RequestsState } from './requests';
import type { SrsState } from './wordSrs';

export interface StoryState {
  version: 1;
  scene: SceneId;
  x: number;
  z: number;
  world: WorldState;
  journal: JournalState;
  srs: SrsState;
  requests: RequestsState;
  examDay: string;
  examDone: number;
  chapterDone: boolean;
}

export function newStory(): StoryState {
  return {
    version: 1,
    scene: START.scene,
    x: START.x,
    z: START.z,
    world: { flags: [], inventory: [] },
    journal: emptyJournal(),
    srs: {},
    requests: emptyRequests(),
    examDay: '',
    examDone: 0,
    chapterDone: false,
  };
}

const key = (accountId: string) => `hs_sennaar_save_${accountId}`;

export function loadStory(store: KV, accountId: string): StoryState {
  const s = readJSON<StoryState>(store, key(accountId));
  if (!s || s.version !== 1) return newStory();
  const base = newStory();
  return {
    ...base,
    ...s,
    world: { ...base.world, ...s.world },
    journal: { ...base.journal, ...s.journal },
    requests: { ...base.requests, ...s.requests },
  };
}

export function saveStory(store: KV, accountId: string, s: StoryState): void {
  writeJSON(store, key(accountId), s);
}
