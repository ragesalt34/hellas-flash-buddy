import { test } from 'node:test';
import assert from 'node:assert/strict';
import { computePlan, type PlanInput } from './plan';

const base: PlanInput = {
  interviewDate: null, today: '2026-09-29',
  totalQuestions: 163, seenQuestions: 3, totalWords: 150, seenWords: 10,
  dueCards: 12, dueWords: 5,
};

test('no date: only reviews, phase none', () => {
  const p = computePlan(base);
  assert.equal(p.phase, 'none');
  assert.equal(p.pace, 'none');
  assert.equal(p.newQuestions, 0);
  assert.equal(p.minutes, Math.ceil((12 * 15 + 5 * 8) / 60));
});

test('date in the past', () => {
  const p = computePlan({ ...base, interviewDate: '2026-09-01' });
  assert.equal(p.phase, 'past');
  assert.equal(p.daysLeft, -28);
});

test('six months out: material spread over learning days, 21-day buffer', () => {
  const p = computePlan({ ...base, interviewDate: '2027-03-29' });
  assert.equal(p.daysLeft, 181);
  assert.equal(p.phase, 'learn');
  assert.equal(p.newQuestions, 1); // 160 unseen / 160 learning days
  assert.equal(p.newWords, 1); // ceil(140 / 160)
  assert.equal(p.minutes, Math.ceil((40 + 12 * 15 + 15 + 5 * 8) / 60));
  assert.equal(p.pace, 'calm');
  assert.equal(p.finishNewBy, '2027-03-08');
});

test('short runway: buffer is 15% of the days left', () => {
  const p = computePlan({ ...base, interviewDate: '2026-10-19' }); // 20 days
  assert.equal(p.finishNewBy, '2026-10-16'); // buffer 3
  assert.equal(p.newQuestions, Math.ceil(160 / 17));
});

test('final phase with unseen material is behind; without it is final', () => {
  const today = computePlan({ ...base, interviewDate: '2026-09-29' });
  assert.equal(today.phase, 'final');
  assert.equal(today.pace, 'behind');
  assert.equal(today.newQuestions, 160);
  const covered = computePlan({ ...base, interviewDate: '2026-09-29', seenQuestions: 163, seenWords: 150 });
  assert.equal(covered.pace, 'final');
});

test('pace follows the new material only; a review backlog is load, not lateness', () => {
  const backlog = computePlan({ ...base, interviewDate: '2027-03-29', dueCards: 59, dueWords: 124 });
  assert.equal(backlog.pace, 'calm');
  assert.ok(backlog.minutes > 30);
  assert.equal(computePlan({ ...base, interviewDate: '2026-10-09' }).pace, 'tight'); // 10 days: ~16 min of new
  assert.equal(computePlan({ ...base, interviewDate: '2026-10-04' }).pace, 'behind'); // 5 days: ~29 min of new
  assert.equal(computePlan({ ...base, interviewDate: '2027-03-29', seenQuestions: 163, seenWords: 150 }).pace, 'done');
});
