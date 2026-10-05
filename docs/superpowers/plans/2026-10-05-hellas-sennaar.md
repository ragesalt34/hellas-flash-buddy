# Hellas Sennaar Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn `telegram-bot/game/` into a Chants-of-Sennaar-style Greek deciphering game: chapter 1 «Πειραιάς» in 3D (three.js, toon + ink), journal pages, a trade-chain puzzle, daily review requests from a local SRS, and the historian's exam questions.

**Architecture:** Pure, unit-tested story core (`src/content/` data + `src/story/` logic) drives everything; `src/world3d/` only renders scenes and reports what the player touched (`npc:talk`); React overlays (`src/ui/`) show speech bubbles, replies, the journal and HUD and call the story director. The existing exam flow (`src/learning/`, `session.ts`, `ChallengeDialog`) is reused for the historian.

**Tech Stack:** Vite 5, React 18, TypeScript 5 strict, three.js 0.186 (`MeshToonMaterial`, `LineSegments2`), `@fontsource/gfs-didot`, Vitest 2, Tauri 2.

**Spec:** `docs/superpowers/specs/2026-10-05-hellas-sennaar-design.md`

## Global Constraints

- Paths are relative to `telegram-bot/game/` unless they start with `docs/` or `telegram-bot/`.
- Branch `game/metroidvania` (already checked out). One commit per task, staging only `telegram-bot/game/` paths (and `docs/` where stated). Never stage `mobile/`.
- No backend changes. Exam uses `/api/flashcards` + `/api/flashcards/grade` through the existing `ChallengeController`.
- Every Greek token shown anywhere must be a form in `src/content/lexicon.ts` (enforced by tests).
- Story save key `hs_sennaar_save_<accountId>`; all story state is local (works offline).
- SRS: levels 0–6 via `nextLevel` from `@shared/srs` (grade 3 right, 1 wrong); `INTERVAL_DAYS = [0, 0, 1, 3, 7, 14, 30]`; wrong → due today.
- Requests: at most 10 per day; only for deciphered + due lemmas; only the first attempt is graded.
- Journal pages validate all-or-nothing.
- Exam: 5 historian questions per day.
- Look: two-step toon ramp, ink lines 3 px (`LineSegments2`), inverted hull on round shapes, warm sky gradient + fog, GFS Didot lettering (`carved` / `painted`).
- TypeScript strict incl. `noUnusedLocals`/`noUnusedParameters`. `npm test` and `npm run build` pass at the end of every task.

---

### Task 1: Lexicon and tokenizer

**Files:**
- Create: `src/content/lexicon.ts`
- Test: `src/content/lexicon.test.ts`

**Interfaces:**
- Produces: `type LemmaId`, `interface Lemma { id; el; ru; icon; forms: string[]; ask: string; serverVocabId? }`, `LEXICON: Lemma[]`, `normalize(word): string`, `tokenize(text): string[]`, `lemmaOf(token): LemmaId | null`, `lemma(id): Lemma`, `displayForm(normalized): string`.

- [ ] **Step 1: Write the failing test `src/content/lexicon.test.ts`**

```ts
import { describe, expect, it } from 'vitest';
import { LEXICON, displayForm, lemmaOf, normalize, tokenize } from './lexicon';

describe('lexicon', () => {
  it('has the 34 chapter-1 lemmas', () => {
    expect(LEXICON).toHaveLength(34);
  });

  it('maps every form to exactly one lemma', () => {
    const owner = new Map<string, string>();
    for (const l of LEXICON) {
      for (const f of l.forms) {
        const n = normalize(f);
        expect(owner.get(n), `${f}: ${l.id} vs ${owner.get(n)}`).toBeUndefined();
        owner.set(n, l.id);
      }
    }
  });

  it('ignores case, accents and final sigma', () => {
    expect(lemmaOf('ΛΙΜΑΝΙ')).toBe('port');
    expect(lemmaOf('Ψάρια')).toBe('fish');
    expect(lemmaOf('ΨΑΡΑΣ')).toBe('fisher');
    expect(lemmaOf('που')).toBe('where');
    expect(lemmaOf('καλημέρα')).toBeNull();
    expect(displayForm(normalize('ΨΑΡΙΑ'))).toBe('ψάρια');
  });

  it('tokenizes away punctuation and dashes', () => {
    expect(tokenize('Εσύ; Πού πηγαίνεις;')).toEqual(['Εσύ', 'Πού', 'πηγαίνεις']);
    expect(tokenize('Όχι… Εισιτήριο;')).toEqual(['Όχι', 'Εισιτήριο']);
    expect(tokenize('Ψωμί — νερό!')).toEqual(['Ψωμί', 'νερό']);
  });

  it('every ask line uses its own word and only known words', () => {
    for (const l of LEXICON) {
      const ids = tokenize(l.ask).map(lemmaOf);
      expect(ids, l.ask).not.toContain(null);
      expect(ids, l.ask).toContain(l.id);
    }
  });

  it('gives every lemma a distinct icon', () => {
    expect(new Set(LEXICON.map((l) => l.icon)).size).toBe(LEXICON.length);
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npx vitest run src/content/lexicon.test.ts`
Expected: FAIL — cannot resolve `./lexicon`.

- [ ] **Step 3: Implement `src/content/lexicon.ts`**

```ts
/** Chapter 1 lexicon. Every Greek token the game shows must be one of these forms. */
export type LemmaId =
  | 'man' | 'woman' | 'child' | 'fisher' | 'sailor' | 'guard' | 'baker'
  | 'fish' | 'bread' | 'water' | 'ship' | 'sea' | 'house' | 'door' | 'key' | 'ticket' | 'port' | 'road' | 'athens'
  | 'want' | 'have' | 'give' | 'bring' | 'go' | 'open' | 'eat' | 'be'
  | 'yes' | 'no' | 'i' | 'you' | 'the' | 'and' | 'where';

export interface Lemma {
  id: LemmaId;
  el: string;
  ru: string;
  icon: string;
  forms: string[];
  /** A short line using the word — what an NPC says when asking you to review it. */
  ask: string;
  serverVocabId?: number;
}

const L = (id: LemmaId, el: string, ru: string, icon: string, forms: string[], ask: string): Lemma => ({
  id, el, ru, icon, forms, ask,
});

export const LEXICON: Lemma[] = [
  L('man', 'άντρας', 'мужчина', '🧔', ['άντρας', 'άντρα'], 'Πού είναι ο άντρας;'),
  L('woman', 'γυναίκα', 'женщина', '👩', ['γυναίκα'], 'Πού είναι η γυναίκα;'),
  L('child', 'παιδί', 'ребёнок', '🧒', ['παιδί', 'παιδιά'], 'Πού είναι το παιδί;'),
  L('fisher', 'ψαράς', 'рыбак', '🎣', ['ψαράς', 'ψαράδες'], 'Πού είναι ο ψαράς;'),
  L('sailor', 'ναύτης', 'моряк', '🧭', ['ναύτης'], 'Πού είναι ο ναύτης;'),
  L('guard', 'φύλακας', 'стражник', '💂', ['φύλακας'], 'Πού είναι ο φύλακας;'),
  L('baker', 'φούρναρης', 'пекарь', '🧑‍🍳', ['φούρναρης'], 'Πού είναι ο φούρναρης;'),
  L('fish', 'ψάρι', 'рыба', '🐟', ['ψάρι', 'ψάρια'], 'Φέρε μου ψάρι.'),
  L('bread', 'ψωμί', 'хлеб', '🍞', ['ψωμί'], 'Φέρε μου ψωμί.'),
  L('water', 'νερό', 'вода', '💧', ['νερό'], 'Φέρε μου νερό.'),
  L('ship', 'πλοίο', 'корабль', '🚢', ['πλοίο', 'πλοία'], 'Πού είναι το πλοίο;'),
  L('sea', 'θάλασσα', 'море', '🌊', ['θάλασσα'], 'Πού είναι η θάλασσα;'),
  L('house', 'σπίτι', 'дом', '🏠', ['σπίτι', 'σπίτια'], 'Πού είναι το σπίτι;'),
  L('door', 'πόρτα', 'дверь', '🚪', ['πόρτα'], 'Πού είναι η πόρτα;'),
  L('key', 'κλειδί', 'ключ', '🔑', ['κλειδί'], 'Φέρε μου το κλειδί.'),
  L('ticket', 'εισιτήριο', 'билет', '🎫', ['εισιτήριο'], 'Έχεις εισιτήριο;'),
  L('port', 'λιμάνι', 'порт, гавань', '⚓', ['λιμάνι'], 'Πού είναι το λιμάνι;'),
  L('road', 'δρόμος', 'дорога', '🛣️', ['δρόμος', 'δρόμο'], 'Πού είναι ο δρόμος;'),
  L('athens', 'Αθήνα', 'Афины', '🏛️', ['Αθήνα'], 'Πού είναι η Αθήνα;'),
  L('want', 'θέλω', 'хотеть', '🤲', ['θέλω', 'θέλεις', 'θέλει'], 'Θέλεις ψωμί;'),
  L('have', 'έχω', 'иметь', '🎒', ['έχω', 'έχεις', 'έχει'], 'Έχεις νερό;'),
  L('give', 'δίνω', 'давать', '🤝', ['δίνω', 'δίνει', 'δώσε'], 'Δώσε μου ψωμί.'),
  L('bring', 'φέρνω', 'приносить', '📦', ['φέρνω', 'φέρε'], 'Φέρε μου νερό.'),
  L('go', 'πηγαίνω', 'идти, ехать', '🚶', ['πηγαίνω', 'πηγαίνεις', 'πηγαίνει'], 'Πού πηγαίνεις;'),
  L('open', 'ανοίγω', 'открывать', '🔓', ['ανοίγω', 'ανοίγει', 'άνοιξε'], 'Άνοιξε την πόρτα.'),
  L('eat', 'τρώω', 'есть (кушать)', '🍽️', ['τρώω', 'τρως', 'τρώει'], 'Τρως ψωμί;'),
  L('be', 'είμαι', 'быть', '🟰', ['είμαι', 'είσαι', 'είναι'], 'Εσύ είσαι ο ναύτης;'),
  L('yes', 'ναι', 'да', '👍', ['ναι'], 'Ναι!'),
  L('no', 'όχι', 'нет', '👎', ['όχι'], 'Όχι!'),
  L('i', 'εγώ', 'я (мне)', '👈', ['εγώ', 'μου'], 'Εγώ;'),
  L('you', 'εσύ', 'ты (тебе)', '👉', ['εσύ', 'σου'], 'Εσύ;'),
  L('the', 'ο / η / το', 'артикль', '🔤', ['ο', 'η', 'το', 'οι', 'τα', 'τον', 'την'], 'Το ψωμί.'),
  L('and', 'και', 'и', '➕', ['και'], 'Ψωμί και νερό.'),
  L('where', 'πού', 'где', '❓', ['πού'], 'Πού;'),
];

/** Case-, accent- and final-sigma-insensitive form of a Greek word. */
export function normalize(word: string): string {
  return word
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/ς/g, 'σ');
}

/** Split a line into word tokens, dropping punctuation (incl. the Greek question mark and ano teleia). */
export function tokenize(text: string): string[] {
  return text
    .split(/[\s—–]+/)
    .map((t) => t.replace(/[.,;;!?··:«»"'…()-]/g, ''))
    .filter(Boolean);
}

const BY_ID = new Map(LEXICON.map((l) => [l.id, l] as const));
const FORMS = new Map<string, LemmaId>();
for (const l of LEXICON) for (const f of l.forms) FORMS.set(normalize(f), l.id);

export function lemmaOf(token: string): LemmaId | null {
  return FORMS.get(normalize(token)) ?? null;
}

export function lemma(id: LemmaId): Lemma {
  return BY_ID.get(id)!;
}

const DISPLAY = new Map<string, string>();
for (const l of LEXICON) for (const f of l.forms) DISPLAY.set(normalize(f), f);

/** Accented spelling of a normalized form, for showing it back to the player. */
export function displayForm(normalized: string): string {
  return DISPLAY.get(normalized) ?? normalized;
}
```

- [ ] **Step 4: Run the test**

Run: `npx vitest run src/content/lexicon.test.ts`
Expected: 6 PASS.

- [ ] **Step 5: Commit**

```bash
git add telegram-bot/game/src/content
git commit -m "game: chapter-1 Greek lexicon and tokenizer"
```

---

### Task 2: Journal (seen words, notes, pages)

**Files:**
- Create: `src/story/journal.ts`
- Test: `src/story/journal.test.ts`

**Interfaces:**
- Consumes: `lemmaOf`, `normalize`, `tokenize`, `LemmaId` (Task 1).
- Produces: `WordPage`, `FormPage`, `Page`, `PageStatus`, `JournalState { seen; seenForms; notes; solved; deciphered }`, `emptyJournal()`, `observe(j, text) → { journal, fresh }`, `setNote(j, id, note)`, `pageStatus(j, page)`, `checkPage(j, page, answers: string[]) → { ok, journal, deciphered }`.

- [ ] **Step 1: Write the failing test `src/story/journal.test.ts`**

```ts
import { describe, expect, it } from 'vitest';
import { checkPage, emptyJournal, observe, pageStatus, setNote, type Page } from './journal';

const words: Page = {
  id: 'p1',
  kind: 'words',
  slots: [
    { icon: '🐟', lemma: 'fish' },
    { icon: '🍞', lemma: 'bread' },
  ],
};
const plural: Page = {
  id: 'g1',
  kind: 'forms',
  slots: [
    { icon: '🐟', form: 'ψάρι' },
    { icon: '🐟🐟', form: 'ψάρια' },
  ],
  deciphers: [],
};

describe('journal', () => {
  it('records new lemmas and their surface forms', () => {
    const { journal, fresh } = observe(emptyJournal(), 'Ψάρια! Θέλω ψωμί.');
    expect(fresh).toEqual(['fish', 'want', 'bread']);
    expect(journal.seenForms).toEqual(['ψαρια', 'θελω', 'ψωμι']);
  });

  it('returns the same journal when nothing is new', () => {
    const j = observe(emptyJournal(), 'Ψωμί.').journal;
    const again = observe(j, 'ψωμί');
    expect(again.fresh).toEqual([]);
    expect(again.journal).toBe(j);
  });

  it('ignores words outside the lexicon', () => {
    expect(observe(emptyJournal(), 'Καλημέρα').fresh).toEqual([]);
  });

  it('opens a page only when all its words were seen', () => {
    let j = observe(emptyJournal(), 'Ψάρι.').journal;
    expect(pageStatus(j, words)).toBe('locked');
    j = observe(j, 'Ψωμί.').journal;
    expect(pageStatus(j, words)).toBe('open');
  });

  it('validates all-or-nothing and deciphers the page words', () => {
    const j = observe(emptyJournal(), 'Ψάρι και ψωμί.').journal;
    expect(checkPage(j, words, ['fish', 'fish']).ok).toBe(false);
    const r = checkPage(j, words, ['fish', 'bread']);
    expect(r.ok).toBe(true);
    expect(r.deciphered).toEqual(['fish', 'bread']);
    expect(pageStatus(r.journal, words)).toBe('solved');
    expect(checkPage(r.journal, words, ['fish', 'bread']).ok).toBe(false);
  });

  it('checks form pages ignoring case and accents', () => {
    const j = observe(emptyJournal(), 'ψάρι ψάρια').journal;
    expect(checkPage(j, plural, ['ΨΑΡΙ', 'ψάρια']).ok).toBe(true);
    expect(checkPage(j, plural, ['ψάρια', 'ψάρι']).ok).toBe(false);
  });

  it('rejects a locked page', () => {
    expect(checkPage(emptyJournal(), words, ['fish', 'bread']).ok).toBe(false);
  });

  it('stores and clears notes', () => {
    const j = setNote(emptyJournal(), 'fish', '  рыба ');
    expect(j.notes.fish).toBe('рыба');
    expect(setNote(j, 'fish', ' ').notes.fish).toBeUndefined();
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npx vitest run src/story/journal.test.ts`
Expected: FAIL — cannot resolve `./journal`.

- [ ] **Step 3: Implement `src/story/journal.ts`**

```ts
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
```

- [ ] **Step 4: Run the test**

Run: `npx vitest run src/story/journal.test.ts`
Expected: 8 PASS.

- [ ] **Step 5: Commit**

```bash
git add telegram-bot/game/src/story
git commit -m "game: journal with all-or-nothing page validation"
```

---

### Task 3: Local word SRS

**Files:**
- Create: `src/story/wordSrs.ts`
- Test: `src/story/wordSrs.test.ts`

**Interfaces:**
- Consumes: `nextLevel` from `@shared/srs`, `LemmaId`.
- Produces: `INTERVAL_DAYS`, `SrsEntry { level; due }`, `SrsState`, `dayKey(d?)`, `addDays(day, n)`, `enroll(s, ids, today)`, `grade(s, id, correct, today)`, `dueToday(s, today): LemmaId[]`, `consolidated(s, ids, minLevel?) → 0..1`.

- [ ] **Step 1: Write the failing test `src/story/wordSrs.test.ts`**

```ts
import { describe, expect, it } from 'vitest';
import { addDays, consolidated, dayKey, dueToday, enroll, grade } from './wordSrs';

const T = '2026-10-05';

describe('wordSrs', () => {
  it('formats local days and adds days across month ends', () => {
    expect(dayKey(new Date(2026, 0, 9))).toBe('2026-01-09');
    expect(addDays('2026-01-31', 1)).toBe('2026-02-01');
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01');
  });

  it('enrolls new words at level 0, due today, and leaves known ones alone', () => {
    const s = enroll({ fish: { level: 4, due: '2026-11-01' } }, ['fish', 'bread'], T);
    expect(s.bread).toEqual({ level: 0, due: T });
    expect(s.fish).toEqual({ level: 4, due: '2026-11-01' });
  });

  it('a right answer climbs the ladder and schedules by level', () => {
    const s = grade(enroll({}, ['fish'], T), 'fish', true, T);
    expect(s.fish).toEqual({ level: 2, due: '2026-10-06' });
  });

  it('a wrong answer drops two levels and is due again today', () => {
    const s = grade({ fish: { level: 4, due: T } }, 'fish', false, T);
    expect(s.fish).toEqual({ level: 2, due: T });
  });

  it('ignores grades for words that are not enrolled', () => {
    const s = {};
    expect(grade(s, 'fish', true, T)).toBe(s);
  });

  it('lists due words oldest first', () => {
    const s = { bread: { level: 1, due: T }, fish: { level: 2, due: '2026-10-01' }, water: { level: 3, due: '2026-10-09' } };
    expect(dueToday(s, T)).toEqual(['fish', 'bread']);
  });

  it('measures how much of a word set is consolidated', () => {
    const s = { fish: { level: 2, due: T }, bread: { level: 1, due: T } };
    expect(consolidated(s, ['fish', 'bread', 'water', 'ship'])).toBe(0.25);
    expect(consolidated(s, [])).toBe(0);
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npx vitest run src/story/wordSrs.test.ts`
Expected: FAIL — cannot resolve `./wordSrs`.

