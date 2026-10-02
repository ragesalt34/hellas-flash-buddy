import { test } from 'node:test';
import assert from 'node:assert/strict';
import { countDay, dueToday } from './dayRule';

const TZ = 'Europe/Athens'; // UTC+3 in October
const NOW = new Date('2026-10-02T09:00:00Z'); // 12:00 local

test('a card scheduled for later today is due now (calendar day)', () => {
  assert.equal(dueToday({ next_review_at: '2026-10-02T17:00:00Z', updated_at: '2026-10-01T17:00:00Z' }, NOW, TZ), true);
});

test('tomorrow is not due; overdue and missing times are', () => {
  assert.equal(dueToday({ next_review_at: '2026-10-03T06:00:00Z', updated_at: null }, NOW, TZ), false);
  assert.equal(dueToday({ next_review_at: '2026-09-30T06:00:00Z', updated_at: null }, NOW, TZ), true);
  assert.equal(dueToday({ next_review_at: null }, NOW, TZ), true);
});

test('local midnight, not UTC: 23:30 UTC on the 2nd is already the 3rd in Athens', () => {
  assert.equal(dueToday({ next_review_at: '2026-10-02T21:30:00Z', updated_at: null }, NOW, TZ), false);
});

test('a card touched today follows its exact time (learning steps)', () => {
  const step = { next_review_at: '2026-10-02T09:10:00Z', updated_at: '2026-10-02T09:00:00Z' };
  assert.equal(dueToday(step, NOW, TZ), false);
  assert.equal(dueToday(step, new Date('2026-10-02T09:11:00Z'), TZ), true);
});

test('countDay: left, done and first seen today', () => {
  const rows = [
    { next_review_at: '2026-10-01T06:00:00Z', updated_at: '2026-09-30T06:00:00Z' }, // overdue -> left
    { next_review_at: '2026-10-02T15:00:00Z', updated_at: '2026-10-01T15:00:00Z' }, // later today -> left
    { next_review_at: '2026-10-02T09:10:00Z', updated_at: '2026-10-02T08:59:00Z' }, // reviewed today -> done
    { next_review_at: '2026-10-02T10:00:00Z', updated_at: '2026-10-02T08:50:00Z', first_seen_at: '2026-10-02T08:50:00Z' }, // new today
    { next_review_at: '2026-10-05T06:00:00Z', updated_at: '2026-09-28T06:00:00Z' }, // future -> nothing
  ];
  assert.deepEqual(countDay(rows, NOW, TZ, true), { left: 2, done: 1, fresh: 1 });
  // before the first_seen_at column exists, the new card counts as done
  assert.deepEqual(countDay(rows, NOW, TZ, false), { left: 2, done: 2, fresh: 0 });
});

test('studying never raises what is left', () => {
  const before = [{ next_review_at: '2026-10-01T06:00:00Z', updated_at: '2026-09-30T06:00:00Z' }];
  // the same card after a wrong answer: back in ten minutes, but touched today
  const after = [{ next_review_at: '2026-10-02T09:10:00Z', updated_at: '2026-10-02T09:00:00Z' }];
  assert.equal(countDay(before, NOW, TZ, true).left, 1);
  assert.equal(countDay(after, NOW, TZ, true).left, 0);
});
