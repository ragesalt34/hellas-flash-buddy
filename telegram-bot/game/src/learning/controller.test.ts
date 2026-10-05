import { describe, expect, it, vi } from 'vitest';
import { Bus } from '../bus';
import { ChallengeController } from './controller';
import type { Grade } from './grader';
import { DailyQueue } from './queue';
import type { StudyItem } from './types';

const word = (n: number): StudyItem => ({
  key: `w:${n}`,
  kind: 'word',
  id: n,
  prompt: `λέξη${n}`,
  answer: `слово${n}`,
  explanation: null,
  topic: 't',
  level: 1,
});

function setup(words: StudyItem[]) {
  const bus = new Bus();
  const submit = vi.fn(async (_g: Grade) => {});
  const c = new ChallengeController(new DailyQueue(words, [], () => 0), { submit }, bus);
  c.start();
  const results: { requestId: string; correct: boolean }[] = [];
  bus.on('challenge:result', (r) => results.push(r));
  const request = (requestId: string) => bus.emit('challenge:request', { requestId, source: 'historian', kind: 'word' });
  return { c, submit, results, request };
}

describe('ChallengeController', () => {
  it('opens a challenge, grades a correct answer and reports it on close', () => {
    const { c, submit, results, request } = setup([word(1), word(2)]);
    request('r1');
    const a = c.current()!;
    expect(c.answer(a.challenge.item.answer)).toBe(true);
    expect(submit).toHaveBeenCalledWith({ kind: 'word', id: a.challenge.item.id, grade: 3 });
    expect(results).toEqual([]);
    c.close();
    expect(results).toEqual([{ requestId: 'r1', correct: true }]);
    expect(c.current()).toBeNull();
    expect(c.progress()).toEqual({ done: 1, total: 2 });
  });

  it('grades a wrong answer with 1 and reports failure', () => {
    const { c, submit, results, request } = setup([word(1), word(2)]);
    request('r1');
    expect(c.answer('nope')).toBe(false);
    expect(submit).toHaveBeenCalledWith(expect.objectContaining({ grade: 1 }));
    c.close();
    expect(results).toEqual([{ requestId: 'r1', correct: false }]);
  });

  it('ignores a second answer to the same challenge', () => {
    const { c, submit, request } = setup([word(1), word(2)]);
    request('r1');
    c.answer('nope');
    c.answer(c.current()!.challenge.item.answer);
    expect(submit).toHaveBeenCalledTimes(1);
    expect(c.current()!.correct).toBe(false);
  });

  it('does not grade practice answers', () => {
    const { c, submit, request } = setup([word(1)]);
    request('r1');
    c.answer(c.current()!.challenge.item.answer);
    c.close();
    request('r2');
    expect(c.current()!.challenge.graded).toBe(false);
    c.answer(c.current()!.challenge.item.answer);
    expect(submit).toHaveBeenCalledTimes(1);
  });

  it('lets the game through when there are no cards at all', () => {
    const { c, results, request } = setup([]);
    request('r1');
    expect(c.current()).toBeNull();
    expect(results).toEqual([{ requestId: 'r1', correct: true }]);
  });

  it('rejects a second request while a dialog is open', () => {
    const { results, request } = setup([word(1), word(2)]);
    request('r1');
    request('r2');
    expect(results).toEqual([{ requestId: 'r2', correct: false }]);
  });
});