- [ ] **Step 3: Implement `src/story/wordSrs.ts`**

```ts
import { nextLevel } from '@shared/srs';
import type { LemmaId } from '../content/lexicon';

/** Days until the next review per level; mirrors the server ladder (sub-day steps → today). */
export const INTERVAL_DAYS = [0, 0, 1, 3, 7, 14, 30];

export interface SrsEntry {
  level: number;
  due: string; // YYYY-MM-DD, local
}
export type SrsState = Partial<Record<LemmaId, SrsEntry>>;

export function dayKey(d: Date = new Date()): string {
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

export function addDays(day: string, n: number): string {
  const [y, m, d] = day.split('-').map(Number);
  return dayKey(new Date(y, m - 1, d + n));
}

/** Freshly deciphered words start at level 0, due today. */
export function enroll(s: SrsState, ids: LemmaId[], today: string): SrsState {
  const fresh = ids.filter((id) => !s[id]);
  if (fresh.length === 0) return s;
  const next = { ...s };
  for (const id of fresh) next[id] = { level: 0, due: today };
  return next;
}

export function grade(s: SrsState, id: LemmaId, correct: boolean, today: string): SrsState {
  const cur = s[id];
  if (!cur) return s;
  const level = nextLevel(cur.level, correct ? 3 : 1);
  const due = correct ? addDays(today, INTERVAL_DAYS[level]) : today;
  return { ...s, [id]: { level, due } };
}

export function dueToday(s: SrsState, today: string): LemmaId[] {
  return (Object.entries(s) as [LemmaId, SrsEntry][])
    .filter(([, e]) => e.due <= today)
    .sort(([a, ea], [b, eb]) => (ea.due === eb.due ? a.localeCompare(b) : ea.due.localeCompare(eb.due)))
    .map(([id]) => id);
}

export function consolidated(s: SrsState, ids: LemmaId[], minLevel = 2): number {
  if (ids.length === 0) return 0;
  return ids.filter((id) => (s[id]?.level ?? 0) >= minLevel).length / ids.length;
}
```

- [ ] **Step 4: Run the test**

Run: `npx vitest run src/story/wordSrs.test.ts`
Expected: 7 PASS.

- [ ] **Step 5: Commit**

```bash
git add telegram-bot/game/src/story/wordSrs.ts telegram-bot/game/src/story/wordSrs.test.ts
git commit -m "game: local day-based SRS for deciphered words"
```

---

### Task 4: Dialogue rules

**Files:**
- Create: `src/story/dialogue.ts`
- Test: `src/story/dialogue.test.ts`

**Interfaces:**
- Produces: `ItemId`, `WorldState { flags; inventory }`, `Cond`, `Effect`, `Reply { text; correct; answer: string[]; effects? }`, `Rule { when?; say: string[]; replies?; effects? }`, `NpcKind`, `NpcDef { id; scene; kind; rules }`, `MAX_ITEMS`, `matches(c, w)`, `pickRule(npc, w)`, `applyEffects(w, effects?) → { world, exam }`.

- [ ] **Step 1: Write the failing test `src/story/dialogue.test.ts`**

```ts
import { describe, expect, it } from 'vitest';
import { applyEffects, matches, pickRule, type NpcDef, type WorldState } from './dialogue';

const w = (flags: string[] = [], inventory: WorldState['inventory'] = []): WorldState => ({ flags, inventory });

const fisher: NpcDef = {
  id: 'fisher',
  scene: 'fish',
  kind: 'person',
  rules: [
    { when: [{ flag: 'fish_given' }], say: ['Ψάρια!'] },
    { when: [{ has: 'bread' }], say: ['Ψωμί!'], effects: [{ take: 'bread' }, { give: 'fish' }, { set: 'fish_given' }] },
    { say: ['Θέλω ψωμί.'] },
  ],
};

describe('dialogue', () => {
  it('matches each condition kind', () => {
    expect(matches({ flag: 'a' }, w(['a']))).toBe(true);
    expect(matches({ flag: 'a' }, w())).toBe(false);
    expect(matches({ notFlag: 'a' }, w(['a']))).toBe(false);
    expect(matches({ has: 'key' }, w([], ['key']))).toBe(true);
    expect(matches({ lacks: 'key' }, w([], ['key']))).toBe(false);
  });

  it('picks the first rule whose conditions hold', () => {
    expect(pickRule(fisher, w())!.say).toEqual(['Θέλω ψωμί.']);
    expect(pickRule(fisher, w([], ['bread']))!.say).toEqual(['Ψωμί!']);
    expect(pickRule(fisher, w(['fish_given'], ['bread']))!.say).toEqual(['Ψάρια!']);
  });

  it('applies give, take and set', () => {
    const r = applyEffects(w([], ['bread']), [{ take: 'bread' }, { give: 'fish' }, { set: 'fish_given' }]);
    expect(r.world).toEqual({ flags: ['fish_given'], inventory: ['fish'] });
    expect(r.exam).toBe(false);
  });

  it('never duplicates items or flags and reports exams', () => {
    const start = w(['x'], ['fish']);
    const r = applyEffects(start, [{ give: 'fish' }, { set: 'x' }, { exam: true }]);
    expect(r.world).toBe(start);
    expect(r.exam).toBe(true);
  });

  it('caps the inventory', () => {
    const full = w([], ['water', 'bread', 'fish', 'ticket', 'key']);
    expect(applyEffects(full, [{ give: 'water' }]).world.inventory).toHaveLength(5);
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npx vitest run src/story/dialogue.test.ts`
Expected: FAIL — cannot resolve `./dialogue`.

- [ ] **Step 3: Implement `src/story/dialogue.ts`**

```ts
export type ItemId = 'water' | 'bread' | 'fish' | 'ticket' | 'key';

export interface WorldState {
  flags: string[];
  inventory: ItemId[];
}

export interface Cond {
  flag?: string;
  notFlag?: string;
  has?: ItemId;
  lacks?: ItemId;
}

export type Effect = { give: ItemId } | { take: ItemId } | { set: string } | { exam: true };

export interface Reply {
  text: string; // what the player says (Greek)
  correct: boolean;
  answer: string[]; // what the NPC says back
  effects?: Effect[]; // applied only when correct
}

export interface Rule {
  when?: Cond[];
  say: string[];
  replies?: Reply[];
  effects?: Effect[]; // applied on talk when there are no replies, or with the correct reply
}

export type NpcKind = 'person' | 'object' | 'historian';

export interface NpcDef {
  id: string;
  scene: string;
  kind: NpcKind;
  rules: Rule[]; // first match wins; the last rule should have no conditions
}

export const MAX_ITEMS = 6;

export function matches(c: Cond, w: WorldState): boolean {
  if (c.flag !== undefined && !w.flags.includes(c.flag)) return false;
  if (c.notFlag !== undefined && w.flags.includes(c.notFlag)) return false;
  if (c.has !== undefined && !w.inventory.includes(c.has)) return false;
  if (c.lacks !== undefined && w.inventory.includes(c.lacks)) return false;
  return true;
}

export function pickRule(npc: NpcDef, w: WorldState): Rule | null {
  return npc.rules.find((r) => (r.when ?? []).every((c) => matches(c, w))) ?? null;
}

export function applyEffects(w: WorldState, effects: Effect[] = []): { world: WorldState; exam: boolean } {
  let flags = w.flags;
  let inventory = w.inventory;
  let exam = false;
  for (const e of effects) {
    if ('give' in e) {
      if (!inventory.includes(e.give) && inventory.length < MAX_ITEMS) inventory = [...inventory, e.give];
    } else if ('take' in e) {
      if (inventory.includes(e.take)) inventory = inventory.filter((i) => i !== e.take);
    } else if ('set' in e) {
      if (!flags.includes(e.set)) flags = [...flags, e.set];
    } else {
      exam = true;
    }
  }
  return { world: flags === w.flags && inventory === w.inventory ? w : { flags, inventory }, exam };
}
```

- [ ] **Step 4: Run the test**

Run: `npx vitest run src/story/dialogue.test.ts`
Expected: 5 PASS.

- [ ] **Step 5: Commit**

```bash
git add telegram-bot/game/src/story/dialogue.ts telegram-bot/game/src/story/dialogue.test.ts
git commit -m "game: rule-based NPC dialogue with item and flag effects"
```

---

### Task 5: Daily review requests

**Files:**
- Create: `src/story/requests.ts`
- Test: `src/story/requests.test.ts`

**Interfaces:**
- Consumes: `grade`, `dueToday`, `SrsState` (Task 3); `lemma`, `LemmaId` (Task 1); `shuffle` from `src/learning/options.ts`.
- Produces: `REQUEST_CAP = 10`, `Request { id; npcId; lemma; done; graded }`, `RequestsState { day; list }`, `emptyRequests()`, `refreshRequests(r, srs, today, npcIds)`, `openRequestFor(r, npcId)`, `answerRequest(r, srs, requestId, chosen, today) → { requests, srs, correct }`, `requestOptions(q, deciphered, rng?) → LemmaId[]`, `requestProgress(r, today) → { done, total }`.

- [ ] **Step 1: Write the failing test `src/story/requests.test.ts`**

```ts
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
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npx vitest run src/story/requests.test.ts`
Expected: FAIL — cannot resolve `./requests`.

- [ ] **Step 3: Implement `src/story/requests.ts`**

```ts
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
```

- [ ] **Step 4: Run the test**

Run: `npx vitest run src/story/requests.test.ts`
Expected: 6 PASS.

- [ ] **Step 5: Commit**

```bash
git add telegram-bot/game/src/story/requests.ts telegram-bot/game/src/story/requests.test.ts
git commit -m "game: daily review requests from due words"
```

---

### Task 6: Chapter 1 content and integrity tests

**Files:**
- Create: `src/content/chapter1.ts`
- Test: `src/content/chapter1.test.ts`

**Interfaces:**
- Consumes: `lemma`, `LEXICON`, `LemmaId` (Task 1); `NpcDef`, `ItemId` (Task 4); `Page` (Task 2).
- Produces: `SceneId`, `SCENES: { id; ru; el }[]`, `START`, `ITEMS: Record<ItemId, { icon; lemma }>`, `SignDef`, `SIGNS`, `NPCS: NpcDef[]`, `NPC_BY_ID`, `PAGES: Page[]`, `PAGE_BY_ID`, `REQUEST_NPCS: string[]`, `CHAPTER_LEMMAS: LemmaId[]`, `EXAM_PER_DAY = 5`, `CHAPTER_UNLOCK = 0.8`.

- [ ] **Step 1: Write the failing test `src/content/chapter1.test.ts`**

```ts
import { describe, expect, it } from 'vitest';
import { applyEffects, pickRule, type WorldState } from '../story/dialogue';
import { LEXICON, lemmaOf, normalize, tokenize } from './lexicon';
import { NPCS, NPC_BY_ID, PAGES, REQUEST_NPCS, SIGNS } from './chapter1';

const allLines = () => [
  ...SIGNS.map((s) => s.text),
  ...NPCS.flatMap((n) => n.rules.flatMap((r) => [...r.say, ...(r.replies ?? []).flatMap((p) => [p.text, ...p.answer])])),
];

describe('chapter 1 content', () => {
  it('uses only lexicon words', () => {
    for (const line of allLines()) {
      for (const t of tokenize(line)) expect(lemmaOf(t), `"${t}" in "${line}"`).not.toBeNull();
    }
  });

  it('shows every lemma somewhere in the world', () => {
    const seen = new Set(allLines().flatMap((l) => tokenize(l).map(lemmaOf)));
    for (const l of LEXICON) expect(seen.has(l.id), l.id).toBe(true);
  });

  it('every page can open and every lemma can be deciphered', () => {
    const forms = new Set(allLines().flatMap((l) => tokenize(l).map(normalize)));
    const deciphered = new Set<string>();
    for (const p of PAGES) {
      if (p.kind === 'words') p.slots.forEach((s) => deciphered.add(s.lemma));
      else {
        p.slots.forEach((s) => expect(forms.has(normalize(s.form)), s.form).toBe(true));
        p.deciphers.forEach((id) => deciphered.add(id));
      }
    }
    for (const l of LEXICON) expect(deciphered.has(l.id), l.id).toBe(true);
  });

  it('has unique NPC ids and a fallback rule for each', () => {
    expect(new Set(NPCS.map((n) => n.id)).size).toBe(NPCS.length);
    for (const n of NPCS) expect(n.rules[n.rules.length - 1].when ?? [], n.id).toEqual([]);
    for (const id of REQUEST_NPCS) expect(NPC_BY_ID.get(id)?.kind, id).toBe('person');
  });

  it('the chapter can be finished from the start', () => {
    let w: WorldState = { flags: [], inventory: [] };
    for (let pass = 0; pass < 20 && !w.flags.includes('gate_open'); pass++) {
      for (const npc of NPCS) {
        const rule = pickRule(npc, w)!;
        const reply = rule.replies?.find((r) => r.correct);
        w = applyEffects(w, [...(rule.effects ?? []), ...(reply?.effects ?? [])]).world;
      }
    }
    expect(w.flags).toEqual(expect.arrayContaining(['key_given', 'door_open', 'child_fed', 'gate_open']));
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npx vitest run src/content/chapter1.test.ts`
Expected: FAIL — cannot resolve `./chapter1`.

- [ ] **Step 3: Implement `src/content/chapter1.ts`**

```ts
import type { ItemId, NpcDef } from '../story/dialogue';
import type { Page } from '../story/journal';
import { LEXICON, lemma, type LemmaId } from './lexicon';

export type SceneId = 'pier' | 'fish' | 'bakery' | 'square' | 'lane' | 'gate';

export const SCENES: { id: SceneId; ru: string; el: string }[] = [
  { id: 'pier', ru: 'Пирей · Причал', el: 'Πειραιάς · Αποβάθρα' },
  { id: 'fish', ru: 'Пирей · Рыбный рынок', el: 'Πειραιάς · Ψαραγορά' },
  { id: 'bakery', ru: 'Пирей · Пекарня', el: 'Πειραιάς · Φούρνος' },
  { id: 'square', ru: 'Пирей · Площадь', el: 'Πειραιάς · Πλατεία' },
  { id: 'lane', ru: 'Пирей · Переулок', el: 'Πειραιάς · Σοκάκι' },
  { id: 'gate', ru: 'Пирей · Ворота', el: 'Πειραιάς · Πύλη' },
];

export const START: { scene: SceneId; x: number; z: number } = { scene: 'pier', x: -6, z: 3 };

export const ITEMS: Record<ItemId, { icon: string; lemma: LemmaId }> = {
  water: { icon: '💧', lemma: 'water' },
  bread: { icon: '🍞', lemma: 'bread' },
  fish: { icon: '🐟', lemma: 'fish' },
  ticket: { icon: '🎫', lemma: 'ticket' },
  key: { icon: '🔑', lemma: 'key' },
};

export interface SignDef {
  id: string;
  scene: SceneId;
  text: string;
  style: 'carved' | 'painted';
}

export const SIGNS: SignDef[] = [
  { id: 'pier_port', scene: 'pier', text: 'ΛΙΜΑΝΙ', style: 'carved' },
  { id: 'pier_athens', scene: 'pier', text: 'ΑΘΗΝΑ', style: 'painted' },
  { id: 'fish_sign', scene: 'fish', text: 'ΨΑΡΙΑ', style: 'painted' },
  { id: 'bakery_sign', scene: 'bakery', text: 'ΨΩΜΙ', style: 'painted' },
  { id: 'square_fountain', scene: 'square', text: 'ΝΕΡΟ', style: 'carved' },
  { id: 'lane_house', scene: 'lane', text: 'ΣΠΙΤΙ', style: 'carved' },
  { id: 'gate_athens', scene: 'gate', text: 'ΑΘΗΝΑ', style: 'carved' },
  { id: 'gate_ticket', scene: 'gate', text: 'ΕΙΣΙΤΗΡΙΟ', style: 'painted' },
];

export const SIGN_BY_ID = new Map(SIGNS.map((s) => [s.id, s] as const));

export const NPCS: NpcDef[] = [
  {
    id: 'sailor',
    scene: 'pier',
    kind: 'person',
    rules: [
      { when: [{ flag: 'key_given' }], say: ['Το πλοίο. Η θάλασσα.'] },
      {
        say: ['Λιμάνι!', 'Εγώ είμαι ο ναύτης.', 'Εσύ; Πού πηγαίνεις;'],
        replies: [
          { text: 'Πηγαίνω Αθήνα.', correct: true, answer: ['Αθήνα! Ναι.', 'Το κλειδί.'], effects: [{ give: 'key' }, { set: 'key_given' }] },
          { text: 'Θέλω ψάρι.', correct: false, answer: ['Όχι… Πού πηγαίνεις;'] },
          { text: 'Όχι.', correct: false, answer: ['Όχι; Πού πηγαίνεις;'] },
        ],
      },
    ],
  },
  { id: 'woman_pier', scene: 'pier', kind: 'person', rules: [{ say: ['Τα πλοία. Η θάλασσα.', 'Ο άντρας πηγαίνει Αθήνα.'] }] },
  {
    id: 'fisher',
    scene: 'fish',
    kind: 'person',
    rules: [
      { when: [{ flag: 'fish_given' }], say: ['Τα ψάρια! Ψάρια!'] },
      { when: [{ has: 'bread' }], say: ['Ψωμί! Ναι!', 'Δίνω ψάρι.'], effects: [{ take: 'bread' }, { give: 'fish' }, { set: 'fish_given' }] },
      { say: ['Ψάρια!', 'Η γυναίκα θέλει ψάρι.', 'Εγώ θέλω ψωμί.'] },
    ],
  },
  { id: 'woman', scene: 'fish', kind: 'person', rules: [{ say: ['Θέλω ψάρι.', 'Ο ψαράς έχει ψάρια.'] }] },
  {
    id: 'baker',
    scene: 'bakery',
    kind: 'person',
    rules: [
      { when: [{ flag: 'bread_given' }], say: ['Ψωμί! Ψωμί!'] },
      { when: [{ flag: 'child_fed' }], say: ['Το παιδί έχει νερό. Ναι!', 'Δίνω ψωμί.'], effects: [{ give: 'bread' }, { set: 'bread_given' }] },
      { say: ['Εγώ είμαι ο φούρναρης.', 'Το παιδί θέλει νερό.'] },
    ],
  },
  {
    id: 'child',
    scene: 'bakery',
    kind: 'person',
    rules: [
      { when: [{ flag: 'child_fed' }], say: ['Νερό! Ναι!', 'Ο φούρναρης έχει ψωμί.'] },
      { when: [{ has: 'water' }], say: ['Νερό! Ναι!'], effects: [{ take: 'water' }, { set: 'child_fed' }] },
      { say: ['Θέλω νερό.', 'Φέρε μου νερό!', 'Νερό και ψωμί!'] },
    ],
  },
  {
    id: 'fountain',
    scene: 'square',
    kind: 'object',
    rules: [{ when: [{ has: 'water' }], say: ['Νερό.'] }, { say: ['Νερό.'], effects: [{ give: 'water' }] }],
  },
  { id: 'historian', scene: 'square', kind: 'historian', rules: [{ say: ['Εσύ! Ναι, εσύ.'], effects: [{ exam: true }] }] },
  { id: 'man', scene: 'lane', kind: 'person', rules: [{ say: ['Το σπίτι.', 'Εγώ τρώω ψωμί.'] }] },
  {
    id: 'door',
    scene: 'lane',
    kind: 'object',
    rules: [
      { when: [{ flag: 'door_open' }], say: ['Ο δρόμος.'] },
      { when: [{ has: 'key' }], say: ['Ανοίγω την πόρτα.'], effects: [{ take: 'key' }, { set: 'door_open' }] },
      { say: ['Η πόρτα. Όχι.'] },
    ],
  },
  {
    id: 'seller',
    scene: 'gate',
    kind: 'person',
    rules: [
      { when: [{ flag: 'ticket_given' }], say: ['Ο φύλακας. Ο δρόμος.'] },
      { when: [{ has: 'fish' }], say: ['Ψάρι! Ναι!', 'Δίνω εισιτήριο.'], effects: [{ take: 'fish' }, { give: 'ticket' }, { set: 'ticket_given' }] },
      { say: ['Εισιτήριο;', 'Ο φύλακας θέλει εισιτήριο.', 'Εγώ θέλω ψάρι.'] },
    ],
  },
  {
    id: 'guard',
    scene: 'gate',
    kind: 'person',
    rules: [
      { when: [{ flag: 'gate_open' }], say: ['Ο δρόμος. Αθήνα.'] },
      {
        when: [{ has: 'ticket' }],
        say: ['Εισιτήριο;'],
        replies: [
          { text: 'Ναι. Έχω εισιτήριο.', correct: true, answer: ['Ναι. Ο δρόμος. Αθήνα.'], effects: [{ take: 'ticket' }, { set: 'gate_open' }] },
          { text: 'Όχι.', correct: false, answer: ['Όχι; Εισιτήριο;'] },
          { text: 'Θέλω νερό.', correct: false, answer: ['Όχι. Εισιτήριο;'] },
        ],
      },
      { say: ['Όχι. Εισιτήριο;'] },
    ],
  },
];

export const NPC_BY_ID = new Map(NPCS.map((n) => [n.id, n] as const));

const wordPage = (id: string, ids: LemmaId[]): Page => ({
  id,
  kind: 'words',
  slots: ids.map((l) => ({ icon: lemma(l).icon, lemma: l })),
});

export const PAGES: Page[] = [
  wordPage('people', ['man', 'woman', 'child', 'sailor']),
  wordPage('harbour', ['port', 'ship', 'sea', 'fisher']),
  wordPage('food', ['fish', 'bread', 'water', 'eat']),
  wordPage('hands', ['want', 'have', 'give', 'bring']),
  wordPage('town', ['house', 'door', 'key', 'open']),
  wordPage('gate', ['guard', 'ticket', 'road', 'athens']),
  wordPage('talk', ['yes', 'no', 'i', 'you', 'be']),
  wordPage('more', ['baker', 'go', 'where', 'and']),
  {
    id: 'articles',
    kind: 'forms',
    slots: [
      { icon: '🧔', form: 'ο' },
      { icon: '👩', form: 'η' },
      { icon: '🧒', form: 'το' },
    ],
    deciphers: ['the'],
  },
  {
    id: 'plural',
    kind: 'forms',
    slots: [
      { icon: '🐟', form: 'ψάρι' },
      { icon: '🐟🐟🐟', form: 'ψάρια' },
      { icon: '🚢', form: 'πλοίο' },
      { icon: '🚢🚢🚢', form: 'πλοία' },
    ],
    deciphers: [],
  },
];

export const PAGE_BY_ID = new Map(PAGES.map((p) => [p.id, p] as const));

export const REQUEST_NPCS = ['sailor', 'woman_pier', 'fisher', 'woman', 'baker', 'child', 'man', 'seller'];

export const CHAPTER_LEMMAS: LemmaId[] = LEXICON.map((l) => l.id);
export const EXAM_PER_DAY = 5;
export const CHAPTER_UNLOCK = 0.8;
```

