import { CHAPTER_LEMMAS, EXAM_PER_DAY, NPC_BY_ID, PAGE_BY_ID, REQUEST_NPCS, type SceneId } from '../content/chapter1';
import { lemma, type LemmaId } from '../content/lexicon';
import { applyEffects, pickRule } from './dialogue';
import { checkPage, observe, setNote } from './journal';
import { answerRequest, openRequestFor, refreshRequests, requestOptions } from './requests';
import type { StoryState } from './state';
import { consolidated, enroll } from './wordSrs';

export type DialogueView =
  | { kind: 'lines'; npcId: string; lines: string[]; replies: string[]; exam: boolean }
  | { kind: 'request'; npcId: string; requestId: string; lemma: LemmaId; lines: string[]; options: LemmaId[] };

function observeAll(s: StoryState, texts: string[]): StoryState {
  let journal = s.journal;
  for (const t of texts) journal = observe(journal, t).journal;
  return journal === s.journal ? s : { ...s, journal };
}

/** The player pressed E near `npcId`: a pending review request comes first, then the story rule. */
export function talk(
  s: StoryState,
  npcId: string,
  today: string,
  rng: () => number = Math.random,
): { state: StoryState; view: DialogueView | null } {
  const npc = NPC_BY_ID.get(npcId);
  if (!npc) return { state: s, view: null };
  let st = s;
  if (npc.kind === 'person') {
    const requests = refreshRequests(st.requests, st.srs, today, REQUEST_NPCS);
    st = { ...st, requests };
    const q = openRequestFor(requests, npcId);
    if (q) {
      const line = lemma(q.lemma).ask;
      st = observeAll(st, [line]);
      const options = requestOptions(q, st.journal.deciphered, rng);
      return { state: st, view: { kind: 'request', npcId, requestId: q.id, lemma: q.lemma, lines: [line], options } };
    }
  }
  const rule = pickRule(npc, st.world);
  if (!rule) return { state: st, view: null };
  const replies = rule.replies?.map((r) => r.text) ?? [];
  st = observeAll(st, [...rule.say, ...replies]);
  let exam = false;
  if (replies.length === 0) {
    const r = applyEffects(st.world, rule.effects);
    if (r.world !== st.world) st = { ...st, world: r.world };
    exam = r.exam;
  }
  return { state: st, view: { kind: 'lines', npcId, lines: rule.say, replies, exam } };
}

export function reply(s: StoryState, npcId: string, index: number): { state: StoryState; lines: string[]; correct: boolean } {
  const npc = NPC_BY_ID.get(npcId);
  const rule = npc ? pickRule(npc, s.world) : null;
  const r = rule?.replies?.[index];
  if (!rule || !r) return { state: s, lines: [], correct: false };
  let st = observeAll(s, r.answer);
  if (r.correct) {
    const res = applyEffects(st.world, [...(rule.effects ?? []), ...(r.effects ?? [])]);
    if (res.world !== st.world) st = { ...st, world: res.world };
  }
  return { state: st, lines: r.answer, correct: r.correct };
}

export function answer(
  s: StoryState,
  requestId: string,
  chosen: LemmaId,
  today: string,
): { state: StoryState; lines: string[]; correct: boolean } {
  const r = answerRequest(s.requests, s.srs, requestId, chosen, today);
  const lines = [r.correct ? 'Ναι!' : 'Όχι…'];
  return { state: observeAll({ ...s, requests: r.requests, srs: r.srs }, lines), lines, correct: r.correct };
}

export function solvePage(
  s: StoryState,
  pageId: string,
  answers: string[],
  today: string,
): { state: StoryState; ok: boolean; deciphered: LemmaId[] } {
  const page = PAGE_BY_ID.get(pageId);
  if (!page) return { state: s, ok: false, deciphered: [] };
  const r = checkPage(s.journal, page, answers);
  if (!r.ok) return { state: s, ok: false, deciphered: [] };
  return { state: { ...s, journal: r.journal, srs: enroll(s.srs, r.deciphered, today) }, ok: true, deciphered: r.deciphered };
}

export function writeNote(s: StoryState, id: LemmaId, text: string): StoryState {
  return { ...s, journal: setNote(s.journal, id, text) };
}

export function enterScene(s: StoryState, scene: SceneId, x: number, z: number): StoryState {
  return { ...s, scene, x, z };
}

export function chapterProgress(s: StoryState): number {
  return consolidated(s.srs, CHAPTER_LEMMAS);
}

export function examLeft(s: StoryState, today: string): number {
  return EXAM_PER_DAY - (s.examDay === today ? s.examDone : 0);
}

export function countExam(s: StoryState, today: string): StoryState {
  return { ...s, examDay: today, examDone: (s.examDay === today ? s.examDone : 0) + 1 };
}
