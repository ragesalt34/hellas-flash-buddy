import { lemma, type LemmaId } from '../content/lexicon';
import { shuffle } from '../learning/options';
import { dueToday, grade, type SrsState } from './wordSrs';

export const REQUEST_CAP = 10;

export interface Request {
  id: string;
  npcId: string;
  lemma: LemmaId;
  done: boolean;
  graded: boolean;
}

export interface RequestsState {
  day: string;
  list: Request[];
}

export const emptyRequests = (): RequestsState => ({ day: '', list: [] });

/** Today's list: keeps today's requests, tops up with newly due words, never more than REQUEST_CAP a day. */
export function refreshRequests(r: RequestsState, srs: SrsState, today: string, npcIds: string[]): RequestsState {
  const list = r.day === today ? [...r.list] : [];
  const have = new Set(list.map((q) => q.lemma));
  for (const id of dueToday(srs, today)) {
    if (list.length >= REQUEST_CAP) break;
    if (have.has(id)) continue;
    have.add(id);
    list.push({ id: `${today}:${id}`, npcId: npcIds[list.length % npcIds.length], lemma: id, done: false, graded: false });
  }
  return { day: today, list };
}

export function openRequestFor(r: RequestsState, npcId: string): Request | undefined {
  return r.list.find((q) => q.npcId === npcId && !q.done);
}

export function answerRequest(
  r: RequestsState,
  srs: SrsState,
  requestId: string,
  chosen: LemmaId,
  today: string,
): { requests: RequestsState; srs: SrsState; correct: boolean } {
  const q = r.list.find((x) => x.id === requestId);
  if (!q || q.done) return { requests: r, srs, correct: false };
  const correct = chosen === q.lemma;
  const nextSrs = q.graded ? srs : grade(srs, q.lemma, correct, today);
  const list = r.list.map((x) => (x === q ? { ...x, graded: true, done: correct } : x));
  return { requests: { ...r, list }, srs: nextSrs, correct };
}

/** The asked word plus up to two other deciphered words whose pictures differ. */
export function requestOptions(q: Request, deciphered: LemmaId[], rng: () => number = Math.random): LemmaId[] {
  const icons = new Set([lemma(q.lemma).icon]);
  const picked: LemmaId[] = [];
  for (const id of shuffle(deciphered.filter((d) => d !== q.lemma), rng)) {
    if (picked.length === 2) break;
    const icon = lemma(id).icon;
    if (icons.has(icon)) continue;
    icons.add(icon);
    picked.push(id);
  }
  return shuffle([q.lemma, ...picked], rng);
}

export function requestProgress(r: RequestsState, today: string): { done: number; total: number } {
  if (r.day !== today) return { done: 0, total: 0 };
  return { done: r.list.filter((q) => q.done).length, total: r.list.length };
}