- [ ] **Step 4: Run all tests**

Run: `npm test`
Expected: all PASS (chapter1: 5 new).

- [ ] **Step 5: Commit**

```bash
git add telegram-bot/game/src/content
git commit -m "game: chapter 1 «Πειραιάς» content with integrity tests"
```

---

### Task 7: Story state, director and store

**Files:**
- Create: `src/story/state.ts`, `src/story/director.ts`, `src/story/store.ts`
- Test: `src/story/director.test.ts`, `src/story/store.test.ts`

**Interfaces:**
- Consumes: everything from Tasks 1–6; `KV`, `readJSON`, `writeJSON`, `memoryKV` (`src/kv.ts`).
- Produces:
  - `state.ts`: `StoryState { version: 1; scene; x; z; world; journal; srs; requests; examDay; examDone; chapterDone }`, `newStory()`, `loadStory(store, accountId)`, `saveStory(store, accountId, s)`.
  - `director.ts`: `DialogueView` (`{ kind: 'lines'; npcId; lines; replies; exam }` | `{ kind: 'request'; npcId; requestId; lines; options }`), `talk(s, npcId, today, rng?)`, `reply(s, npcId, index)`, `answer(s, requestId, chosen, today)`, `solvePage(s, pageId, answers, today)`, `writeNote(s, id, text)`, `enterScene(s, scene, x, z)`, `chapterProgress(s)`, `examLeft(s, today)`, `countExam(s, today)`.
  - `store.ts`: `class StoryStore { constructor(accountId, storage); get(); version(); subscribe(fn); update(fn) }`.

- [ ] **Step 1: Write the failing tests**

`src/story/director.test.ts`:
```ts
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
```

`src/story/store.test.ts`:
```ts
import { describe, expect, it, vi } from 'vitest';
import { memoryKV } from '../kv';
import { loadStory, newStory } from './state';
import { StoryStore } from './store';

describe('StoryStore', () => {
  it('persists updates and notifies subscribers', () => {
    const kv = memoryKV();
    const store = new StoryStore('acc', kv);
    const fn = vi.fn();
    store.subscribe(fn);
    store.update((s) => ({ ...s, scene: 'fish' }));
    expect(fn).toHaveBeenCalledTimes(1);
    expect(store.version()).toBe(1);
    expect(loadStory(kv, 'acc').scene).toBe('fish');
  });

  it('skips no-op updates', () => {
    const store = new StoryStore('acc', memoryKV());
    const fn = vi.fn();
    store.subscribe(fn);
    store.update((s) => s);
    expect(fn).not.toHaveBeenCalled();
  });

  it('starts a new story from corrupt data', () => {
    const kv = memoryKV();
    kv.setItem('hs_sennaar_save_acc', '{nope');
    expect(new StoryStore('acc', kv).get()).toEqual(newStory());
  });
});
```

- [ ] **Step 2: Run them to verify they fail**

Run: `npx vitest run src/story/director.test.ts src/story/store.test.ts`
Expected: FAIL — cannot resolve `./director`, `./store`.

- [ ] **Step 3: Implement `src/story/state.ts`**

```ts
import { START, type SceneId } from '../content/chapter1';
import { readJSON, writeJSON, type KV } from '../kv';
import type { WorldState } from './dialogue';
import { emptyJournal, type JournalState } from './journal';
import { emptyRequests, type RequestsState } from './requests';
import type { SrsState } from './wordSrs';

export interface StoryState {
  version: 1;
  scene: SceneId;
  x: number;
  z: number;
  world: WorldState;
  journal: JournalState;
  srs: SrsState;
  requests: RequestsState;
  examDay: string;
  examDone: number;
  chapterDone: boolean;
}

export function newStory(): StoryState {
  return {
    version: 1,
    scene: START.scene,
    x: START.x,
    z: START.z,
    world: { flags: [], inventory: [] },
    journal: emptyJournal(),
    srs: {},
    requests: emptyRequests(),
    examDay: '',
    examDone: 0,
    chapterDone: false,
  };
}

const key = (accountId: string) => `hs_sennaar_save_${accountId}`;

export function loadStory(store: KV, accountId: string): StoryState {
  const s = readJSON<StoryState>(store, key(accountId));
  if (!s || s.version !== 1) return newStory();
  const base = newStory();
  return {
    ...base,
    ...s,
    world: { ...base.world, ...s.world },
    journal: { ...base.journal, ...s.journal },
    requests: { ...base.requests, ...s.requests },
  };
}

export function saveStory(store: KV, accountId: string, s: StoryState): void {
  writeJSON(store, key(accountId), s);
}
```

- [ ] **Step 4: Implement `src/story/director.ts`**

```ts
import { CHAPTER_LEMMAS, EXAM_PER_DAY, NPC_BY_ID, PAGE_BY_ID, REQUEST_NPCS, type SceneId } from '../content/chapter1';
import { lemma, type LemmaId } from '../content/lexicon';
import { applyEffects, pickRule } from './dialogue';
import { checkPage, observe, setNote } from './journal';
import { answerRequest, openRequestFor, refreshRequests, requestOptions } from './requests';
import type { StoryState } from './state';
import { consolidated, enroll } from './wordSrs';

export type DialogueView =
  | { kind: 'lines'; npcId: string; lines: string[]; replies: string[]; exam: boolean }
  | { kind: 'request'; npcId: string; requestId: string; lines: string[]; options: LemmaId[] };

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
      return { state: st, view: { kind: 'request', npcId, requestId: q.id, lines: [line], options } };
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
```

- [ ] **Step 5: Implement `src/story/store.ts`**

```ts
import type { KV } from '../kv';
import { loadStory, saveStory, type StoryState } from './state';

/** The one mutable holder of story state: persists every change and notifies React. */
export class StoryStore {
  private state: StoryState;
  private ver = 0;
  private readonly listeners = new Set<() => void>();

  constructor(private readonly accountId: string, private readonly storage: KV) {
    this.state = loadStory(storage, accountId);
  }

  get(): StoryState {
    return this.state;
  }

  version = (): number => this.ver;

  subscribe = (fn: () => void): (() => void) => {
    this.listeners.add(fn);
    return () => {
      this.listeners.delete(fn);
    };
  };

  update(fn: (s: StoryState) => StoryState): void {
    const next = fn(this.state);
    if (next === this.state) return;
    this.state = next;
    saveStory(this.storage, this.accountId, next);
    this.ver++;
    for (const l of [...this.listeners]) l();
  }
}
```

- [ ] **Step 6: Run all tests and build**

Run: `npm test && npm run build`
Expected: all PASS; build exit 0.

- [ ] **Step 7: Commit**

```bash
git add telegram-bot/game/src/story
git commit -m "game: story state, director and persistent store"
```

---

### Task 8: 3D engine, the pier, and retiring Phaser

**Files:**
- Delete: `src/world/` (all), `src/save.ts`, `src/save.test.ts`, `src/ui/GameCanvas.tsx`, `src/ui/Victory.tsx`, `src/ui/Hud.tsx` (rewritten), `spike.html`, `spike/`
- Create: `src/world3d/style.ts`, `src/world3d/figure.ts`, `src/world3d/types.ts`, `src/world3d/engine.ts`, `src/world3d/scenes/common.ts`, `src/world3d/scenes/pier.ts`, `src/world3d/scenes/index.ts`, `src/ui/WorldCanvas.tsx`, `src/ui/Hud.tsx`
- Modify: `package.json` (deps), `src/bus.ts`, `src/bus.test.ts`, `src/learning/controller.test.ts`, `src/ui/strings.ts`, `src/ui/Play.tsx`, `src/main.tsx`, `src/styles.css`

**Interfaces:**
- Consumes: `StoryStore` (Task 7), `enterScene`, `requestProgress`, `dayKey`, `SCENES`, `SceneId`.
- Produces:
  - `bus.ts` events: `'npc:talk' { npcId }`, `'world:near' { npcId: string | null }`, `'world:freeze' { frozen }`, `'world:flags' {}`, `'chapter:end' {}`, `toast { key: ToastKey; value? }`; `ChallengeSource = 'historian'`; `ToastKey = 'newWords' | 'itemGot' | 'pageSolved' | 'pageWrong' | 'examDone'`.
  - `style.ts`: `PAL`, `toon(color, flat?)`, `setLineResolution(w, h)`, `class Kit` (scene helpers listed in the code).
  - `figure.ts`: `Figure`, `figure(kit, cloak, trim, scale?)`, `animateFigure(f, dt, moving, t)`.
  - `types.ts`: `Shot`, `Exit`, `Blocker`, `NpcSpot`, `SceneBuild`, `SceneBuilder`.
  - `engine.ts`: `WorldDeps`, `class World { constructor(parent, deps); screenPos(id): {x,y} | null; dispose() }`.
  - `scenes/common.ts`: `Solids`, `BOUNDS`, `WIDE`, `harbour(kit)`, `town(kit)`, `toLeft(to)`, `toRight(to)`.
  - `scenes/index.ts`: `SCENE_BUILDERS: Record<SceneId, SceneBuilder>`.

- [ ] **Step 1: Swap dependencies and delete the Phaser world and the spike**

Run (in `telegram-bot/game`):
```bash
npm uninstall phaser
npm install three@0.186.1 @fontsource/gfs-didot
npm install -D @types/three
git rm -r -q src/world src/save.ts src/save.test.ts src/ui/GameCanvas.tsx src/ui/Victory.tsx src/ui/Hud.tsx
rm -rf spike spike.html
```
Expected: exit 0; `node_modules/three` and `node_modules/@fontsource/gfs-didot` exist.

- [ ] **Step 2: Update `src/bus.ts`**

Replace the type block above `type Handler` with:
```ts
import type { ChallengeKind } from './learning/types';

export type ChallengeSource = 'historian';
export type ToastKey = 'newWords' | 'itemGot' | 'pageSolved' | 'pageWrong' | 'examDone';

export interface BusEvents {
  'challenge:request': {
    requestId: string;
    source: ChallengeSource;
    kind: ChallengeKind | 'any';
    preferTopics?: string[];
  };
  'challenge:result': { requestId: string; correct: boolean };
  /** World → UI: the player pressed E next to an NPC or object. */
  'npc:talk': { npcId: string };
  /** World → UI: the closest talkable thing changed. */
  'world:near': { npcId: string | null };
  /** UI → world: stop/resume movement and E. */
  'world:freeze': { frozen: boolean };
  /** UI → world: story flags changed (re-check doors and bars). */
  'world:flags': Record<string, never>;
  /** World → UI: the player walked through the open gate. */
  'chapter:end': Record<string, never>;
  toast: { key: ToastKey; value?: string };
}
```
(The `Bus` class and `bus` export stay unchanged.)

In `src/bus.test.ts` replace both `'game:pause'` events with `'world:freeze'` and their payloads `{ paused: … }` with `{ frozen: … }`.
In `src/learning/controller.test.ts` replace `source: 'altar'` with `source: 'historian'`.

- [ ] **Step 3: Update `src/ui/strings.ts`**

Replace the `ru` and `el` objects with:
```ts
  ru: {
    title: 'Hellas Sennaar',
    username: 'Ник',
    password: 'Пароль',
    login: 'Войти',
    register: 'Создать аккаунт',
    guest: 'Играть гостем',
    loginFailed: 'Неверный ник или пароль',
    userExists: 'Такой ник уже занят',
    networkError: 'Нет связи с сервером',
    loading: 'Корабль входит в гавань…',
    retrying: 'Сервер просыпается, попытка {v}',
    retry: 'Повторить',
    offline: 'офлайн',
    today: 'Просьбы сегодня',
    streak: 'Серия',
    continueHint: 'Enter — дальше',
    correct: 'Верно!',
    wrong: 'Неверно',
    rightAnswer: 'Правильный ответ',
    practice: 'Практика',
    review: 'Повторение',
    fresh: 'Новое',
    src_historian: 'Историк',
    paused: 'Пауза',
    resume: 'Продолжить',
    language: 'Язык интерфейса: русский',
    logout: 'Выйти из аккаунта',
    controls: 'WASD — идти · E — говорить · Tab — дневник · C — камера · Esc — пауза',
    talk: 'E — говорить',
    nextHint: 'E — дальше · клик по слову — дневник',
    chooseHint: '1–3 — ответить',
    journal: 'Дневник',
    yourGuess: 'твоя догадка…',
    pageLocked: 'Страница откроется, когда встретишь все её слова.',
    check: 'Проверить',
    newWords: 'Новых слов в дневнике: {v}',
    itemGot: 'Получено: {v}',
    pageSolved: 'Страница расшифрована!',
    pageWrong: 'Не сходится…',
    examDone: 'Историк: на сегодня всё',
    chapterDone: 'Глава 1 пройдена',
    chapterNext: 'Глава 2 откроется, когда закрепишь 80% слов (сейчас {v}%). Возвращайся каждый день — жители Пирея будут просить повторить слова.',
    noWebgl: 'Нужен WebGL: обнови драйвер видеокарты или браузер.',
  },
  el: {
    title: 'Hellas Sennaar',
    username: 'Ψευδώνυμο',
    password: 'Κωδικός',
    login: 'Είσοδος',
    register: 'Νέος λογαριασμός',
    guest: 'Παίξε ως επισκέπτης',
    loginFailed: 'Λάθος ψευδώνυμο ή κωδικός',
    userExists: 'Το ψευδώνυμο υπάρχει ήδη',
    networkError: 'Δεν υπάρχει σύνδεση με τον διακομιστή',
    loading: 'Το πλοίο μπαίνει στο λιμάνι…',
    retrying: 'Ο διακομιστής ξυπνά, προσπάθεια {v}',
    retry: 'Ξανά',
    offline: 'εκτός σύνδεσης',
    today: 'Αιτήματα σήμερα',
    streak: 'Σερί',
    continueHint: 'Enter — συνέχεια',
    correct: 'Σωστά!',
    wrong: 'Λάθος',
    rightAnswer: 'Σωστή απάντηση',
    practice: 'Εξάσκηση',
    review: 'Επανάληψη',
    fresh: 'Νέο',
    src_historian: 'Ιστορικός',
    paused: 'Παύση',
    resume: 'Συνέχεια',
    language: 'Γλώσσα: ελληνικά',
    logout: 'Αποσύνδεση',
    controls: 'WASD — κίνηση · E — μίλα · Tab — ημερολόγιο · C — κάμερα · Esc — παύση',
    talk: 'E — μίλα',
    nextHint: 'E — συνέχεια · κλικ σε λέξη — ημερολόγιο',
    chooseHint: '1–3 — απάντηση',
    journal: 'Ημερολόγιο',
    yourGuess: 'η εικασία σου…',
    pageLocked: 'Η σελίδα ανοίγει όταν δεις όλες τις λέξεις της.',
    check: 'Έλεγχος',
    newWords: 'Νέες λέξεις στο ημερολόγιο: {v}',
    itemGot: 'Πήρες: {v}',
    pageSolved: 'Η σελίδα αποκρυπτογραφήθηκε!',
    pageWrong: 'Δεν ταιριάζει…',
    examDone: 'Ο ιστορικός: αρκετά για σήμερα',
    chapterDone: 'Το κεφάλαιο 1 ολοκληρώθηκε',
    chapterNext: 'Το κεφάλαιο 2 ανοίγει όταν σταθεροποιήσεις το 80% των λέξεων (τώρα {v}%). Έλα κάθε μέρα.',
    noWebgl: 'Χρειάζεται WebGL: ενημέρωσε τον οδηγό κάρτας γραφικών ή τον browser.',
  },
```

