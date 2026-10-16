import { test } from 'node:test';
import assert from 'node:assert/strict';
import { summariseStudyTime, isStudyMode } from './studyTime';

test('today, week and per-day totals', () => {
  const t = summariseStudyTime(
    [
      { day: '2026-10-16', mode: 'quiz', seconds: 300 },
      { day: '2026-10-16', mode: 'vocab', seconds: 120 },
      { day: '2026-10-10', mode: 'flashcards', seconds: 600 }, // 6 days back: still this week
      { day: '2026-10-09', mode: 'quiz', seconds: 900 }, // 7 days back: not this week
    ],
    '2026-10-16'
  );
  assert.equal(t.today, 420);
  assert.equal(t.todayByMode.quiz, 300);
  assert.equal(t.todayByMode.vocab, 120);
  assert.equal(t.week, 1020);
  assert.deepEqual(t.byDay, { '2026-10-16': 420, '2026-10-10': 600, '2026-10-09': 900 });
});

test('week crosses a month boundary by calendar days', () => {
  const t = summariseStudyTime([{ day: '2026-09-27', mode: 'quiz', seconds: 60 }], '2026-10-03');
  assert.equal(t.week, 60);
});

test('broken values do not count', () => {
  const t = summariseStudyTime([{ day: '2026-10-16', mode: 'quiz', seconds: -5 }, { day: '2026-10-16', mode: 'other', seconds: 30 }], '2026-10-16');
  assert.equal(t.today, 30);
  assert.equal(t.todayByMode.quiz, 0);
});

test('modes', () => {
  assert.ok(isStudyMode('vocab'));
  assert.ok(!isStudyMode('stats'));
  assert.ok(!isStudyMode(1));
});
