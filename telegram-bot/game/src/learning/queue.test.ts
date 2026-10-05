import { describe, expect, it } from 'vitest';
import { DailyQueue, NEW_CAP, selectToday } from './queue';
import type { ChallengeKind, StudyItem } from './types';

const mk = (kind: ChallengeKind, n: number, level = 1, topic: string | null = 'history'): StudyItem => ({
  key: `${kind}:${n}`,
  kind,
  id: kind === 'word' ? n : `q${n}`,
  prompt: `prompt ${kind} ${n}`,
  answer: `answer ${kind} ${n}`,
  explanation: null,
  topic,
  level,
});
const range = (kind: ChallengeKind, count: number, level = 1) =>
  Array.from({ length: count }, (_, i) => mk(kind, i + 1, level));
const first = () => 0;

describe('selectToday', () => {
  it('keeps every review and caps new items', () => {
    const items = [...range('word', 2, 3), ...range('word', 9, 0).map((i) => ({ ...i, key: `new:${i.key}` }))];
    const picked = selectToday(items);
    expect(picked.filter((i) => i.level >= 1)).toHaveLength(2);
    expect(picked.filter((i) => i.level === 0)).toHaveLength(NEW_CAP);
  });
});

describe('DailyQueue', () => {
  it('hands out a graded challenge whose options contain the answer', () => {
    const q = new DailyQueue(range('word', 4), [], first);
    const c = q.next('word')!;
    expect(c.graded).toBe(true);
    expect(c.options).toContain(c.item.answer);
    expect(q.total).toBe(4);
  });

  it('counts a correct answer as done', () => {
    const q = new DailyQueue(range('word', 2), [], first);
    q.answer(q.next('word')!, true);
    expect(q.done).toBe(1);
    expect(q.remaining).toBe(1);
  });

  it('sends a wrong answer to the back and does not grade it twice', () => {
    const q = new DailyQueue(range('word', 2), [], first);
    const c = q.next('word')!;
    q.answer(c, false);
    expect(q.next('word')!.item.key).not.toBe(c.item.key);
    q.answer(q.next('word')!, true);
    const retry = q.next('word')!;
    expect(retry.item.key).toBe(c.item.key);
    expect(retry.graded).toBe(false);
    q.answer(retry, true);
    expect(q.done).toBe(2);
    expect(q.remaining).toBe(0);
  });

  it('switches to ungraded practice when the queue is empty', () => {
    const q = new DailyQueue(range('word', 1), [], first);
    q.answer(q.next('word')!, true);
    const p = q.next('word')!;
    expect(p.graded).toBe(false);
    q.answer(p, true);
    expect(q.done).toBe(1);
  });

  it('prefers the requested topics', () => {
    const exams = [mk('exam', 1, 1, 'geography'), mk('exam', 2, 1, 'laws')];
    const q = new DailyQueue([], exams, first);
    expect(q.next('exam', ['laws'])!.item.topic).toBe('laws');
  });

  it('for "any" picks the kind with more items due', () => {
    const q = new DailyQueue(range('word', 1), range('exam', 3), first);
    expect(q.next('any')!.item.kind).toBe('exam');
  });

  it('falls back to the other kind when the requested pool is empty', () => {
    const q = new DailyQueue([], range('exam', 1), first);
    expect(q.next('word')!.item.kind).toBe('exam');
  });

  it('returns null when there are no cards at all', () => {
    expect(new DailyQueue([], [], first).next('any')).toBeNull();
  });
});