- [ ] **Step 4: Create `src/world3d/style.ts`**

```ts
import * as THREE from 'three';
import { LineMaterial } from 'three/examples/jsm/lines/LineMaterial.js';
import { LineSegments2 } from 'three/examples/jsm/lines/LineSegments2.js';
import { LineSegmentsGeometry } from 'three/examples/jsm/lines/LineSegmentsGeometry.js';

export const PAL = {
  horizon: 0xf8e6c4,
  wall: 0xf3ede2,
  stone: 0xd8c7a3,
  stoneDark: 0xb9a37c,
  blue: 0x2557a8,
  sea: 0x3f7fbf,
  seaFar: 0x7aa6cf,
  ochre: 0xc98b3c,
  terracotta: 0xb4552f,
  red: 0xa63a2a,
  magenta: 0xb8337a,
  green: 0x5d7f3a,
  olive: 0x7d8f4e,
  skin: 0xe9cfa6,
  ink: 0x1b1712,
  mountain: 0xc9a77f,
  mountainFar: 0xdcbf98,
  cloud: 0xfbf3e4,
  cat: 0x3a3330,
  fishScale: 0x9db3c4,
  wood: 0x8a5a34,
  brown: 0x5a4a3a,
} as const;

// Two-step toon ramp: lit / shadow, nothing in between — the comic-book look.
const ramp = new THREE.DataTexture(new Uint8Array([120, 120, 255, 255]), 4, 1, THREE.RedFormat);
ramp.minFilter = THREE.NearestFilter;
ramp.magFilter = THREE.NearestFilter;
ramp.needsUpdate = true;

const lines = {
  ink: new LineMaterial({ color: PAL.ink, linewidth: 3 }),
  thin: new LineMaterial({ color: PAL.ink, linewidth: 1.5 }),
  foam: new LineMaterial({ color: 0xeaf2fb, linewidth: 1.6 }),
};
export function setLineResolution(w: number, h: number): void {
  for (const m of Object.values(lines)) m.resolution.set(w, h);
}

const hullMat = new THREE.MeshBasicMaterial({ color: PAL.ink, side: THREE.BackSide });
const toonCache = new Map<string, THREE.MeshToonMaterial>();

export function toon(color: number, flat = false): THREE.MeshToonMaterial {
  const key = `${color}-${flat}`;
  let m = toonCache.get(key);
  if (!m) {
    // polygonOffset pushes faces back so the ink lines on their edges always win the depth test.
    m = new THREE.MeshToonMaterial({
      color,
      gradientMap: ramp,
      flatShading: flat,
      polygonOffset: true,
      polygonOffsetFactor: 1,
      polygonOffsetUnits: 1,
    });
    toonCache.set(key, m);
  }
  return m;
}

export type Outline = 'ink' | 'hull' | 'none';
type Animator = (t: number, dt: number) => void;

/** Seeded RNG so a scene looks the same every time it loads. */
function mulberry32(seed: number): () => number {
  let a = seed;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Scene-building helpers: everything is primitives + toon + ink, Chants style. */
export class Kit {
  readonly animators: Animator[] = [];
  readonly rand: () => number;

  constructor(readonly scene: THREE.Scene, seed: number) {
    this.rand = mulberry32(seed);
  }

  tick(t: number, dt: number): void {
    for (const a of this.animators) a(t, dt);
  }

  mesh(geo: THREE.BufferGeometry, color: number, outline: Outline = 'ink', flat = false, hullScale = 1.06): THREE.Mesh {
    const m = new THREE.Mesh(geo, toon(color, flat));
    m.castShadow = true;
    m.receiveShadow = true;
    if (outline === 'ink') {
      const edges = new THREE.EdgesGeometry(geo, 25);
      m.add(new LineSegments2(new LineSegmentsGeometry().fromEdgesGeometry(edges), lines.ink));
      edges.dispose();
    } else if (outline === 'hull') {
      const h = new THREE.Mesh(geo, hullMat);
      h.scale.setScalar(hullScale);
      m.add(h);
    }
    return m;
  }

  add(geo: THREE.BufferGeometry, color: number, x: number, y: number, z: number, outline: Outline = 'ink', flat = false): THREE.Mesh {
    const m = this.mesh(geo, color, outline, flat);
    m.position.set(x, y, z);
    this.scene.add(m);
    return m;
  }

  /** Box standing on y (bottom face at y). */
  box(w: number, h: number, d: number, color: number, x: number, y: number, z: number): THREE.Mesh {
    return this.add(new THREE.BoxGeometry(w, h, d), color, x, y + h / 2, z);
  }

  lettering(text: string, w: number, h: number, style: 'carved' | 'painted'): THREE.Mesh {
    const c = document.createElement('canvas');
    c.width = 1024;
    c.height = Math.round((1024 * h) / w);
    const g = c.getContext('2d')!;
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    const spaced = text.split('').join(' ');
    let px = c.height * 0.8;
    do {
      g.font = `${px}px "GFS Didot", Georgia, serif`;
      px -= 6;
    } while (g.measureText(spaced).width > c.width * 0.88 && px > 20);
    const cx = c.width / 2;
    const cy = c.height / 2;
    if (style === 'carved') {
      g.fillStyle = 'rgba(40,30,20,.9)';
      g.fillText(spaced, cx - 4, cy - 4);
      g.fillStyle = 'rgba(255,248,230,.85)';
      g.fillText(spaced, cx + 4, cy + 4);
      g.fillStyle = '#8f7a58';
    } else {
      g.fillStyle = '#2557a8';
    }
    g.fillText(spaced, cx, cy);
    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = 8;
    const mat = new THREE.MeshBasicMaterial({ map: tex, transparent: true });
    mat.userData.own = true; // disposed with the scene
    return new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat);
  }

  /** Painted signboard; y is the bottom of the board, text faces +z. */
  signboard(text: string, x: number, y: number, z: number, w = 3.6, h = 0.9): THREE.Mesh {
    const board = this.box(w + 0.2, h + 0.1, 0.14, PAL.wall, x, y, z);
    const t = this.lettering(text, w, h, 'painted');
    t.position.z = 0.08;
    board.add(t);
    return board;
  }

  /** Carved stone plaque centred at (x, y, z), text facing +z. */
  plaque(text: string, x: number, y: number, z: number, w = 2.4, h = 0.8): THREE.Mesh {
    const slab = this.add(new THREE.BoxGeometry(w + 0.3, h + 0.2, 0.12), PAL.stone, x, y, z);
    const t = this.lettering(text, w, h, 'carved');
    t.position.z = 0.07;
    slab.add(t);
    return slab;
  }

  stele(text: string, x: number, z: number): void {
    const s = this.box(2.4, 3.4, 0.6, PAL.stone, x, 0, z);
    this.box(2.8, 0.3, 0.9, PAL.stoneDark, x, 3.4, z);
    const t = this.lettering(text, 2.2, 0.75, 'carved');
    t.position.set(0, 0.6, 0.31);
    s.add(t);
  }

  signpost(text: string, x: number, z: number): void {
    this.box(0.25, 3.2, 0.25, PAL.wood, x, 0, z);
    const arrow = new THREE.Shape([
      new THREE.Vector2(-1.6, -0.45),
      new THREE.Vector2(1.2, -0.45),
      new THREE.Vector2(1.8, 0),
      new THREE.Vector2(1.2, 0.45),
      new THREE.Vector2(-1.6, 0.45),
    ]);
    const board = this.add(new THREE.ExtrudeGeometry(arrow, { depth: 0.12, bevelEnabled: false }), PAL.wall, x + 0.6, 2.6, z + 0.14);
    const t = this.lettering(text, 2.6, 0.7, 'painted');
    t.position.set(-0.1, 0, 0.14);
    board.add(t);
  }

  house(x: number, baseY: number, z: number, w: number, h: number, d: number, opts: { dome?: boolean; flowers?: boolean } = {}): void {
    this.box(w, h, d, PAL.wall, x, baseY, z);
    const front = z + d / 2 + 0.06;
    this.box(1.2, 2.1, 0.12, PAL.blue, x - w / 4, baseY, front);
    this.box(0.9, 0.9, 0.12, PAL.blue, x + w / 4, baseY + h * 0.55, front);
    this.box(w + 0.3, 0.25, d + 0.3, PAL.wall, x, baseY + h, z);
    if (opts.dome) {
      const r = w * 0.34;
      this.add(new THREE.SphereGeometry(r, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2), PAL.blue, x, baseY + h + 0.25, z, 'hull');
      this.box(0.12, 0.9, 0.12, PAL.ink, x, baseY + h + 0.25 + r, z);
      this.box(0.6, 0.12, 0.12, PAL.ink, x, baseY + h + 0.85 + r, z);
    }
    if (opts.flowers) this.bougainvillea(x + w / 2 - 0.4, baseY + h - 1.2, front);
  }

  bougainvillea(x: number, y: number, z: number): void {
    for (let i = 0; i < 5; i++) {
      const r = 0.35 + this.rand() * 0.25;
      this.add(new THREE.IcosahedronGeometry(r, 0), PAL.magenta, x + (this.rand() - 0.5) * 1.4, y + this.rand() * 0.9, z, 'hull', true);
    }
  }

  pot(x: number, y: number, z: number): void {
    this.add(new THREE.CylinderGeometry(0.32, 0.22, 0.55, 8), PAL.terracotta, x, y + 0.27, z, 'hull', true);
    this.add(new THREE.IcosahedronGeometry(0.42, 0), PAL.green, x, y + 0.8, z, 'hull', true);
  }

  crate(x: number, y: number, z: number): void {
    this.box(0.9, 0.9, 0.9, PAL.ochre, x, y, z);
  }

  bollard(x: number, z: number): void {
    this.add(new THREE.CylinderGeometry(0.25, 0.32, 0.8, 8), PAL.ink, x, 0.4, z, 'none');
  }

  olive(x: number, z: number): void {
    const trunk = this.add(new THREE.CylinderGeometry(0.25, 0.4, 2.4, 6), PAL.wood, x, 1.2, z, 'hull', true);
    trunk.rotation.z = 0.1;
    for (let i = 0; i < 4; i++) {
      this.add(new THREE.IcosahedronGeometry(1 + this.rand() * 0.5, 0), PAL.olive, x + (this.rand() - 0.5) * 2, 2.8 + this.rand() * 0.8, z + (this.rand() - 0.5) * 1.5, 'hull', true);
    }
  }

  cypress(x: number, z: number): void {
    this.add(new THREE.ConeGeometry(0.8, 5.5, 7), PAL.green, x, 2.75, z, 'hull', true);
  }

  cat(x: number, y: number, z: number, rot: number): void {
    const g = new THREE.Group();
    const body = this.mesh(new THREE.BoxGeometry(0.35, 0.3, 0.6), PAL.cat, 'ink', true);
    body.position.y = 0.15;
    const head = this.mesh(new THREE.BoxGeometry(0.3, 0.26, 0.26), PAL.cat, 'ink', true);
    head.position.set(0, 0.42, 0.25);
    g.add(body, head);
    for (const sx of [-0.09, 0.09]) {
      const ear = this.mesh(new THREE.ConeGeometry(0.06, 0.13, 4), PAL.cat, 'none', true);
      ear.position.set(sx, 0.6, 0.25);
      g.add(ear);
    }
    const tail = this.mesh(new THREE.CylinderGeometry(0.03, 0.04, 0.5, 5), PAL.cat, 'none', true);
    tail.position.set(0.12, 0.25, -0.35);
    tail.rotation.x = 0.9;
    g.add(tail);
    g.position.set(x, y, z);
    g.rotation.y = rot;
    this.scene.add(g);
    this.animators.push((t) => (tail.rotation.z = Math.sin(t * 2) * 0.3));
  }

  boat(x: number, z: number, color: number, rot: number): void {
    const g = new THREE.Group();
    const hull = this.mesh(new THREE.BoxGeometry(5, 0.9, 1.8), color);
    hull.position.y = 0.45;
    const rim = this.mesh(new THREE.BoxGeometry(5.1, 0.15, 1.9), PAL.wall);
    rim.position.y = 0.95;
    const mast = this.mesh(new THREE.CylinderGeometry(0.08, 0.08, 4, 6), PAL.ink, 'none');
    mast.position.y = 2.6;
    const sailShape = new THREE.Shape([new THREE.Vector2(0, 0), new THREE.Vector2(0, 3.3), new THREE.Vector2(2.2, 0)]);
    const sail = this.mesh(new THREE.ShapeGeometry(sailShape), PAL.wall);
    sail.material = toon(PAL.wall).clone();
    (sail.material as THREE.Material).side = THREE.DoubleSide;
    (sail.material as THREE.Material).userData.own = true;
    sail.position.set(0.1, 1.1, 0);
    g.add(hull, rim, mast, sail);
    g.position.set(x, -1.75, z);
    g.rotation.y = rot;
    this.scene.add(g);
    const k = this.rand() * 6;
    this.animators.push((t) => {
      g.position.y = -1.75 + Math.sin(t * 1.2 + k) * 0.08;
      g.rotation.z = Math.sin(t * 0.9 + k) * 0.03;
    });
  }

  /** The big ship you arrived on, moored along the quay. */
  ship(x: number, z: number): void {
    const g = new THREE.Group();
    const hull = this.mesh(new THREE.BoxGeometry(12, 2.6, 3.6), PAL.blue);
    hull.position.y = 1.3;
    const band = this.mesh(new THREE.BoxGeometry(12.1, 0.4, 3.7), PAL.wall);
    band.position.y = 2.4;
    const cabin = this.mesh(new THREE.BoxGeometry(4, 2, 2.6), PAL.wall);
    cabin.position.set(2, 3.6, 0);
    const funnel = this.mesh(new THREE.CylinderGeometry(0.5, 0.6, 2, 10), PAL.red, 'hull');
    funnel.position.set(3, 5.5, 0);
    g.add(hull, band, cabin, funnel);
    for (const wx of [0.8, 2, 3.2]) {
      const win = this.mesh(new THREE.BoxGeometry(0.6, 0.6, 0.05), PAL.blue, 'none');
      win.position.set(wx, 3.8, 1.33);
      g.add(win);
    }
    g.position.set(x, -2.2, z);
    this.scene.add(g);
    this.animators.push((t) => (g.position.y = -2.2 + Math.sin(t * 0.7) * 0.05));
  }

  /** Rope with hanging laundry between a and b (world points). */
  laundry(a: THREE.Vector3, b: THREE.Vector3, colors: number[]): void {
    const sagAt = (t: number) => {
      const p = a.clone().lerp(b, t);
      p.y -= Math.sin(t * Math.PI) * 0.6;
      return p;
    };
    const pts: number[] = [];
    const N = 12;
    for (let i = 0; i < N; i++) {
      const p = sagAt(i / N);
      const q = sagAt((i + 1) / N);
      pts.push(p.x, p.y, p.z, q.x, q.y, q.z);
    }
    const rope = new LineSegmentsGeometry();
    rope.setPositions(pts);
    this.scene.add(new LineSegments2(rope, lines.thin));
    colors.forEach((col, i) => {
      const cloth = this.mesh(new THREE.PlaneGeometry(1.1, 1.3).translate(0, -0.65, 0), col);
      cloth.material = toon(col).clone();
      (cloth.material as THREE.Material).side = THREE.DoubleSide;
      (cloth.material as THREE.Material).userData.own = true;
      cloth.position.copy(sagAt((i + 1) / (colors.length + 1)));
      this.scene.add(cloth);
      this.animators.push((t) => (cloth.rotation.x = Math.sin(t * 1.6 + i) * 0.18));
    });
  }

  sea(): void {
    this.add(new THREE.BoxGeometry(400, 1, 240), PAL.sea, 0, -2.2, 120, 'none');
    this.add(new THREE.PlaneGeometry(600, 200).rotateX(-Math.PI / 2), PAL.seaFar, 0, -1.69, 160, 'none');
    const pts: number[] = [];
    for (let i = 0; i < 90; i++) {
      const x = (this.rand() - 0.5) * 120;
      const z = 8 + this.rand() * 60;
      const l = 0.6 + this.rand() * 1.6;
      pts.push(x, -1.65, z, x + l, -1.65, z);
    }
    const geo = new LineSegmentsGeometry();
    geo.setPositions(pts);
    const foam = new LineSegments2(geo, lines.foam);
    this.scene.add(foam);
    this.animators.push((t) => (foam.position.x = Math.sin(t * 0.3) * 1.5));
  }

  /** Harbour quay: top at y = 0 for z in [-9, 7]. */
  quay(): void {
    this.box(90, 2, 16, PAL.stone, 0, -2, -1);
    for (let x = -44; x <= 44; x += 4) this.box(4, 0.25, 0.6, PAL.stoneDark, x, 0, 6.7);
  }

  /** Stone terraces climbing behind the front row. */
  terraces(): void {
    this.box(90, 3, 10, PAL.stone, 0, -1, -13);
    this.box(76, 6, 10, PAL.stone, -4, -1, -23);
    this.box(60, 9, 12, PAL.stone, -6, -1, -34);
  }

  /** Inland ground: top at y = 0 for z in [-11, 9], with a low wall at the front. */
  plaza(): void {
    this.box(90, 2, 20, PAL.stone, 0, -2, -1);
    this.box(90, 0.6, 0.6, PAL.stoneDark, 0, 0, 8.7);
    this.box(90, 3, 10, PAL.stone, 0, -1, -16);
    this.box(76, 6, 10, PAL.stone, -4, -1, -26);
  }

  /** Sun, far mountains, islands and drifting clouds. */
  backdrop(): void {
    const sun = new THREE.Mesh(new THREE.CircleGeometry(14, 32), new THREE.MeshBasicMaterial({ color: 0xfff4dc, fog: false }));
    (sun.material as THREE.Material).userData.own = true;
    sun.position.set(-70, 48, -200);
    this.scene.add(sun);
    const peaks: [number, number, number, number, number][] = [
      [-120, -210, 60, 30, PAL.mountainFar],
      [-50, -230, 70, 38, PAL.mountainFar],
      [40, -220, 65, 28, PAL.mountainFar],
      [130, -200, 55, 34, PAL.mountainFar],
      [-85, -120, 30, 16, PAL.mountain],
      [80, -125, 34, 18, PAL.mountain],
    ];
    for (const [x, z, r, h, c] of peaks) this.add(new THREE.ConeGeometry(r, h, 6), c, x, h / 2 - 2, z, 'none', true);
    for (const [x, y, z, s] of [
      [-50, 40, -120, 1.4],
      [20, 52, -150, 1.8],
      [80, 38, -110, 1.2],
      [-110, 55, -160, 2],
    ] as const) {
      const g = new THREE.Group();
      for (let i = 0; i < 5; i++) {
        const puff = this.mesh(new THREE.SphereGeometry(4 + this.rand() * 3, 10, 6), PAL.cloud, 'hull');
        puff.castShadow = false;
        puff.position.set((i - 2) * 5, this.rand() * 2, this.rand() * 2);
        puff.scale.y = 0.55;
        g.add(puff);
      }
      g.position.set(x, y, z);
      g.scale.setScalar(s);
      this.scene.add(g);
      const speed = 0.6 + this.rand() * 0.6;
      this.animators.push((_t, dt) => {
        g.position.x += dt * speed;
        if (g.position.x > 180) g.position.x = -180;
      });
    }
  }
}
```

