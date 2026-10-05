import { describe, expect, it, vi } from 'vitest';
import { memoryKV } from '../kv';
import { loadStory, newStory } from './state';
import { StoryStore } from './store';

describe('StoryStore', () => {
  it('persists updates and notifies subscribers', () => {
    const kv = memoryKV();
    const store = new StoryStore('acc', kv);
    const fn = vi.fn();
    store.subscribe(fn);
    store.update((s) => ({ ...s, scene: 'fish' }));
    expect(fn).toHaveBeenCalledTimes(1);
    expect(store.version()).toBe(1);
    expect(loadStory(kv, 'acc').scene).toBe('fish');
  });

  it('skips no-op updates', () => {
    const store = new StoryStore('acc', memoryKV());
    const fn = vi.fn();
    store.subscribe(fn);
    store.update((s) => s);
    expect(fn).not.toHaveBeenCalled();
  });

  it('starts a new story from corrupt data', () => {
    const kv = memoryKV();
    kv.setItem('hs_sennaar_save_acc', '{nope');
    expect(new StoryStore('acc', kv).get()).toEqual(newStory());
  });
});
