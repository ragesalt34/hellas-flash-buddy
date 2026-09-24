import { test } from 'node:test';
import assert from 'node:assert/strict';
import { computeReadiness, answerLang, sessionLangs, type ReadinessInput } from './readiness';

const NOW = new Date('2026-09-24T12:00:00Z');
const qs = (topic: string, n: number) => Array.from({ length: n }, (_, i) => ({ id: `${topic}-${i}`, topic }));
const ids = (topic: string, n: number) => qs(topic, n).map((q) => q.id);
const words = (learned: number, total = 10) =>
  Array.from({ length: total }, (_, i) => ({ vocab_id: i + 1, level: i < learned ? 4 : 1, next_review_at: null }));
const session = (at: string, chosen: string, qids: string[], correct = true) => ({
  completed_at: at,
  answers: qids.map((question_id) => ({ question_id, chosen, correct })),
});
const input = (over: Partial<ReadinessInput> = {}): ReadinessInput => ({
  questions: [...qs('history', 10), ...qs('laws', 10)],
  sessions: [],
  progress: [],
  vocab: [],
  vocabIds: Array.from({ length: 10 }, (_, i) => i + 1),
  ...over,
});

test('answerLang: greek, russian, neutral', () => {
  assert.equal(answerLang('Αθήνα'), 'el');
  assert.equal(answerLang('Афины'), 'ru');
  assert.equal(answerLang('1821'), null);
});

test('sessionLangs: neutral answers take the session majority', () => {
  const a = (chosen: string) => ({ question_id: 'x', chosen, correct: true });
  assert.deepEqual(sessionLangs([a('Αθήνα'), a('Σπάρτη'), a('1821')]), ['el', 'el', 'el']);
  assert.deepEqual(sessionLangs([a('1821'), a('1453')]), [null, null]);
});

test('empty user: early, zero score, unchecked everything', () => {
  const r = computeReadiness(input(), NOW);
  assert.equal(r.verdict, 'early');
  assert.equal(r.score, 0);
  assert.deepEqual(r.greek, { known: 0, checked: 0, total: 20 });
  assert.equal(r.blockers.length, 2);
});

test('latest answer in a language wins, whatever the array order', () => {
  const r = computeReadiness(
    input({
      sessions: [
        session('2026-09-10T00:00:00Z', 'Αθήνα', ['history-0'], false),
        session('2026-09-01T00:00:00Z', 'Αθήνα', ['history-0'], true),
      ],
    }),
    NOW
  );
  assert.deepEqual(r.greek, { known: 0, checked: 1, total: 20 });
});

test('russian answers never make the verdict', () => {
  const r = computeReadiness(
    input({
      sessions: [session('2026-09-01T00:00:00Z', 'Афины', [...ids('history', 10), ...ids('laws', 10)])],
      vocab: words(10),
    }),
    NOW
  );
  assert.equal(r.russian.known, 20);
  assert.equal(r.greek.known, 0);
  assert.equal(r.verdict, 'early');
});

test('ready: every topic in greek and 80% of words', () => {
  const r = computeReadiness(
    input({
      sessions: [session('2026-09-01T00:00:00Z', 'Αθήνα', [...ids('history', 10), ...ids('laws', 10)])],
      vocab: words(8),
    }),
    NOW
  );
  assert.equal(r.verdict, 'ready');
  assert.equal(r.score, 80);
  assert.deepEqual(r.blockers, []);
});

test('one weak topic keeps the verdict at almost and is the blocker', () => {
  const r = computeReadiness(
    input({
      sessions: [session('2026-09-01T00:00:00Z', 'Αθήνα', [...ids('history', 10), ...ids('laws', 7)])],
      vocab: words(10),
    }),
    NOW
  );
  assert.equal(r.verdict, 'almost');
  assert.deepEqual(r.blockers, [{ kind: 'topic', topic: 'laws', known: 7, total: 10 }]);
});

test('too few words keeps the verdict early', () => {
  const r = computeReadiness(
    input({
      sessions: [session('2026-09-01T00:00:00Z', 'Αθήνα', [...ids('history', 10), ...ids('laws', 10)])],
      vocab: words(5),
    }),
    NOW
  );
  assert.equal(r.verdict, 'early');
  assert.deepEqual(r.blockers, [{ kind: 'words', known: 5, total: 10 }]);
});

test('memory, due counts, unknown ids ignored', () => {
  const r = computeReadiness(
    input({
      sessions: [session('2026-09-01T00:00:00Z', 'Αθήνα', ['gone-1'])],
      progress: [
        { question_id: 'history-0', level: 5, next_review_at: '2026-09-20T00:00:00Z' },
        { question_id: 'history-1', level: 2, next_review_at: '2026-10-01T00:00:00Z' },
        { question_id: 'gone-2', level: 6, next_review_at: '2026-09-01T00:00:00Z' },
      ],
      vocab: [{ vocab_id: 1, level: 4, next_review_at: '2026-09-23T00:00:00Z' }],
    }),
    NOW
  );
  assert.equal(r.greek.checked, 0);
  assert.deepEqual(r.memory, { strong: 1, total: 20 });
  assert.deepEqual(r.due, { cards: 1, words: 1 });
  assert.deepEqual(r.words, { learned: 1, seen: 1, total: 10 });
});
