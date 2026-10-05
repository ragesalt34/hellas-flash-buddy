import { describe, expect, it } from 'vitest';
import { LEXICON, lemma, type LemmaId } from '../content/lexicon';
import {
  REQUEST_CAP,
  answerRequest,
  emptyRequests,
  openRequestFor,
  refreshRequests,
  requestOptions,
  requestProgress,
} from './requests';
import { enroll } from './wordSrs';

const T = '2026-10-05';
const first = () => 0;

describe('requests', () => {
  it('turns due words into requests spread over the NPCs', () => {
    const srs = enroll({}, ['fish', 'bread', 'water'], T);
    const r = refreshRequests(emptyRequests(), srs, T, ['a', 'b']);
    expect(r.list.map((q) => [q.lemma, q.npcId])).toEqual([
      ['bread', 'a'],
      ['fish', 'b'],
      ['water', 'a'],
    ]);
  });

  it('caps the day at REQUEST_CAP', () => {
    const ids = LEXICON.slice(0, 14).map((l) => l.id);
    const r = refreshRequests(emptyRequests(), enroll({}, ids, T), T, ['a']);
    expect(r.list).toHaveLength(REQUEST_CAP);
  });

  it('keeps today and drops yesterday', () => {
    const srs = enroll({}, ['fish'], T);
    const today = refreshRequests(emptyRequests(), srs, T, ['a']);
    expect(refreshRequests(today, srs, T, ['a']).list).toHaveLength(1);
    const tomorrow = refreshRequests(today, {}, '2026-10-06', ['a']);
    expect(tomorrow).toEqual({ day: '2026-10-06', list: [] });
  });

  it('a right first answer is graded and closes the request', () => {
    const srs = enroll({}, ['fish'], T);
    const r = refreshRequests(emptyRequests(), srs, T, ['a']);
    const res = answerRequest(r, srs, r.list[0].id, 'fish', T);
    expect(res.correct).toBe(true);
    expect(res.requests.list[0]).toMatchObject({ done: true, graded: true });
    expect(res.srs.fish).toEqual({ level: 2, due: '2026-10-06' });
    expect(openRequestFor(res.requests, 'a')).toBeUndefined();
  });

  it('only the first attempt is graded', () => {
    const srs = { fish: { level: 4, due: T } };
    const r = refreshRequests(emptyRequests(), srs, T, ['a']);
    const wrong = answerRequest(r, srs, r.list[0].id, 'bread', T);
    expect(wrong.correct).toBe(false);
    expect(wrong.srs.fish).toEqual({ level: 2, due: T });
    expect(openRequestFor(wrong.requests, 'a')?.lemma).toBe('fish');
    const right = answerRequest(wrong.requests, wrong.srs, r.list[0].id, 'fish', T);
    expect(right.srs).toBe(wrong.srs);
    expect(right.requests.list[0].done).toBe(true);
    expect(requestProgress(right.requests, T)).toEqual({ done: 1, total: 1 });
  });

  it('offers the answer plus up to two other deciphered words with distinct icons', () => {
    const q = { id: 'x', npcId: 'a', lemma: 'fish' as LemmaId, done: false, graded: false };
    const opts = requestOptions(q, ['fish', 'bread', 'water', 'ship'], first);
    expect(opts).toHaveLength(3);
    expect(opts).toContain('fish');
    expect(new Set(opts.map((id) => lemma(id).icon)).size).toBe(3);
    expect(requestOptions(q, ['fish'], first)).toEqual(['fish']);
  });
});
