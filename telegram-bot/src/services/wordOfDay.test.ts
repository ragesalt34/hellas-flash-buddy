import { test } from 'node:test';
import assert from 'node:assert/strict';
import { pickWordOfDay } from './wordOfDay';
import { VOCABULARY } from '../data/vocabulary';

test('same day gives the same word, from the list', () => {
  const a = pickWordOfDay('2026-10-02', VOCABULARY);
  assert.equal(a.id, pickWordOfDay('2026-10-02', VOCABULARY).id);
  assert.ok(VOCABULARY.includes(a));
});

test('the word changes from day to day', () => {
  const days = ['01', '02', '03', '04', '05', '06', '07'];
  const ids = new Set(days.map((d) => pickWordOfDay(`2026-10-${d}`, VOCABULARY).id));
  assert.equal(ids.size, days.length);
});

test('a whole cycle shows every word once', () => {
  const seen = new Set<number>();
  let key = '2026-01-01';
  for (let i = 0; i < VOCABULARY.length; i++) {
    seen.add(pickWordOfDay(key, VOCABULARY).id);
    const t = Date.parse(key + 'T00:00:00Z') + 86_400_000;
    key = new Date(t).toISOString().slice(0, 10);
  }
  assert.equal(seen.size, VOCABULARY.length);
});
