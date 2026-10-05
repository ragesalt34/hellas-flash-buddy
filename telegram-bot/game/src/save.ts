import { readJSON, writeJSON, type KV } from './kv';

export type AbilityId = 'dash' | 'doubleJump';

/** World progress only — learning progress lives on the server. */
export interface SaveData {
  version: 1;
  room: string; // checkpoint: the last room entered...
  x: number; // ...and where the player entered it
  y: number;
  abilities: Record<AbilityId, boolean>;
  maxHp: number;
  altarProgress: Record<AbilityId, number>;
  amphorae: string[];
  walls: string[];
  bossDefeated: boolean;
}

export function newSave(): SaveData {
  return {
    version: 1,
    room: 'P1',
    x: 320,
    y: 470,
    abilities: { dash: false, doubleJump: false },
    maxHp: 3,
    altarProgress: { dash: 0, doubleJump: 0 },
    amphorae: [],
    walls: [],
    bossDefeated: false,
  };
}

const key = (accountId: string) => `hs_game_save_${accountId}`;

export function loadSave(store: KV, accountId: string): SaveData {
  const s = readJSON<SaveData>(store, key(accountId));
  return s && s.version === 1 ? { ...newSave(), ...s } : newSave();
}

export function writeSave(store: KV, accountId: string, data: SaveData): void {
  writeJSON(store, key(accountId), data);
}
