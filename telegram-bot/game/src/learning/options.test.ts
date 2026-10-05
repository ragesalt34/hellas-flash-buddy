import { describe, expect, it } from 'vitest';
import { buildOptions } from './options';
import type { StudyItem } from './types';

const item = (key: string, answer: string, topic = 'home'): StudyItem => ({
  key,
  kind: 'word',
  id: key,
  prompt: `p-${key}`,
  answer,
  explanation: null,
  topic,
  level: 0,
});
const first = () => 0;

describe('buildOptions', () => {
  it('returns the answer plus three unique distractors', () => {
    const target = item('a', 'дом');
    const pool = [target, item('b', 'кот'), item('c', 'мама'), item('d', 'вода'), item('e', 'хлеб')];
    const opts = buildOptions(target, pool, first);
    expect(opts).toHaveLength(4);
    expect(opts).toContain('дом');
    expect(new Set(opts).size).toBe(4);
  });

  it('takes distractors from the same topic first', () => {
    const target = item('a', 'дом', 'home');
    const pool = [
      target,
      item('b', 'окно', 'home'),
      item('c', 'дверь', 'home'),
      item('d', 'стол', 'home'),
      item('e', 'море', 'nature'),
      item('f', 'гора', 'nature'),
    ];
    const opts = buildOptions(target, pool, first);
    expect(opts.sort()).toEqual(['дверь', 'дом', 'окно', 'стол'].sort());
  });

  it('skips answers that only differ by case or spaces', () => {
    const target = item('a', 'дом');
    const pool = [target, item('b', ' Дом '), item('c', 'кот')];
    expect(buildOptions(target, pool, first).sort()).toEqual(['дом', 'кот'].sort());
  });

  it('returns fewer options when the pool is small', () => {
    const target = item('a', 'дом');
    expect(buildOptions(target, [target, item('b', 'кот')], first)).toHaveLength(2);
  });
});
