import { describe, expect, it, vi } from 'vitest';
import { memoryKV } from '../kv';
import { Grader } from './grader';

const ok = () => vi.fn(async (_id: string | number, _grade: number) => ({ ok: true }));
const fail = () =>
  vi.fn(async (_id: string | number, _grade: number): Promise<unknown> => {
    throw new Error('offline');
  });

describe('Grader', () => {
  it('sends exam and word grades to their endpoints', async () => {
    const sender = { exam: ok(), word: ok() };
    const g = new Grader(sender, memoryKV(), 'acc');
    await g.submit({ kind: 'exam', id: 'q1', grade: 3 });
    await g.submit({ kind: 'word', id: 7, grade: 1 });
    expect(sender.exam).toHaveBeenCalledWith('q1', 3);
    expect(sender.word).toHaveBeenCalledWith(7, 1);
    expect(g.pending()).toEqual([]);
  });

  it('buffers grades that fail to send', async () => {
    const g = new Grader({ exam: fail(), word: fail() }, memoryKV(), 'acc');
    await g.submit({ kind: 'word', id: 7, grade: 3 });
    expect(g.pending()).toEqual([{ kind: 'word', id: 7, grade: 3 }]);
  });

  it('flush sends buffered grades and keeps only the failures', async () => {
    const store = memoryKV();
    await new Grader({ exam: fail(), word: fail() }, store, 'acc').submit({ kind: 'word', id: 1, grade: 3 });
    await new Grader({ exam: fail(), word: fail() }, store, 'acc').submit({ kind: 'exam', id: 'q2', grade: 1 });
    const sender = { exam: fail(), word: ok() };
    const g = new Grader(sender, store, 'acc');
    expect(await g.flush()).toBe(1);
    expect(g.pending()).toEqual([{ kind: 'exam', id: 'q2', grade: 1 }]);
  });

  it('keeps buffers separate per account', async () => {
    const store = memoryKV();
    await new Grader({ exam: fail(), word: fail() }, store, 'a').submit({ kind: 'word', id: 1, grade: 3 });
    expect(new Grader({ exam: ok(), word: ok() }, store, 'b').pending()).toEqual([]);
  });
});
