import { describe, expect, it } from 'vitest';
import { answer, chapterProgress, countExam, examLeft, reply, solvePage, talk } from './director';
import { newStory, type StoryState } from './state';

const T = '2026-10-05';
const first = () => 0;

describe('director', () => {
  it('talking shows lines, records words and offers replies without applying effects yet', () => {
    const { state, view } = talk(newStory(), 'sailor', T, first);
    expect(view).toMatchObject({ kind: 'lines', lines: ['Λιμάνι!', 'Εγώ είμαι ο ναύτης.', 'Εσύ; Πού πηγαίνεις;'] });
    expect(view?.kind === 'lines' && view.replies).toHaveLength(3);
    expect(state.journal.seen).toEqual(expect.arrayContaining(['port', 'sailor', 'go', 'athens']));
    expect(state.world.inventory).toEqual([]);
  });

  it('a correct reply applies its effects; a wrong one does not', () => {
    const s0 = talk(newStory(), 'sailor', T, first).state;
    const wrong = reply(s0, 'sailor', 1);
    expect(wrong.correct).toBe(false);
    expect(wrong.state.world.inventory).toEqual([]);
    const right = reply(s0, 'sailor', 0);
    expect(right.correct).toBe(true);
    expect(right.lines).toEqual(['Αθήνα! Ναι.', 'Το κλειδί.']);
    expect(right.state.world).toEqual({ flags: ['key_given'], inventory: ['key'] });
  });

  it('effects without replies apply on talk (the fountain gives water)', () => {
    const { state } = talk(newStory(), 'fountain', T, first);
    expect(state.world.inventory).toEqual(['water']);
  });

  it('the historian asks for an exam', () => {
    const { view } = talk(newStory(), 'historian', T, first);
    expect(view).toMatchObject({ kind: 'lines', exam: true });
  });

  it('solving a page enrolls its words; due words become requests answered by picture', () => {
    let s: StoryState = talk(newStory(), 'fisher', T, first).state; // ψάρι, ψωμί
    s = talk(s, 'child', T, first).state; // νερό
    s = talk(s, 'man', T, first).state; // τρώω
    const solved = solvePage(s, 'food', ['fish', 'bread', 'water', 'eat'], T);
    expect(solved.ok).toBe(true);
    expect(solved.state.srs.fish).toEqual({ level: 0, due: T });

    const asked = talk(solved.state, 'sailor', T, first);
    expect(asked.view?.kind).toBe('request');
    if (asked.view?.kind !== 'request') return;
    const res = answer(asked.state, asked.view.requestId, 'bread', T);
    expect(res.correct).toBe(true);
    expect(res.state.srs.bread?.level).toBe(2);
  });

  it('a wrong page leaves state untouched', () => {
    const s = talk(newStory(), 'fisher', T, first).state;
    expect(solvePage(s, 'food', ['bread', 'fish', 'water', 'eat'], T)).toMatchObject({ ok: false, state: s });
  });

  it('tracks chapter progress and the daily exam allowance', () => {
    expect(chapterProgress(newStory())).toBe(0);
    let s = newStory();
    expect(examLeft(s, T)).toBe(5);
    s = countExam(countExam(s, T), T);
    expect(examLeft(s, T)).toBe(3);
    expect(examLeft(s, '2026-10-06')).toBe(5);
  });
});