- [ ] **Step 5: Create `src/world3d/figure.ts`**

```ts
import * as THREE from 'three';
import { PAL, type Kit } from './style';

export interface Figure {
  root: THREE.Group;
  rig: THREE.Group;
  legs: THREE.Group[];
  arms: THREE.Group[];
  phase: number;
}

/** Hooded low-poly figure (the Chants silhouette) with a procedural walk cycle. */
export function figure(kit: Kit, cloak: number, trim: number, scale = 1): Figure {
  const root = new THREE.Group();
  const rig = new THREE.Group();
  root.add(rig);
  const part = (geo: THREE.BufferGeometry, color: number, outline: 'hull' | 'none' = 'hull') =>
    kit.mesh(geo, color, outline, true, 1.09);

  const profile = [
    [0.01, 0.22],
    [0.52, 0.24],
    [0.46, 0.7],
    [0.36, 1.2],
    [0.3, 1.42],
    [0.01, 1.48],
  ].map(([x, y]) => new THREE.Vector2(x, y));
  rig.add(part(new THREE.LatheGeometry(profile, 7), cloak));
  const hem = part(new THREE.CylinderGeometry(0.53, 0.53, 0.08, 7, 1, true), trim, 'none');
  hem.position.y = 0.27;
  rig.add(hem);

  const legs: THREE.Group[] = [];
  for (const sx of [-0.16, 0.16]) {
    const hip = new THREE.Group();
    hip.position.set(sx, 0.5, 0);
    const leg = part(new THREE.BoxGeometry(0.13, 0.5, 0.16), PAL.ink, 'none');
    leg.position.y = -0.25;
    hip.add(leg);
    rig.add(hip);
    legs.push(hip);
  }
  const arms: THREE.Group[] = [];
  for (const sx of [-0.36, 0.36]) {
    const shoulder = new THREE.Group();
    shoulder.position.set(sx, 1.28, 0);
    const sleeve = part(new THREE.CylinderGeometry(0.09, 0.13, 0.62, 6), cloak);
    sleeve.position.y = -0.3;
    const hand = part(new THREE.IcosahedronGeometry(0.08, 0), PAL.skin, 'none');
    hand.position.y = -0.64;
    shoulder.add(sleeve, hand);
    shoulder.rotation.z = sx > 0 ? -0.12 : 0.12;
    rig.add(shoulder);
    arms.push(shoulder);
  }
  const hood = part(new THREE.SphereGeometry(0.33, 8, 6), cloak);
  hood.position.y = 1.72;
  const tip = part(new THREE.ConeGeometry(0.2, 0.55, 6), cloak);
  tip.position.set(0, 1.95, -0.22);
  tip.rotation.x = -0.9;
  const face = new THREE.Mesh(new THREE.CircleGeometry(0.19, 8), new THREE.MeshBasicMaterial({ color: PAL.ink }));
  face.position.set(0, 1.69, 0.3);
  const eyes = new THREE.Mesh(new THREE.PlaneGeometry(0.16, 0.035), new THREE.MeshBasicMaterial({ color: 0xf2e6c8 }));
  eyes.position.set(0, 1.71, 0.305);
  for (const m of [face, eyes]) (m.material as THREE.Material).userData.own = true;
  const scarf = part(new THREE.TorusGeometry(0.28, 0.07, 5, 8), trim, 'none');
  scarf.position.y = 1.43;
  scarf.rotation.x = Math.PI / 2;
  rig.add(hood, tip, face, eyes, scarf);

  root.scale.setScalar(scale);
  kit.scene.add(root);
  return { root, rig, legs, arms, phase: 0 };
}

export function animateFigure(f: Figure, dt: number, moving: boolean, t: number): void {
  if (moving) f.phase += dt * 9;
  const swing = moving ? Math.sin(f.phase) * 0.7 : 0;
  f.legs[0].rotation.x = swing;
  f.legs[1].rotation.x = -swing;
  f.arms[0].rotation.x = -swing * 0.6;
  f.arms[1].rotation.x = swing * 0.6;
  f.rig.position.y = moving ? Math.abs(Math.sin(f.phase)) * 0.07 : Math.sin(t * 2) * 0.012;
  f.rig.rotation.x = THREE.MathUtils.lerp(f.rig.rotation.x, moving ? 0.1 : 0, 0.15);
}
```

- [ ] **Step 6: Create `src/world3d/types.ts` and `src/world3d/scenes/common.ts`**

`src/world3d/types.ts`:
```ts
import type * as THREE from 'three';
import type { SceneId } from '../content/chapter1';
import type { Kit } from './style';

export interface Shot {
  pos: [number, number, number];
  look: [number, number, number];
  follow: number; // how much the shot slides with the player's x
}

export interface Exit {
  side: 'left' | 'right';
  to?: SceneId;
  toX?: number;
  toZ?: number;
  end?: boolean; // walking out here ends the chapter
}

export interface Blocker {
  flag: string; // passable once this story flag is set
  box: THREE.Box2;
  mesh?: THREE.Object3D; // hidden once passable
}

export interface NpcSpot {
  id: string;
  x: number;
  z: number;
  kind: 'figure' | 'object';
  cloak?: number;
  trim?: number;
  scale?: number;
  facing?: number;
  anchorY: number; // where the speech bubble sits
}

export interface SceneBuild {
  bounds: { minX: number; maxX: number; minZ: number; maxZ: number };
  colliders: THREE.Box2[];
  blockers: Blocker[];
  exits: Exit[];
  npcs: NpcSpot[];
  shot: Shot;
}

export type SceneBuilder = (kit: Kit) => SceneBuild;
```

`src/world3d/scenes/common.ts`:
```ts
import * as THREE from 'three';
import type { SceneId } from '../../content/chapter1';
import type { Kit } from '../style';
import type { Exit, Shot } from '../types';

export class Solids {
  readonly list: THREE.Box2[] = [];
  add(x: number, z: number, w: number, d: number): this {
    this.list.push(new THREE.Box2(new THREE.Vector2(x - w / 2, z - d / 2), new THREE.Vector2(x + w / 2, z + d / 2)));
    return this;
  }
}

export const box2 = (x: number, z: number, w: number, d: number) => new Solids().add(x, z, w, d).list[0];

export const BOUNDS = { minX: -22, maxX: 22, minZ: -4, maxZ: 6 };

/** Wide 3/4 shot shared by the chapter's scenes; drifts with the player. */
export const WIDE: Shot = { pos: [12, 15, 38], look: [-2, 3.5, -10], follow: 0.35 };

export const toLeft = (to: SceneId): Exit => ({ side: 'left', to, toX: 20.5, toZ: 2 });
export const toRight = (to: SceneId): Exit => ({ side: 'right', to, toX: -20.5, toZ: 2 });

export function harbour(kit: Kit): void {
  kit.backdrop();
  kit.sea();
  kit.quay();
  kit.terraces();
}

export function town(kit: Kit): void {
  kit.backdrop();
  kit.plaza();
  // Back row of houses on the first terrace — the town keeps climbing.
  kit.house(-20, 2, -16, 6, 4.5, 5);
  kit.house(-10, 2, -16.5, 7, 5.5, 5, { flowers: true });
  kit.house(1, 2, -16, 6, 4, 5);
  kit.house(12, 2, -16.5, 7, 6, 5, { dome: true });
  kit.house(22, 2, -16, 5, 4.5, 5);
}
```

- [ ] **Step 7: Create `src/world3d/scenes/pier.ts` and `src/world3d/scenes/index.ts`**

`src/world3d/scenes/pier.ts`:
```ts
import { PAL } from '../style';
import type { SceneBuilder } from '../types';
import { BOUNDS, Solids, WIDE, harbour, toRight } from './common';

export const pier: SceneBuilder = (kit) => {
  harbour(kit);
  const solids = new Solids();
  kit.house(-14, 2, -12, 6, 4, 5, { flowers: true });
  kit.house(-6, 2, -12.5, 5, 5.2, 5);
  kit.house(3, 2, -11.5, 7, 3.8, 4);
  kit.house(11, 2, -12, 5, 4.6, 5, { flowers: true });
  kit.house(-10, 5, -22, 6, 5, 6, { dome: true });
  kit.house(1, 5, -22, 6, 6, 5);
  kit.house(10, 5, -21.5, 5, 4, 5);
  kit.pot(-18, 2, -9);
  kit.pot(6, 2, -9);

  kit.ship(-14, 10.5);
  kit.boat(9, 13, PAL.ochre, -0.25);

  kit.stele('ΛΙΜΑΝΙ', 0, 0.5);
  solids.add(0, 0.5, 2.4, 0.6);
  kit.signpost('ΑΘΗΝΑ', 18, 0);
  solids.add(18, 0, 0.6, 0.6);

  kit.crate(-18.5, 0, -1.5);
  kit.crate(-18.5, 0.9, -1.5);
  kit.crate(-17.4, 0, -1.5);
  solids.add(-18, -1.5, 2.2, 1);
  kit.bollard(-8, 6.2);
  kit.bollard(8, 6.2);
  solids.add(-8, 6.2, 0.7, 0.7).add(8, 6.2, 0.7, 0.7);

  return {
    bounds: BOUNDS,
    colliders: solids.list,
    blockers: [],
    exits: [toRight('fish')],
    npcs: [
      { id: 'sailor', kind: 'figure', x: -11, z: 3.5, cloak: PAL.blue, trim: PAL.wall, facing: 0.8, anchorY: 2.7 },
      { id: 'woman_pier', kind: 'figure', x: 8, z: -1.5, cloak: PAL.terracotta, trim: PAL.wall, facing: -0.4, anchorY: 2.7 },
    ],
    shot: WIDE,
  };
};
```

`src/world3d/scenes/index.ts` (other scenes are placeholders until Task 9):
```ts
import type { SceneId } from '../../content/chapter1';
import type { SceneBuilder } from '../types';
import { BOUNDS, WIDE, toLeft, toRight, town } from './common';
import { pier } from './pier';

const ORDER: SceneId[] = ['pier', 'fish', 'bakery', 'square', 'lane', 'gate'];

/** Bare town square used until a scene gets its own builder. */
const placeholder =
  (id: SceneId): SceneBuilder =>
  (kit) => {
    town(kit);
    const i = ORDER.indexOf(id);
    return {
      bounds: BOUNDS,
      colliders: [],
      blockers: [],
      exits: [toLeft(ORDER[i - 1]), ...(i < ORDER.length - 1 ? [toRight(ORDER[i + 1])] : [])],
      npcs: [],
      shot: WIDE,
    };
  };

export const SCENE_BUILDERS: Record<SceneId, SceneBuilder> = {
  pier,
  fish: placeholder('fish'),
  bakery: placeholder('bakery'),
  square: placeholder('square'),
  lane: placeholder('lane'),
  gate: placeholder('gate'),
};
```

- [ ] **Step 8: Create `src/world3d/engine.ts`**

```ts
import * as THREE from 'three';
import { LineSegments2 } from 'three/examples/jsm/lines/LineSegments2.js';
import type { Bus } from '../bus';
import type { SceneId } from '../content/chapter1';
import { animateFigure, figure, type Figure } from './figure';
import { SCENE_BUILDERS } from './scenes';
import { Kit, PAL, setLineResolution } from './style';
import type { SceneBuild, Shot } from './types';

export interface WorldDeps {
  bus: Bus;
  start: { scene: SceneId; x: number; z: number };
  hasFlag(flag: string): boolean;
  onEnterScene(scene: SceneId, x: number, z: number): void;
}

const SPEED = 4.2;
const TALK_RADIUS = 3;
const BODY = 0.45;
const CLOSE: Shot = { pos: [5, 3.2, 9], look: [-1, 1.6, -1], follow: 1 };

function skyTexture(): THREE.Texture {
  const c = document.createElement('canvas');
  c.width = 2;
  c.height = 256;
  const g = c.getContext('2d')!;
  const grad = g.createLinearGradient(0, 0, 0, 256);
  grad.addColorStop(0, '#e7a866');
  grad.addColorStop(0.45, '#f2cf98');
  grad.addColorStop(0.75, '#f8e6c4');
  grad.addColorStop(1, '#f8e6c4');
  g.fillStyle = grad;
  g.fillRect(0, 0, 2, 256);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function seedOf(id: string): number {
  let h = 2166136261;
  for (let i = 0; i < id.length; i++) h = Math.imul(h ^ id.charCodeAt(i), 16777619);
  return h >>> 0;
}

/** Renders one diorama at a time, moves the hooded figure, reports what it is next to. No story logic. */
export class World {
  private readonly renderer: THREE.WebGLRenderer;
  private readonly scene = new THREE.Scene();
  private readonly camera = new THREE.PerspectiveCamera(28, 1, 0.1, 600);
  private readonly clock = new THREE.Clock();
  private readonly keys = new Set<string>();
  private readonly figures = new Map<string, Figure>();
  private readonly lookAt = new THREE.Vector3();
  private readonly unsubs: (() => void)[] = [];
  private readonly resizeObserver: ResizeObserver;
  private sky: THREE.Texture;
  private kit!: Kit;
  private build!: SceneBuild;
  private player!: Figure;
  private frozen = false;
  private closeShot = false;
  private nearId: string | null = null;
  private endSent = false;
  private raf = 0;
  private width = 1;
  private height = 1;

  constructor(private readonly parent: HTMLElement, private readonly deps: WorldDeps) {
    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFShadowMap;
    parent.appendChild(this.renderer.domElement);
    this.sky = skyTexture();
    window.addEventListener('keydown', this.onKeyDown);
    window.addEventListener('keyup', this.onKeyUp);
    window.addEventListener('blur', this.onBlur);
    this.unsubs.push(
      deps.bus.on('world:freeze', ({ frozen }) => {
        this.frozen = frozen;
        this.keys.clear();
      }),
      deps.bus.on('world:flags', () => this.applyBlockers()),
    );
    this.resizeObserver = new ResizeObserver(() => this.resize());
    this.resizeObserver.observe(parent);
    this.resize();
    this.loadScene(deps.start.scene, deps.start.x, deps.start.z);
    this.loop();
  }

  /** Screen position (px, relative to the canvas) of an NPC's bubble anchor, or the player's. */
  screenPos(id: string): { x: number; y: number } | null {
    let v: THREE.Vector3;
    if (id === 'player') {
      v = this.player.root.position.clone().setY(2.7);
    } else {
      const n = this.build.npcs.find((s) => s.id === id);
      if (!n) return null;
      v = new THREE.Vector3(n.x, n.anchorY, n.z);
    }
    v.project(this.camera);
    if (v.z > 1) return null;
    return { x: ((v.x + 1) / 2) * this.width, y: ((1 - v.y) / 2) * this.height };
  }

  dispose(): void {
    cancelAnimationFrame(this.raf);
    window.removeEventListener('keydown', this.onKeyDown);
    window.removeEventListener('keyup', this.onKeyUp);
    window.removeEventListener('blur', this.onBlur);
    this.unsubs.forEach((u) => u());
    this.resizeObserver.disconnect();
    this.clearScene();
    this.sky.dispose();
    this.renderer.dispose();
    this.renderer.domElement.remove();
  }

  private onKeyDown = (e: KeyboardEvent) => {
    if (this.frozen) return;
    this.keys.add(e.code);
    if (e.code === 'KeyE' && !e.repeat && this.nearId) this.deps.bus.emit('npc:talk', { npcId: this.nearId });
    if (e.code === 'KeyC' && !e.repeat) this.closeShot = !this.closeShot;
  };
  private onKeyUp = (e: KeyboardEvent) => {
    this.keys.delete(e.code);
  };
  private onBlur = () => this.keys.clear();

  private loadScene(id: SceneId, x: number, z: number): void {
    this.clearScene();
    this.scene.background = this.sky;
    this.scene.fog = new THREE.Fog(PAL.horizon, 70, 230);
    this.addLights();
    this.kit = new Kit(this.scene, seedOf(id));
    this.build = SCENE_BUILDERS[id](this.kit);
    this.endSent = false;
    this.player = figure(this.kit, PAL.red, PAL.ochre);
    this.player.root.position.set(x, 0, z);
    this.figures.clear();
    for (const n of this.build.npcs) {
      if (n.kind !== 'figure') continue;
      const f = figure(this.kit, n.cloak ?? PAL.blue, n.trim ?? PAL.wall, n.scale ?? 1);
      f.root.position.set(n.x, 0, n.z);
      f.root.rotation.y = n.facing ?? 0;
      this.figures.set(n.id, f);
    }
    this.applyBlockers();
    this.placeCamera(true);
    this.setNear(null);
    this.deps.onEnterScene(id, x, z);
  }

  private addLights(): void {
    this.scene.add(new THREE.HemisphereLight(0xfff0d6, 0x6f86b8, 1.4));
    const sun = new THREE.DirectionalLight(0xffffff, 2.4);
    sun.position.set(-30, 45, 25);
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    Object.assign(sun.shadow.camera, { left: -50, right: 50, top: 45, bottom: -30, near: 1, far: 160 });
    sun.shadow.bias = -0.0008;
    this.scene.add(sun);
  }

  private clearScene(): void {
    this.scene.traverse((o) => {
      if (o instanceof THREE.Mesh || o instanceof LineSegments2) {
        o.geometry.dispose();
        const m = o.material as THREE.Material | THREE.Material[];
        if (!Array.isArray(m) && m.userData.own) {
          (m as THREE.MeshBasicMaterial).map?.dispose();
          m.dispose();
        }
      } else if (o instanceof THREE.DirectionalLight) {
        o.dispose();
      }
    });
    this.scene.clear();
  }

  private applyBlockers(): void {
    for (const b of this.build.blockers) if (b.mesh) b.mesh.visible = !this.deps.hasFlag(b.flag);
  }

  private blocked(x: number, z: number): boolean {
    const p = new THREE.Vector2(x, z);
    const hit = (b: THREE.Box2) => b.clone().expandByScalar(BODY).containsPoint(p);
    if (this.build.colliders.some(hit)) return true;
    if (this.build.blockers.some((b) => !this.deps.hasFlag(b.flag) && hit(b.box))) return true;
    return this.build.npcs.some((n) => n.kind === 'figure' && Math.hypot(n.x - x, n.z - z) < 0.9);
  }

  /** Returns true when the scene changed. */
  private tryExit(side: 'left' | 'right'): boolean {
    const exit = this.build.exits.find((e) => e.side === side);
    if (!exit) return false;
    if (exit.end) {
      if (!this.endSent) {
        this.endSent = true;
        this.deps.bus.emit('chapter:end', {});
      }
      return false;
    }
    this.loadScene(exit.to!, exit.toX!, exit.toZ!);
    return true;
  }

  private setNear(id: string | null): void {
    if (id === this.nearId) return;
    this.nearId = id;
    this.deps.bus.emit('world:near', { npcId: id });
  }

  private update(dt: number, t: number): void {
    const p = this.player.root.position;
    let moving = false;
    if (!this.frozen) {
      const k = this.keys;
      const dx = (k.has('KeyD') || k.has('ArrowRight') ? 1 : 0) - (k.has('KeyA') || k.has('ArrowLeft') ? 1 : 0);
      const dz = (k.has('KeyS') || k.has('ArrowDown') ? 1 : 0) - (k.has('KeyW') || k.has('ArrowUp') ? 1 : 0);
      if (dx || dz) {
        moving = true;
        const len = Math.hypot(dx, dz);
        const b = this.build.bounds;
        const nx = p.x + (dx / len) * SPEED * dt;
        if (nx < b.minX || nx > b.maxX) {
          if (this.tryExit(nx < b.minX ? 'left' : 'right')) return;
        } else if (!this.blocked(nx, p.z)) {
          p.x = nx;
        }
        const nz = THREE.MathUtils.clamp(p.z + (dz / len) * SPEED * dt, b.minZ, b.maxZ);
        if (!this.blocked(p.x, nz)) p.z = nz;
        const r = this.player.root.rotation;
        const target = Math.atan2(dx, dz);
        r.y += Math.atan2(Math.sin(target - r.y), Math.cos(target - r.y)) * 0.25;
      }
    }
    animateFigure(this.player, dt, moving, t);

    let near: string | null = null;
    let best = TALK_RADIUS;
    for (const n of this.build.npcs) {
      const d = Math.hypot(n.x - p.x, n.z - p.z);
      if (d < best) {
        best = d;
        near = n.id;
      }
    }
    this.setNear(near);

    for (const [id, f] of this.figures) {
      animateFigure(f, dt, false, t + id.length);
      if (id === near) {
        const r = f.root.rotation;
        const target = Math.atan2(p.x - f.root.position.x, p.z - f.root.position.z);
        r.y += Math.atan2(Math.sin(target - r.y), Math.cos(target - r.y)) * 0.08;
      }
    }
    this.placeCamera(false);
    this.kit.tick(t, dt);
  }

  private placeCamera(snap: boolean): void {
    const p = this.player.root.position;
    const shot = this.closeShot ? CLOSE : this.build.shot;
    const dz = this.closeShot ? p.z : 0;
    const pos = new THREE.Vector3(shot.pos[0] + p.x * shot.follow, shot.pos[1], shot.pos[2] + dz);
    const look = new THREE.Vector3(shot.look[0] + p.x * shot.follow, shot.look[1], shot.look[2] + dz);
    if (snap) {
      this.camera.position.copy(pos);
      this.lookAt.copy(look);
    } else {
      this.camera.position.lerp(pos, 0.05);
      this.lookAt.lerp(look, 0.08);
    }
    this.camera.lookAt(this.lookAt);
  }

  private resize(): void {
    this.width = Math.max(1, this.parent.clientWidth);
    this.height = Math.max(1, this.parent.clientHeight);
    this.renderer.setSize(this.width, this.height);
    this.camera.aspect = this.width / this.height;
    this.camera.updateProjectionMatrix();
    setLineResolution(this.width, this.height);
  }

  private loop = () => {
    this.raf = requestAnimationFrame(this.loop);
    const dt = Math.min(this.clock.getDelta(), 0.05);
    this.update(dt, this.clock.elapsedTime);
    this.renderer.render(this.scene, this.camera);
  };
}
```

