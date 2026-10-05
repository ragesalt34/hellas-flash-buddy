import { describe, expect, it } from 'vitest';
import { memoryKV } from './kv';
import { loadSave, newSave, writeSave } from './save';

describe('save', () => {
  it('starts a new game when nothing is stored', () => {
    expect(loadSave(memoryKV(), 'a')).toEqual(newSave());
  });

  it('starts a new game when the stored data is corrupt', () => {
    const store = memoryKV();
    store.setItem('hs_game_save_a', '{oops');
    expect(loadSave(store, 'a')).toEqual(newSave());
  });

  it('round-trips and keeps accounts apart', () => {
    const store = memoryKV();
    const s = newSave();
    s.abilities.dash = true;
    s.amphorae.push('amph_harbor');
    writeSave(store, 'a', s);
    expect(loadSave(store, 'a')).toEqual(s);
    expect(loadSave(store, 'b')).toEqual(newSave());
  });

  it('hands out independent copies of the new game', () => {
    newSave().amphorae.push('x');
    expect(newSave().amphorae).toEqual([]);
  });
});
