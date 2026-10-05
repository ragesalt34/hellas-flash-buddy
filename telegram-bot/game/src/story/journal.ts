import { lemmaOf, normalize, tokenize, type LemmaId } from '../content/lexicon';

export interface WordPage {
  id: string;
  kind: 'words';
  slots: { icon: string; lemma: LemmaId }[];
}
export interface FormPage {
  id: string;
  kind: 'forms';
  slots: { icon: string; form: string }[];
  deciphers: LemmaId[];
}
export type Page = WordPage | FormPage;
export type PageStatus = 'locked' | 'open' | 'solved';

export interface JournalState {
  seen: LemmaId[];
  seenForms: string[]; // normalized
  notes: Partial<Record<LemmaId, string>>;
  solved: string[];
  deciphered: LemmaId[];
}

export const emptyJournal = (): JournalState => ({ seen: [], seenForms: [], notes: {}, solved: [], deciphered: [] });

/** Note every known word in `text`; `fresh` lists lemmas seen for the first time. */
export function observe(j: JournalState, text: string): { journal: JournalState; fresh: LemmaId[] } {
  const seen = new Set(j.seen);
  const forms = new Set(j.seenForms);
  const fresh: LemmaId[] = [];
  for (const token of tokenize(text)) {
    const id = lemmaOf(token);
    if (!id) continue;
    forms.add(normalize(token));
    if (!seen.has(id)) {
      seen.add(id);
      fresh.push(id);
    }
  }
  if (fresh.length === 0 && forms.size === j.seenForms.length) return { journal: j, fresh };
  return { journal: { ...j, seen: [...seen], seenForms: [...forms] }, fresh };
}

export function setNote(j: JournalState, id: LemmaId, note: string): JournalState {
  const text = note.trim();
  const notes = { ...j.notes };
  if (text) notes[id] = text;
  else delete notes[id];
  return { ...j, notes };
}

export function pageStatus(j: JournalState, page: Page): PageStatus {
  if (j.solved.includes(page.id)) return 'solved';
  let ready: boolean;
  if (page.kind === 'words') ready = page.slots.every((s) => j.seen.includes(s.lemma));
  else ready = page.slots.every((s) => j.seenForms.includes(normalize(s.form)));
  return ready ? 'open' : 'locked';
}

/** The Chants rule: a page validates only when every slot is right; no per-slot feedback. */
export function checkPage(
  j: JournalState,
  page: Page,
  answers: string[],
): { ok: boolean; journal: JournalState; deciphered: LemmaId[] } {
  const fail = { ok: false, journal: j, deciphered: [] as LemmaId[] };
  if (pageStatus(j, page) !== 'open' || answers.length !== page.slots.length) return fail;
  let ok: boolean;
  let ids: LemmaId[];
  if (page.kind === 'words') {
    ok = page.slots.every((s, i) => answers[i] === s.lemma);
    ids = page.slots.map((s) => s.lemma);
  } else {
    ok = page.slots.every((s, i) => normalize(answers[i]) === normalize(s.form));
    ids = page.deciphers;
  }
  if (!ok) return fail;
  const fresh = ids.filter((id) => !j.deciphered.includes(id));
  return {
    ok: true,
    journal: { ...j, solved: [...j.solved, page.id], deciphered: [...j.deciphered, ...fresh] },
    deciphered: fresh,
  };
}