- [ ] **Step 9: Create `src/ui/WorldCanvas.tsx` and `src/ui/Hud.tsx`**

`src/ui/WorldCanvas.tsx`:
```tsx
import { useEffect, useRef, useState } from 'react';
import { bus } from '../bus';
import { enterScene } from '../story/director';
import type { StoryStore } from '../story/store';
import { World } from '../world3d/engine';
import { s } from './strings';

export function WorldCanvas({ store, onWorld }: { store: StoryStore; onWorld: (w: World | null) => void }) {
  const ref = useRef<HTMLDivElement>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let world: World | null = null;
    let cancelled = false;
    // Lettering is painted into canvases when a scene builds — the font must be ready first.
    void document.fonts
      .load('64px "GFS Didot"')
      .catch(() => undefined)
      .then(() => {
        if (cancelled || !ref.current) return;
        const st = store.get();
        try {
          world = new World(ref.current, {
            bus,
            start: { scene: st.scene, x: st.x, z: st.z },
            hasFlag: (flag) => store.get().world.flags.includes(flag),
            onEnterScene: (scene, x, z) => store.update((cur) => enterScene(cur, scene, x, z)),
          });
        } catch {
          setFailed(true);
          return;
        }
        onWorld(world);
        if (import.meta.env.DEV) (window as unknown as { __world?: World }).__world = world;
      });
    return () => {
      cancelled = true;
      onWorld(null);
      world?.dispose();
    };
  }, [store, onWorld]);

  if (failed) {
    return (
      <div className="screen">
        <div className="panel">{s('noWebgl')}</div>
      </div>
    );
  }
  return <div ref={ref} className="canvas" />;
}
```

`src/ui/Hud.tsx`:
```tsx
import { useState, useSyncExternalStore } from 'react';
import { getStoredLanguage } from '@shared/i18n';
import { SCENES } from '../content/chapter1';
import type { Session } from '../session';
import { requestProgress } from '../story/requests';
import type { StoryStore } from '../story/store';
import { dayKey } from '../story/wordSrs';
import { s } from './strings';
import { useBusEvent } from './useBus';

export function Hud({ session, store }: { session: Session; store: StoryStore }) {
  useSyncExternalStore(store.subscribe, store.version);
  const [near, setNear] = useState<string | null>(null);
  const [frozen, setFrozen] = useState(false);
  useBusEvent('world:near', ({ npcId }) => setNear(npcId));
  useBusEvent('world:freeze', ({ frozen: f }) => setFrozen(f));
  const st = store.get();
  const scene = SCENES.find((x) => x.id === st.scene);
  const { done, total } = requestProgress(st.requests, dayKey());
  return (
    <>
      <div className="hud">
        <span className="badge">{scene ? scene[getStoredLanguage()] : st.scene}</span>
        <span className="spacer" />
        {total > 0 && (
          <span className="badge">
            {s('today')}: {done}/{total}
          </span>
        )}
        <span className="badge">
          {s('streak')}: {session.streak}
        </span>
        {session.offline && <span className="badge off">{s('offline')}</span>}
      </div>
      {near && !frozen && <div className="talk-hint">{s('talk')}</div>}
    </>
  );
}
```

- [ ] **Step 10: Rewrite `src/ui/Play.tsx`, update `main.tsx` and styles**

`src/ui/Play.tsx`:
```tsx
import { useCallback, useEffect, useMemo, useState } from 'react';
import { bus } from '../bus';
import type { Session } from '../session';
import { StoryStore } from '../story/store';
import type { World } from '../world3d/engine';
import { ChallengeDialog } from './ChallengeDialog';
import { Hud } from './Hud';
import { PauseMenu } from './PauseMenu';
import { Toasts } from './Toasts';
import { WorldCanvas } from './WorldCanvas';

export function Play({ session }: { session: Session }) {
  const store = useMemo(() => new StoryStore(session.accountId, localStorage), [session.accountId]);
  const [, setWorld] = useState<World | null>(null);
  const onWorld = useCallback((w: World | null) => setWorld(w), []);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    bus.emit('world:freeze', { frozen: paused });
  }, [paused]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape' || session.controller.current()) return;
      setPaused((p) => !p);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [session]);

  return (
    <div className="stage">
      <WorldCanvas store={store} onWorld={onWorld} />
      <Hud session={session} store={store} />
      <Toasts />
      <ChallengeDialog controller={session.controller} />
      {paused && <PauseMenu onResume={() => setPaused(false)} />}
    </div>
  );
}
```

`src/main.tsx` — add the font import as the first import line:
```tsx
import '@fontsource/gfs-didot';
```
and update the comment to `// No StrictMode: its double mount would boot two WebGL worlds.`

`src/styles.css` — append:
```css
body { font-family: 'GFS Didot', Georgia, serif; }
.talk-hint { position: absolute; left: 50%; bottom: 28px; transform: translateX(-50%); background: #fbf6ea; color: #1b1712; border: 2px solid #1b1712; padding: 4px 12px; font-size: 16px; pointer-events: none; }
.hud .badge { background: rgba(251, 246, 234, .85); color: #1b1712; border: 1.5px solid #1b1712; }
```

- [ ] **Step 11: Build and test**

Run: `npm test && npm run build`
Expected: all tests PASS; build exit 0 (a chunk-size warning for three.js is fine).

- [ ] **Step 12: Verify in the browser**

Start or reuse the `game` preview, open `http://localhost:5174/` (log in as guest if asked). Check:
- The pier renders in the Chants style: sky gradient, toon houses with ink outlines, the ship, ΛΙΜΑΝΙ stele, ΑΘΗΝΑ signpost, sailor (blue) and woman (terracotta).
- WASD walks the red figure with a walk cycle; crates/stele/bollards block; C toggles the close shot.
- Near the sailor «E — говорить» appears (no dialogue yet — Task 10).
- Walking off the right edge loads the placeholder fish scene; walking back returns to the pier near its right edge.
- Reload: you start in the last scene entered.
- `read_console_messages` has no errors. Screenshot the pier.

- [ ] **Step 13: Commit**

```bash
git add -A telegram-bot/game
git commit -m "game: three.js world in the Chants style, pier scene; retire Phaser"
```

---

### Task 9: The other five scenes

**Files:**
- Create: `src/world3d/scenes/fish.ts`, `bakery.ts`, `square.ts`, `lane.ts`, `gate.ts`
- Modify: `src/world3d/scenes/index.ts`

**Interfaces:**
- Consumes: `Kit`, `PAL` (Task 8), `Solids`, `box2`, `BOUNDS`, `WIDE`, `harbour`, `town`, `toLeft`, `toRight`, `SceneBuilder`.
- Produces: `fish`, `bakery`, `square`, `lane`, `gate` builders. NPC ids must match `NPCS` in `chapter1.ts`: fish → `fisher`, `woman`; bakery → `baker`, `child`; square → `fountain`, `historian`; lane → `man`, `door`; gate → `seller`, `guard`.

- [ ] **Step 1: Create `src/world3d/scenes/fish.ts`**

```ts
import * as THREE from 'three';
import { PAL } from '../style';
import type { SceneBuilder } from '../types';
import { BOUNDS, Solids, WIDE, harbour, toLeft, toRight } from './common';

export const fish: SceneBuilder = (kit) => {
  harbour(kit);
  const solids = new Solids();
  kit.house(-16, 2, -12, 5, 4.6, 5);
  kit.house(-8, 2, -12.5, 7, 3.8, 4, { flowers: true });
  kit.house(2, 2, -12, 5, 5.4, 5);
  kit.house(10, 2, -11.5, 6, 4, 5, { flowers: true });
  kit.house(-12, 5, -22, 7, 6, 5);
  kit.house(-2, 5, -22.5, 6, 4.5, 5, { dome: true });
  kit.house(9, 5, -22, 6, 5, 5);
  kit.laundry(new THREE.Vector3(-13.5, 6.2, -9.3), new THREE.Vector3(-4.6, 6.4, -9.8), [PAL.wall, PAL.blue, PAL.red, PAL.wall]);

  // Fish stall
  kit.box(5, 0.9, 1.4, PAL.ochre, -4, 0, -1.2);
  solids.add(-4, -1.2, 5, 1.4);
  for (const px of [-6.2, -1.8]) kit.box(0.15, 3, 0.15, PAL.ink, px, 0, -1.8);
  kit.box(5.2, 0.15, 2.6, PAL.red, -4, 3, -1.4);
  kit.signboard('ΨΑΡΙΑ', -4, 3.15, -0.2);
  for (let i = 0; i < 4; i++) {
    const f = kit.add(new THREE.ConeGeometry(0.16, 0.7, 5), PAL.fishScale, -5.4 + i * 0.9, 1.05, -1.1, 'hull', true);
    f.rotation.z = Math.PI / 2;
  }
  kit.crate(-8, 0, -1.4);
  kit.crate(-8, 0.9, -1.4);
  kit.crate(-9.1, 0, -1.4);
  solids.add(-8.5, -1.4, 2.2, 1);
  kit.boat(-12, 11, PAL.red, 0.1);
  kit.boat(8, 14, PAL.blue, -0.3);
  kit.bollard(-14, 6.2);
  kit.bollard(12, 6.2);
  solids.add(-14, 6.2, 0.7, 0.7).add(12, 6.2, 0.7, 0.7);

  return {
    bounds: BOUNDS,
    colliders: solids.list,
    blockers: [],
    exits: [toLeft('pier'), toRight('bakery')],
    npcs: [
      { id: 'fisher', kind: 'figure', x: -4, z: -2.6, cloak: PAL.blue, trim: PAL.ochre, facing: 0, anchorY: 2.7 },
      { id: 'woman', kind: 'figure', x: 2.5, z: 1.2, cloak: PAL.magenta, trim: PAL.wall, facing: -1.3, anchorY: 2.7 },
    ],
    shot: WIDE,
  };
};
```

- [ ] **Step 2: Create `src/world3d/scenes/bakery.ts`**

```ts
import * as THREE from 'three';
import { PAL } from '../style';
import type { SceneBuilder } from '../types';
import { BOUNDS, Solids, WIDE, toLeft, toRight, town } from './common';

export const bakery: SceneBuilder = (kit) => {
  town(kit);
  const solids = new Solids();
  // The bakery: long whitewashed front with an ochre oven dome
  kit.house(-6, 0, -8, 10, 5, 5);
  solids.add(-6, -8, 10, 5);
  kit.signboard('ΨΩΜΙ', -6, 5.3, -5.4, 3.2, 0.9);
  kit.add(new THREE.SphereGeometry(1.7, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2), PAL.ochre, 1.5, 0, -7.5, 'hull');
  kit.box(0.6, 2.6, 0.6, PAL.stoneDark, 2.2, 1.2, -8);
  solids.add(1.5, -7.5, 3.6, 3.6);
  // Counter with loaves
  kit.box(4, 1, 1.2, PAL.wood, -6, 0, -3.6);
  solids.add(-6, -3.6, 4, 1.2);
  for (let i = 0; i < 4; i++) {
    const loaf = kit.add(new THREE.CapsuleGeometry(0.22, 0.5, 3, 6), PAL.ochre, -7.4 + i * 0.95, 1.2, -3.6, 'hull', true);
    loaf.rotation.z = Math.PI / 2;
  }
  kit.house(8, 0, -9, 6, 4.5, 5, { flowers: true });
  kit.house(16, 0, -8.5, 5, 6, 5);
  solids.add(8, -9, 6, 5).add(16, -8.5, 5, 5);
  kit.pot(11.8, 0, -5.8);
  kit.pot(-12, 0, -5.4);
  kit.cat(13.5, 0, -5.6, -0.5);

  return {
    bounds: BOUNDS,
    colliders: solids.list,
    blockers: [],
    exits: [toLeft('fish'), toRight('square')],
    npcs: [
      { id: 'baker', kind: 'figure', x: -6, z: -4.9, cloak: PAL.wall, trim: PAL.ochre, facing: 0, anchorY: 2.7 },
      { id: 'child', kind: 'figure', x: 5, z: 0.5, cloak: PAL.ochre, trim: PAL.blue, scale: 0.65, facing: -0.6, anchorY: 2 },
    ],
    shot: WIDE,
  };
};
```

- [ ] **Step 3: Create `src/world3d/scenes/square.ts`**

```ts
import * as THREE from 'three';
import { PAL } from '../style';
import type { SceneBuilder } from '../types';
import { BOUNDS, Solids, WIDE, toLeft, toRight, town } from './common';

export const square: SceneBuilder = (kit) => {
  town(kit);
  const solids = new Solids();
  // Fountain: basin, water, column, carved ΝΕΡΟ on the front
  kit.add(new THREE.CylinderGeometry(2.2, 2.3, 0.8, 16), PAL.stone, 0, 0.4, -1, 'hull');
  kit.add(new THREE.CylinderGeometry(1.95, 1.95, 0.1, 16), PAL.sea, 0, 0.75, -1, 'none');
  kit.add(new THREE.CylinderGeometry(0.3, 0.38, 2.2, 10), PAL.wall, 0, 1.6, -1, 'hull');
  kit.add(new THREE.CylinderGeometry(0.8, 0.4, 0.3, 12), PAL.stone, 0, 2.8, -1, 'hull');
  kit.plaque('ΝΕΡΟ', 0, 0.5, 1.32, 1.4, 0.45);
  solids.add(0, -1, 4.6, 4.6);
  // Bench for the historian, olive trees, the church
  kit.box(3, 0.5, 0.8, PAL.wood, -10, 0, -3.4);
  solids.add(-10, -3.4, 3, 0.8);
  kit.olive(-16, -6);
  kit.olive(9, -6.5);
  solids.add(-16, -6, 1, 1).add(9, -6.5, 1, 1);
  kit.house(14, 0, -9, 7, 5.5, 6, { dome: true });
  kit.house(-4, 0, -9.5, 6, 4, 5, { flowers: true });
  solids.add(14, -9, 7, 6).add(-4, -9.5, 6, 5);
  kit.pot(-7.5, 0, -6.6);
  kit.pot(10.8, 0, -5.6);

  return {
    bounds: BOUNDS,
    colliders: solids.list,
    blockers: [],
    exits: [toLeft('bakery'), toRight('lane')],
    npcs: [
      { id: 'fountain', kind: 'object', x: 0, z: -1, anchorY: 3.4 },
      { id: 'historian', kind: 'figure', x: -10, z: -2.5, cloak: PAL.wall, trim: PAL.blue, facing: 0.3, anchorY: 2.7 },
    ],
    shot: WIDE,
  };
};
```

