import { test } from 'node:test';
import assert from 'node:assert/strict';
import { isDueAt, reviewStep, RELEARN_MS, SRS_INTERVALS_MS } from './srs';

const NOW = Date.parse('2026-09-30T12:00:00Z');
const inMs = (ms: number) => new Date(NOW + ms).toISOString();

test('isDueAt: missing or broken timestamps are due', () => {
  assert.equal(isDueAt(null, NOW), true);
  assert.equal(isDueAt('not a date', NOW), true);
  assert.equal(isDueAt(inMs(-1), NOW), true);
  assert.equal(isDueAt(inMs(60_000), NOW), false);
});

test('new card: good goes to level 1, due in an hour', () => {
  const s = reviewStep(null, 2, NOW);
  assert.equal(s.level, 1);
  assert.equal(s.next_review_at, inMs(SRS_INTERVALS_MS[1]));
});

test('due card answered well moves up', () => {
  const s = reviewStep({ level: 2, next_review_at: inMs(-1000) }, 2, NOW);
  assert.equal(s.level, 3);
  assert.equal(s.next_review_at, inMs(SRS_INTERVALS_MS[3]));
});

test('early correct answer holds level and schedule (quiz cramming)', () => {
  const prev = { level: 1, next_review_at: inMs(30 * 60_000) };
  assert.deepEqual(reviewStep(prev, 2, NOW), prev);
  assert.deepEqual(reviewStep(prev, 3, NOW), prev);
  // three quizzes in one evening no longer reach "strong"
  let p = reviewStep(null, 2, NOW);
  p = reviewStep(p, 2, NOW + 60_000);
  p = reviewStep(p, 2, NOW + 120_000);
  assert.equal(p.level, 1);
});

test('a miss counts even when early: drops two levels, back in ten minutes', () => {
  const s = reviewStep({ level: 5, next_review_at: inMs(10 * 86_400_000) }, 1, NOW);
  assert.equal(s.level, 3);
  assert.equal(s.next_review_at, inMs(RELEARN_MS));
});

test('broken stored schedule is treated as due', () => {
  const s = reviewStep({ level: 2, next_review_at: 'garbage' }, 2, NOW);
  assert.equal(s.level, 3);
});