- [ ] **Step 4: Create `src/world3d/scenes/lane.ts`**

```ts
import * as THREE from 'three';
import { PAL } from '../style';
import type { SceneBuilder } from '../types';
import { BOUNDS, Solids, WIDE, box2, toLeft, toRight, town } from './common';

export const lane: SceneBuilder = (kit) => {
  town(kit);
  const solids = new Solids();
  kit.house(-16, 0, -8, 6, 6, 5, { flowers: true });
  kit.house(-8, 0, -8.5, 7, 5, 5);
  kit.house(0, 0, -8, 6, 6.5, 5);
  kit.house(8, 0, -8.5, 5, 5, 5, { flowers: true });
  solids.add(-16, -8, 6, 5).add(-8, -8.5, 7, 5).add(0, -8, 6, 5).add(8, -8.5, 5, 5);
  kit.plaque('ΣΠΙΤΙ', -8, 3.8, -5.9, 2, 0.6);
  kit.laundry(new THREE.Vector3(-13, 5.4, -5.3), new THREE.Vector3(-3, 5.6, -5.3), [PAL.red, PAL.wall, PAL.ochre, PAL.blue, PAL.wall]);
  for (let i = 0; i < 4; i++) kit.box(2.4, 0.3 * (i + 1), 0.7, PAL.stone, 4, 0, -5 - i * 0.7);
  kit.cat(4, 1.2, -6.1, 0.4);
  kit.pot(-12.5, 0, -5.2);
  kit.pot(11, 0, -5.6);

  // A wall across the lane with a locked blue door in the middle
  kit.box(1.2, 4.5, 8.1, PAL.wall, 17, 0, -4.95);
  kit.box(1.2, 4.5, 7.1, PAL.wall, 17, 0, 4.45);
  kit.box(1.2, 1.2, 1.8, PAL.wall, 17, 3.3, 0);
  solids.add(17, -4.95, 1.2, 8.1).add(17, 4.45, 1.2, 7.1);
  const door = kit.box(0.3, 3.3, 1.8, PAL.blue, 17, 0, 0);

  return {
    bounds: BOUNDS,
    colliders: solids.list,
    blockers: [{ flag: 'door_open', box: box2(17, 0, 1.2, 1.8), mesh: door }],
    exits: [toLeft('square'), toRight('gate')],
    npcs: [
      { id: 'man', kind: 'figure', x: -6, z: 0.5, cloak: PAL.ochre, trim: PAL.wall, facing: 0.4, anchorY: 2.7 },
      { id: 'door', kind: 'object', x: 17, z: 0, anchorY: 4 },
    ],
    shot: WIDE,
  };
};
```

- [ ] **Step 5: Create `src/world3d/scenes/gate.ts`**

```ts
import { PAL } from '../style';
import type { SceneBuilder } from '../types';
import { BOUNDS, Solids, WIDE, box2, toLeft, town } from './common';

export const gate: SceneBuilder = (kit) => {
  town(kit);
  const solids = new Solids();
  // City wall with two towers and a gateway at z ∈ [-1.4, 1.4]
  kit.box(2, 6, 7, PAL.stone, 13, 0, -6.4);
  kit.box(2, 6, 3.6, PAL.stone, 13, 0, 6.2);
  kit.box(3, 8, 2.2, PAL.stone, 13, 0, -2.5);
  kit.box(3, 8, 2.2, PAL.stone, 13, 0, 2.5);
  kit.box(3, 1.4, 2.8, PAL.stone, 13, 5.6, 0);
  kit.plaque('ΑΘΗΝΑ', 13, 6.3, 3.66, 2.6, 0.8);
  solids.add(13, -6.4, 2, 7).add(13, 6.2, 2, 3.6).add(13, -2.5, 3, 2.2).add(13, 2.5, 3, 2.2);
  const bar = kit.box(0.4, 0.4, 2.8, PAL.wood, 13, 1.2, 0);
  // The road beyond, with cypresses
  kit.box(10, 0.05, 3, PAL.stoneDark, 18.5, 0, 0);
  kit.cypress(16, -5);
  kit.cypress(19.5, -6);
  kit.cypress(21, 4.5);
  solids.add(16, -5, 1.2, 1.2).add(21, 4.5, 1.2, 1.2);

  // Ticket booth
  kit.box(3.6, 3, 0.3, PAL.wood, -6, 0, -4.8);
  kit.box(0.3, 3, 2, PAL.wood, -7.8, 0, -3.8);
  kit.box(0.3, 3, 2, PAL.wood, -4.2, 0, -3.8);
  kit.box(3.6, 1.1, 0.4, PAL.wood, -6, 0, -2.8);
  kit.box(4, 0.2, 2.6, PAL.blue, -6, 3, -3.7);
  kit.signboard('ΕΙΣΙΤΗΡΙΟ', -6, 3.2, -2.5, 4.2, 0.8);
  solids.add(-6, -3.8, 3.9, 2.4);
  kit.pot(-9, 0, -2.5);

  return {
    bounds: BOUNDS,
    colliders: solids.list,
    blockers: [{ flag: 'gate_open', box: box2(13, 0, 1.2, 2.8), mesh: bar }],
    exits: [toLeft('lane'), { side: 'right', end: true }],
    npcs: [
      { id: 'seller', kind: 'figure', x: -6, z: -3.7, cloak: PAL.green, trim: PAL.wall, facing: 0, anchorY: 2.7 },
      { id: 'guard', kind: 'figure', x: 11, z: 2.4, cloak: PAL.brown, trim: PAL.ochre, facing: -1.2, anchorY: 2.7 },
    ],
    shot: WIDE,
  };
};
```

- [ ] **Step 6: Register them in `src/world3d/scenes/index.ts`**

Replace the whole file:
```ts
import type { SceneId } from '../../content/chapter1';
import type { SceneBuilder } from '../types';
import { bakery } from './bakery';
import { fish } from './fish';
import { gate } from './gate';
import { lane } from './lane';
import { pier } from './pier';
import { square } from './square';

export const SCENE_BUILDERS: Record<SceneId, SceneBuilder> = { pier, fish, bakery, square, lane, gate };
```

- [ ] **Step 7: Add a scene wiring test `src/world3d/scenes/wiring.test.ts`**

```ts
import { describe, expect, it } from 'vitest';
import { NPCS, SCENES } from '../../content/chapter1';

// Builders need WebGL-free three.js only, but the Kit draws text into canvases,
// so the wiring is checked from the source of truth instead: every NPC's scene exists.
describe('scene wiring', () => {
  it('every NPC lives in a known scene', () => {
    const ids = new Set(SCENES.map((s) => s.id));
    for (const n of NPCS) expect(ids.has(n.scene as never), `${n.id} → ${n.scene}`).toBe(true);
  });
});
```

- [ ] **Step 8: Build, test and verify in the browser**

Run: `npm test && npm run build` → PASS / exit 0.
In the preview, walk pier → fish → bakery → square → lane and back. Check each scene renders (screenshot each), NPCs stand where listed and «E — говорить» appears next to each of them and next to the fountain and the door; the lane wall blocks the way except at the door (closed); the gate scene is not reachable yet (door closed). Console clean.

- [ ] **Step 9: Commit**

```bash
git add telegram-bot/game/src/world3d
git commit -m "game: fish market, bakery, square, lane and gate scenes"
```

---

### Task 10: Talking — bubbles, replies, requests, inventory, historian

**Files:**
- Create: `src/ui/speak.ts`, `src/ui/GreekLine.tsx`, `src/ui/DialogueBox.tsx`, `src/ui/Inventory.tsx`, `src/ui/exam.ts`
- Modify: `src/ui/Play.tsx`, `src/styles.css`

**Interfaces:**
- Consumes: `talk`, `reply`, `answer`, `examLeft`, `countExam`, `DialogueView` (Task 7); `StoryStore`; `World.screenPos` (Task 8); `ITEMS`; `lemma`, `lemmaOf`, `tokenize`, `LemmaId`; `bus`, `useBusEvent`, `s`.
- Produces: `speak(text)`, `GreekLine({ text, journal, onWord })`, `DialogueBox({ store, world, onBusy, onExam, onWord })`, `Inventory({ store })`, `askExam(requestId): Promise<boolean>`.

- [ ] **Step 1: Create `src/ui/speak.ts`**

```ts
let cached: SpeechSynthesisVoice | null = null;

function greekVoice(): SpeechSynthesisVoice | null {
  if (cached) return cached;
  try {
    cached = speechSynthesis.getVoices().find((v) => v.lang.toLowerCase().startsWith('el')) ?? null;
  } catch {
    cached = null;
  }
  return cached;
}

/** Say a Greek line with the system's el-GR voice, if one is installed; silent otherwise. */
export function speak(text: string): void {
  try {
    const voice = greekVoice();
    if (!voice) return;
    speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.voice = voice;
    u.lang = voice.lang;
    u.rate = 0.9;
    speechSynthesis.speak(u);
  } catch {
    /* no speech support */
  }
}
```

- [ ] **Step 2: Create `src/ui/GreekLine.tsx`**

```tsx
import { lemma, lemmaOf, tokenize, type LemmaId } from '../content/lexicon';
import type { JournalState } from '../story/journal';

/** A Greek line whose words are clickable; deciphered words show their meaning, others the player's note. */
export function GreekLine({ text, journal, onWord }: { text: string; journal: JournalState; onWord: (id: LemmaId) => void }) {
  return (
    <span className="greek">
      {text.split(/(\s+)/).map((part, i) => {
        const [word] = tokenize(part);
        const id = word ? lemmaOf(word) : null;
        if (!id) return <span key={i}>{part}</span>;
        const gloss = journal.deciphered.includes(id) ? lemma(id).ru : journal.notes[id];
        return (
          <span
            key={i}
            className="word"
            onClick={(e) => {
              e.stopPropagation();
              onWord(id);
            }}
          >
            {part}
            {gloss && <small>{gloss}</small>}
          </span>
        );
      })}
    </span>
  );
}
```

- [ ] **Step 3: Create `src/ui/DialogueBox.tsx`**

```tsx
import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { bus } from '../bus';
import { lemma, type LemmaId } from '../content/lexicon';
import { answer, reply, talk, type DialogueView } from '../story/director';
import type { StoryStore } from '../story/store';
import { dayKey } from '../story/wordSrs';
import type { World } from '../world3d/engine';
import { GreekLine } from './GreekLine';
import { speak } from './speak';
import { s } from './strings';
import { useBusEvent } from './useBus';

interface Conversation {
  view: DialogueView;
  lines: string[];
  step: number;
  answered: boolean;
}

interface Props {
  store: StoryStore;
  world: World | null;
  onBusy: (busy: boolean) => void;
  onExam: () => void;
  onWord: (id: LemmaId) => void;
}

export function DialogueBox({ store, world, onBusy, onExam, onWord }: Props) {
  useSyncExternalStore(store.subscribe, store.version);
  const [conv, setConv] = useState<Conversation | null>(null);
  const bubble = useRef<HTMLDivElement>(null);

  useBusEvent('npc:talk', ({ npcId }) => {
    if (conv) return;
    const out: { view: DialogueView | null } = { view: null };
    store.update((st) => {
      const r = talk(st, npcId, dayKey());
      out.view = r.view;
      return r.state;
    });
    if (!out.view) return;
    onBusy(true);
    setConv({ view: out.view, lines: out.view.lines, step: 0, answered: false });
  });

  const line = conv && conv.step < conv.lines.length ? conv.lines[conv.step] : null;
  const choosing =
    conv !== null && line === null && !conv.answered && (conv.view.kind === 'request' || conv.view.replies.length > 0);
  const shown = line ?? (choosing && conv ? conv.lines[conv.lines.length - 1] : null);

  useEffect(() => {
    if (line) speak(line);
  }, [line]);

  // Keep the bubble over the speaker's head while the camera drifts.
  useEffect(() => {
    if (!conv || !world) return;
    let raf = 0;
    const follow = () => {
      const p = world.screenPos(conv.view.npcId);
      const el = bubble.current;
      if (el && p) {
        el.style.left = `${p.x}px`;
        el.style.top = `${p.y}px`;
      }
      raf = requestAnimationFrame(follow);
    };
    follow();
    return () => cancelAnimationFrame(raf);
  }, [conv, world]);

  function close() {
    const v = conv?.view;
    setConv(null);
    onBusy(false);
    bus.emit('world:flags', {});
    if (v?.kind === 'lines' && v.exam) onExam();
  }

  function advance() {
    if (!conv) return;
    if (line !== null) setConv({ ...conv, step: conv.step + 1 });
    else if (!choosing) close();
  }

  function choose(i: number) {
    if (!conv || !choosing) return;
    const v = conv.view;
    const out = { lines: [] as string[] };
    if (v.kind === 'request') {
      const id = v.options[i];
      if (!id) return;
      store.update((st) => {
        const r = answer(st, v.requestId, id, dayKey());
        out.lines = r.lines;
        return r.state;
      });
    } else {
      if (i >= v.replies.length) return;
      store.update((st) => {
        const r = reply(st, v.npcId, i);
        out.lines = r.lines;
        return r.state;
      });
    }
    setConv({ ...conv, lines: out.lines, step: 0, answered: true });
  }

  useEffect(() => {
    if (!conv) return;
    // Capture phase: the dialogue owns these keys while it is open (pause and world never see them).
    const onKey = (e: KeyboardEvent) => {
      const n = Number(e.key);
      if (choosing && n >= 1 && n <= 3) choose(n - 1);
      else if (!choosing && (e.code === 'KeyE' || e.key === 'Enter' || e.key === ' ')) advance();
      else if (e.key === 'Escape') close();
      else return;
      e.preventDefault();
      e.stopImmediatePropagation();
    };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  });

  if (!conv) return null;
  const journal = store.get().journal;
  const v = conv.view;
  return (
    <>
      {shown !== null && (
        <div ref={bubble} className="bubble" onClick={advance}>
          <GreekLine text={shown} journal={journal} onWord={onWord} />
        </div>
      )}
      {choosing && (
        <div className="choices">
          {v.kind === 'request'
            ? v.options.map((id, i) => (
                <button key={id} className="pic" onClick={() => choose(i)}>
                  <span className="num">{i + 1}</span>
                  {lemma(id).icon}
                </button>
              ))
            : v.replies.map((text, i) => (
                <button key={text} onClick={() => choose(i)}>
                  <span className="num">{i + 1}</span>
                  <GreekLine text={text} journal={journal} onWord={onWord} />
                </button>
              ))}
        </div>
      )}
      <div className="dialog-hint">{choosing ? s('chooseHint') : s('nextHint')}</div>
    </>
  );
}
```

- [ ] **Step 4: Create `src/ui/Inventory.tsx` and `src/ui/exam.ts`**

`src/ui/Inventory.tsx`:
```tsx
import { useSyncExternalStore } from 'react';
import { ITEMS } from '../content/chapter1';
import type { StoryStore } from '../story/store';

export function Inventory({ store }: { store: StoryStore }) {
  useSyncExternalStore(store.subscribe, store.version);
  const items = store.get().world.inventory;
  if (items.length === 0) return null;
  return (
    <div className="inventory">
      {items.map((id) => (
        <span key={id} className="item">
          {ITEMS[id].icon}
        </span>
      ))}
    </div>
  );
}
```

`src/ui/exam.ts`:
```ts
import { bus } from '../bus';

/** Ask one exam question through the existing ChallengeController / ChallengeDialog. */
export function askExam(requestId: string): Promise<boolean> {
  return new Promise((resolve) => {
    const off = bus.on('challenge:result', (r) => {
      if (r.requestId !== requestId) return;
      off();
      resolve(r.correct);
    });
    bus.emit('challenge:request', { requestId, source: 'historian', kind: 'exam' });
  });
}
```

- [ ] **Step 5: Rewrite `src/ui/Play.tsx`**

```tsx
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { bus } from '../bus';
import { ITEMS } from '../content/chapter1';
import type { Session } from '../session';
import { countExam, examLeft } from '../story/director';
import { StoryStore } from '../story/store';
import { dayKey } from '../story/wordSrs';
import type { World } from '../world3d/engine';
import { ChallengeDialog } from './ChallengeDialog';
import { DialogueBox } from './DialogueBox';
import { askExam } from './exam';
import { Hud } from './Hud';
import { Inventory } from './Inventory';
import { PauseMenu } from './PauseMenu';
import { Toasts } from './Toasts';
import { WorldCanvas } from './WorldCanvas';

type BusyKey = 'dialog' | 'paused' | 'exam';

export function Play({ session }: { session: Session }) {
  const store = useMemo(() => new StoryStore(session.accountId, localStorage), [session.accountId]);
  const [world, setWorld] = useState<World | null>(null);
  const onWorld = useCallback((w: World | null) => setWorld(w), []);
  const [busy, setBusyState] = useState<Record<BusyKey, boolean>>({ dialog: false, paused: false, exam: false });
  const setBusy = useCallback((k: BusyKey, v: boolean) => setBusyState((b) => (b[k] === v ? b : { ...b, [k]: v })), []);
  const frozen = Object.values(busy).some(Boolean);

  useEffect(() => {
    bus.emit('world:freeze', { frozen });
  }, [frozen]);

  // Toasts for new words and items, from store diffs.
  const prev = useRef({ seen: store.get().journal.seen.length, items: store.get().world.inventory });
  useEffect(
    () =>
      store.subscribe(() => {
        const st = store.get();
        const fresh = st.journal.seen.length - prev.current.seen;
        if (fresh > 0) bus.emit('toast', { key: 'newWords', value: String(fresh) });
        for (const id of st.world.inventory) {
          if (!prev.current.items.includes(id)) bus.emit('toast', { key: 'itemGot', value: ITEMS[id].icon });
        }
        prev.current = { seen: st.journal.seen.length, items: st.world.inventory };
      }),
    [store],
  );

  const runExam = useCallback(async () => {
    const today = dayKey();
    const left = examLeft(store.get(), today);
    if (left <= 0) {
      bus.emit('toast', { key: 'examDone' });
      return;
    }
    setBusy('exam', true);
    for (let i = 0; i < left; i++) {
      await askExam(`exam-${today}-${Date.now()}-${i}`);
      store.update((st) => countExam(st, today));
    }
    setBusy('exam', false);
  }, [store, setBusy]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape' || session.controller.current() || busy.exam) return;
      setBusy('paused', !busy.paused);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [session, busy, setBusy]);

  return (
    <div className="stage">
      <WorldCanvas store={store} onWorld={onWorld} />
      <Hud session={session} store={store} />
      <Inventory store={store} />
      <DialogueBox
        store={store}
        world={world}
        onBusy={(b) => setBusy('dialog', b)}
        onExam={() => void runExam()}
        onWord={() => undefined}
      />
      <Toasts />
      <ChallengeDialog controller={session.controller} />
      {busy.paused && <PauseMenu onResume={() => setBusy('paused', false)} />}
    </div>
  );
}
```
(`onWord` opens the journal from Task 11.)

- [ ] **Step 6: Append the dialogue styles to `src/styles.css`**

```css
.bubble { position: absolute; transform: translate(-50%, -100%); background: #fbf6ea; color: #1b1712; border: 2.5px solid #1b1712; padding: 8px 16px; font-size: 26px; letter-spacing: .06em; white-space: nowrap; cursor: pointer; z-index: 5; }
.bubble::after { content: ''; position: absolute; left: 50%; bottom: -10px; margin-left: -8px; border: 8px solid transparent; border-top-color: #1b1712; border-bottom: 0; }
.greek .word { display: inline-flex; flex-direction: column; align-items: center; cursor: pointer; border-bottom: 1px dotted transparent; }
.greek .word:hover { border-bottom-color: #1b1712; }
.greek .word small { font-size: 11px; letter-spacing: 0; color: #6b5a42; font-family: system-ui, sans-serif; }
.choices { position: absolute; left: 50%; bottom: 70px; transform: translateX(-50%); display: flex; gap: 12px; z-index: 6; }
.choices button { background: #fbf6ea; color: #1b1712; border: 2.5px solid #1b1712; border-radius: 0; font-size: 22px; padding: 10px 16px; display: flex; align-items: center; gap: 10px; }
.choices button.pic { font-size: 40px; }
.choices .num { font-size: 13px; font-family: system-ui, sans-serif; opacity: .6; }
.dialog-hint { position: absolute; left: 50%; bottom: 24px; transform: translateX(-50%); color: #1b1712; opacity: .7; font-size: 14px; pointer-events: none; }
.inventory { position: absolute; left: 12px; bottom: 12px; display: flex; gap: 6px; }
.inventory .item { background: #fbf6ea; border: 2px solid #1b1712; width: 44px; height: 44px; display: grid; place-items: center; font-size: 26px; }
.toast { background: #fbf6ea; color: #1b1712; border: 2px solid #1b1712; }
```

- [ ] **Step 7: Build, test and play the chain in the browser**

Run: `npm test && npm run build` → PASS / exit 0.
In the preview (clear `hs_sennaar_save_*` first), check:
- E at the sailor: bubbles step through «Λιμάνι!» → «Εγώ είμαι ο ναύτης.» → «Εσύ; Πού πηγαίνεις;» with the bubble over his head; toast «Новых слов…»; three reply buttons; pressing 2 → «Όχι… Πού πηγαίνεις;» and nothing given; E again and 1 → «Αθήνα! Ναι.», «Το κλειδί.», 🔑 in the inventory.
- Fountain → 💧; child → takes 💧; baker → 🍞; fisher → 🐟; door with 🔑 opens (door mesh gone, passage free); seller → 🎫; guard → reply 1 → bar gone.
- Historian: after his line, the exam dialog asks up to 5 questions; talking to him again the same day → toast «Историк: на сегодня всё».
- Esc during a dialogue closes it (does not open pause); Esc otherwise toggles pause and freezes the world. Console clean.

- [ ] **Step 8: Commit**

```bash
git add telegram-bot/game/src
git commit -m "game: speech bubbles, replies, review requests, inventory and the historian"
```

---

### Task 11: The journal

**Files:**
- Create: `src/ui/Journal.tsx`
- Modify: `src/ui/Play.tsx`, `src/styles.css`

**Interfaces:**
- Consumes: `PAGES`, `PAGE_BY_ID` (Task 6); `pageStatus` (Task 2); `solvePage`, `writeNote` (Task 7); `lemma`, `displayForm`, `LemmaId`; `StoryStore`; `bus`; `s`.
- Produces: `Journal({ store, focus, onClose })`.

- [ ] **Step 1: Create `src/ui/Journal.tsx`**

```tsx
import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { bus } from '../bus';
import { PAGES, PAGE_BY_ID } from '../content/chapter1';
import { displayForm, lemma, type LemmaId } from '../content/lexicon';
import { solvePage, writeNote } from '../story/director';
import { pageStatus, type Page } from '../story/journal';
import type { StoryStore } from '../story/store';
import { dayKey } from '../story/wordSrs';
import { s } from './strings';

function slotsOf(page: Page): { icon: string; solution: string }[] {
  if (page.kind === 'words') return page.slots.map((sl) => ({ icon: sl.icon, solution: lemma(sl.lemma).el }));
  return page.slots.map((sl) => ({ icon: sl.icon, solution: sl.form }));
}

export function Journal({ store, focus, onClose }: { store: StoryStore; focus: LemmaId | null; onClose: () => void }) {
  useSyncExternalStore(store.subscribe, store.version);
  const j = store.get().journal;
  const [pageId, setPageId] = useState(() => PAGES.find((p) => pageStatus(j, p) === 'open')?.id ?? PAGES[0].id);
  const [answers, setAnswers] = useState<Record<string, string[]>>({});
  const focusRef = useRef<HTMLLIElement>(null);

  useEffect(() => {
    focusRef.current?.scrollIntoView({ block: 'center' });
  }, [focus]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape' && e.key !== 'Tab') return;
      e.preventDefault();
      e.stopImmediatePropagation();
      onClose();
    };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, [onClose]);

  const page = PAGE_BY_ID.get(pageId)!;
  const status = pageStatus(j, page);
  const slots = slotsOf(page);
  const current = answers[pageId] ?? slots.map(() => '');
  const options =
    page.kind === 'words'
      ? j.seen.map((id) => ({ value: id as string, label: lemma(id).el }))
      : j.seenForms.map((f) => ({ value: f, label: displayForm(f) }));

  function check() {
    const out = { ok: false };
    store.update((st) => {
      const r = solvePage(st, pageId, current, dayKey());
      out.ok = r.ok;
      return r.state;
    });
    bus.emit('toast', { key: out.ok ? 'pageSolved' : 'pageWrong' });
  }

  return (
    <div className="overlay">
      <div className="journal">
        <section className="entries">
          <h2>{s('journal')}</h2>
          <ul>
            {j.seen.map((id) => {
              const l = lemma(id);
              const known = j.deciphered.includes(id);
              return (
                <li key={id} ref={id === focus ? focusRef : undefined} className={id === focus ? 'focus' : undefined}>
                  <b className="el">{l.el}</b>
                  {known ? (
                    <span className="ru">{l.ru}</span>
                  ) : (
                    <input
                      placeholder={s('yourGuess')}
                      defaultValue={j.notes[id] ?? ''}
                      onBlur={(e) => store.update((st) => writeNote(st, id, e.target.value))}
                    />
                  )}
                </li>
              );
            })}
          </ul>
        </section>
        <section className="pages">
          <nav>
            {PAGES.map((p, i) => {
              const ps = pageStatus(j, p);
              return (
                <button
                  key={p.id}
                  className={`tab ${ps}${p.id === pageId ? ' active' : ''}`}
                  disabled={ps === 'locked'}
                  onClick={() => setPageId(p.id)}
                >
                  {ps === 'solved' ? '✓' : ps === 'locked' ? '·' : i + 1}
                </button>
              );
            })}
          </nav>
          {status === 'locked' ? (
            <p className="muted">{s('pageLocked')}</p>
          ) : (
            <div className={`page ${status}`}>
              {slots.map((slot, i) => (
                <div key={i} className="slot">
                  <div className="pic">{slot.icon}</div>
                  {status === 'solved' ? (
                    <div className="el">{slot.solution}</div>
                  ) : (
                    <select
                      value={current[i]}
                      onChange={(e) => {
                        const next = [...current];
                        next[i] = e.target.value;
                        setAnswers({ ...answers, [pageId]: next });
                      }}
                    >
                      <option value="">—</option>
                      {options.map((o) => (
                        <option key={o.value} value={o.value}>
                          {o.label}
                        </option>
                      ))}
                    </select>
                  )}
                </div>
              ))}
              {status === 'open' && (
                <button className="check" onClick={check} disabled={current.some((a) => !a)}>
                  {s('check')}
                </button>
              )}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Wire it into `src/ui/Play.tsx`**

- Add imports: `import type { LemmaId } from '../content/lexicon';` and `import { Journal } from './Journal';`.
- Change `type BusyKey = 'dialog' | 'paused' | 'exam';` to `type BusyKey = 'dialog' | 'paused' | 'exam' | 'journal';` and the initial busy state to `{ dialog: false, paused: false, exam: false, journal: false }`.
- Add state and helpers after `runExam`:
```tsx
  const [journalFocus, setJournalFocus] = useState<LemmaId | null>(null);
  const openJournal = useCallback((focus: LemmaId | null) => {
    setJournalFocus(focus);
    setBusy('journal', true);
  }, [setBusy]);
  const closeJournal = useCallback(() => setBusy('journal', false), [setBusy]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Tab' || busy.journal || busy.exam || busy.paused || session.controller.current()) return;
      e.preventDefault();
      openJournal(null);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [busy, session, openJournal]);
```
- In the Escape handler's guard add `|| busy.journal`.
- Replace `onWord={() => undefined}` with `onWord={(id) => openJournal(id)}`.
- Render, after `<ChallengeDialog … />`: `{busy.journal && <Journal store={store} focus={journalFocus} onClose={closeJournal} />}`.

- [ ] **Step 3: Append journal styles to `src/styles.css`**

```css
.journal { width: min(1000px, calc(100% - 32px)); height: min(640px, calc(100% - 32px)); background: #f4ead2; color: #1b1712; border: 3px solid #1b1712; display: grid; grid-template-columns: 300px 1fr; }
.journal h2 { margin: 0 0 12px; letter-spacing: .08em; }
.journal .entries { border-right: 2px solid #1b1712; padding: 18px; overflow-y: auto; }
.journal .entries ul { list-style: none; margin: 0; padding: 0; display: grid; gap: 8px; }
.journal .entries li { display: grid; gap: 4px; padding: 6px; }
.journal .entries li.focus { outline: 2px solid #2557a8; }
.journal .el { font-size: 22px; letter-spacing: .05em; }
.journal .ru { color: #6b5a42; font-family: system-ui, sans-serif; }
.journal input, .journal select { background: #fbf6ea; color: #1b1712; border: 1.5px solid #1b1712; border-radius: 0; font: 15px system-ui, sans-serif; padding: 6px; }
.journal .pages { padding: 18px; display: flex; flex-direction: column; gap: 16px; overflow-y: auto; }
.journal nav { display: flex; gap: 6px; flex-wrap: wrap; }
.journal .tab { background: #fbf6ea; color: #1b1712; border: 2px solid #1b1712; border-radius: 0; width: 38px; padding: 6px 0; }
.journal .tab.active { background: #1b1712; color: #fbf6ea; }
.journal .tab.solved { background: #d9c79f; }
.journal .page { display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 16px; align-items: start; }
.journal .slot { border: 2px solid #1b1712; background: #fbf6ea; padding: 12px; display: grid; gap: 10px; justify-items: center; }
.journal .slot .pic { font-size: 56px; line-height: 1; }
.journal .page.solved .slot { background: #efe2bf; }
.journal .check { grid-column: 1 / -1; justify-self: center; background: #1b1712; color: #fbf6ea; border-radius: 0; padding: 10px 28px; }
```

- [ ] **Step 4: Build, test and verify in the browser**

Run: `npm test && npm run build` → PASS / exit 0.
In the preview: Tab opens the journal (world frozen), Tab/Esc close it. Seen words are listed; typing a guess and blurring keeps it (reopen to check) and the guess appears under the word in the next speech bubble. Clicking a word in a bubble opens the journal focused on it. After talking to the fisher, the child and the man, the «food» page is open; a wrong arrangement → «Не сходится…», the right one → «Страница расшифрована!», the slots show the Greek words and the bubbles now show Russian under ψάρι, ψωμί, νερό, τρώω. The next day (or after editing the save's `srs` due dates to today), NPCs ask review requests with picture choices. Console clean.

- [ ] **Step 5: Commit**

```bash
git add telegram-bot/game/src
git commit -m "game: journal with notes and Chants-style page deciphering"
```

---

### Task 12: Chapter end

**Files:**
- Create: `src/ui/ChapterEnd.tsx`
- Modify: `src/ui/Play.tsx`, `src/styles.css`

**Interfaces:**
- Consumes: `chapterProgress` (Task 7), `CHAPTER_UNLOCK` (Task 6), bus `'chapter:end'`.
- Produces: `ChapterEnd({ store, onClose })`.

- [ ] **Step 1: Create `src/ui/ChapterEnd.tsx`**

```tsx
import { useEffect } from 'react';
import { CHAPTER_UNLOCK } from '../content/chapter1';
import { chapterProgress } from '../story/director';
import type { StoryStore } from '../story/store';
import { s } from './strings';

export function ChapterEnd({ store, onClose }: { store: StoryStore; onClose: () => void }) {
  const pct = Math.round(chapterProgress(store.get()) * 100);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Enter' && e.key !== 'Escape') return;
      e.preventDefault();
      e.stopImmediatePropagation();
      onClose();
    };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, [onClose]);
  return (
    <div className="overlay">
      <div className="chapter-end">
        <h2>{s('chapterDone')}</h2>
        <div className="meter">
          <div style={{ width: `${pct}%` }} />
          <span style={{ left: `${CHAPTER_UNLOCK * 100}%` }} />
        </div>
        <p>{s('chapterNext', String(pct))}</p>
        <button onClick={onClose}>{s('continueHint')}</button>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Wire it into `src/ui/Play.tsx`**

- Add `import { ChapterEnd } from './ChapterEnd';` and `import { useBusEvent } from './useBus';`.
- Extend `BusyKey` with `'end'` and the initial busy state with `end: false`.
- Add:
```tsx
  useBusEvent('chapter:end', () => {
    store.update((st) => (st.chapterDone ? st : { ...st, chapterDone: true }));
    setBusy('end', true);
  });
  const closeEnd = useCallback(() => setBusy('end', false), [setBusy]);
```
- Guard Escape and Tab handlers with `|| busy.end`.
- Render `{busy.end && <ChapterEnd store={store} onClose={closeEnd} />}` after the journal.

- [ ] **Step 3: Append styles to `src/styles.css`**

```css
.chapter-end { background: #f4ead2; color: #1b1712; border: 3px solid #1b1712; padding: 32px; width: min(560px, calc(100% - 32px)); display: grid; gap: 18px; text-align: center; }
.chapter-end h2 { margin: 0; letter-spacing: .08em; }
.chapter-end .meter { position: relative; height: 14px; border: 2px solid #1b1712; background: #fbf6ea; }
.chapter-end .meter div { height: 100%; background: #2557a8; }
.chapter-end .meter span { position: absolute; top: -6px; bottom: -6px; width: 2px; background: #a63a2a; }
.chapter-end button { justify-self: center; background: #1b1712; color: #fbf6ea; border-radius: 0; padding: 10px 28px; }
```

- [ ] **Step 4: Build, test and play the whole chapter in the browser**

Run: `npm test && npm run build` → PASS / exit 0.
Clear the save, play from the pier to the open gate without console edits, walk through it: the chapter-end card shows the consolidation meter with the 80 % mark. Enter closes it; you can keep exploring. Console clean. Screenshot the card and one scene with bubbles.

- [ ] **Step 5: Commit**

```bash
git add telegram-bot/game/src
git commit -m "game: chapter end card with the consolidation meter"
```

---

### Task 13: Desktop build (Tauri)

**Files:**
- Create: `src-tauri/` (generated), `README.md`
- Modify: `src-tauri/tauri.conf.json`, `package.json`

- [ ] **Step 1: Check the Rust toolchain**

Run: `cargo --version`
Expected: a version line. If missing, STOP and ask the user to install Rust from https://rustup.rs (default options) and reopen the terminal. Do not download or run installers on the user's behalf.

- [ ] **Step 2: Add the Tauri CLI and initialise**

```bash
npm install -D @tauri-apps/cli@^2
npx tauri init --ci --app-name "Hellas Sennaar" --window-title "Hellas Sennaar" --frontend-dist ../dist --dev-url http://localhost:5174 --before-dev-command "npm run dev" --before-build-command "npm run build"
```
Expected: `src-tauri/` with `tauri.conf.json`, `Cargo.toml`, `src/main.rs`, `icons/`, and `.gitignore` containing `/target`.

- [ ] **Step 3: Edit `src-tauri/tauri.conf.json`**

Set (keep other generated fields):
```json
{
  "productName": "Hellas Sennaar",
  "identifier": "com.hellas.sennaar",
  "app": {
    "windows": [
      { "title": "Hellas Sennaar", "width": 1280, "height": 720, "minWidth": 960, "minHeight": 540, "resizable": true, "center": true }
    ]
  }
}
```

- [ ] **Step 4: Build and smoke-test**

Run: `npm run tauri build` → exit 0; an `.exe` under `src-tauri/target/release/` and an installer under `src-tauri/target/release/bundle/`.
Launch it: login/guest → pier renders; walk, talk, journal; F11 fullscreen; close and reopen keeps the story save.

- [ ] **Step 5: Write `README.md`**

```markdown
# Hellas Sennaar

A Chants-of-Sennaar-style game for learning Greek: decipher the people of Piraeus from context,
confirm your guesses in the journal, and review deciphered words every day as requests from the townsfolk.
The old historian in the square asks the citizenship-exam questions (same server SRS as the web app).

- Dev: `npm run dev` → http://localhost:5174 (uses `../webapp/.env`)
- Tests: `npm test`
- Exe: `npm run tauri build` (needs Rust from rustup.rs)

Controls: WASD move · E talk · Tab journal · C camera · Esc pause · F11 fullscreen.
Design: `docs/superpowers/specs/2026-10-05-hellas-sennaar-design.md`.
```

- [ ] **Step 6: Commit**

```bash
git add telegram-bot/game/package.json telegram-bot/game/package-lock.json telegram-bot/game/src-tauri telegram-bot/game/README.md
git commit -m "game: Tauri desktop build"
```
