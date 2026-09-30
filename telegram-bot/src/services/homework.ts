/* Homework from a tutor: pure text helpers (no network, no DB).
 *
 * A tutor's notes usually look like: a Greek question ending in ";" or "?",
 * then the model answer, sometimes Russian remarks ("при перечислении можно
 * опускать артикль") mixed in. parseHomeworkText turns that into question cards
 * without any AI, so the feature works before an AI key is configured; the AI
 * parser (homeworkAi.ts) is the better path when available. checkLocal is the
 * matching no-AI answer check: word overlap with the model answer. */

export interface HomeworkItem {
  id: string;
  question: string;
  answer: string;
  note: string;
}

export type Verdict = 'correct' | 'almost' | 'wrong';

const GREEK = /[Ͱ-Ͽἀ-῿]/;
const CYRILLIC = /[Ѐ-ӿ]/;
// ";" is the Greek question mark; U+037E is its dedicated code point.
const QUESTION_END = /[?;;]\s*$/;

export const MAX_TEXT = 8000;
export const MAX_ITEMS = 60;

/** Lowercase, drop accents, fold final sigma, strip punctuation. */
export function normalizeGreek(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/ς/g, 'σ')
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function parseHomeworkText(text: string): HomeworkItem[] {
  const lines = text.replace(/\r/g, '').slice(0, MAX_TEXT).split('\n').map((l) => l.trim());
  const items: HomeworkItem[] = [];
  let cur: { question: string; blocks: string[][] } | null = null;
  let block: string[] = [];
  const flushBlock = () => {
    if (cur && block.length) cur.blocks.push(block);
    block = [];
  };
  const finish = () => {
    flushBlock();
    if (!cur) return;
    const answerLines: string[] = [];
    const noteLines: string[] = [];
    cur.blocks.forEach((b, i) => {
      for (const l of b) {
        // The first block after the question is the answer; Russian text and
        // everything after that block are the tutor's remarks.
        if (i === 0 && GREEK.test(l) && !CYRILLIC.test(l)) answerLines.push(l);
        else noteLines.push(l);
      }
    });
    items.push({
      id: `q${items.length + 1}`,
      question: cur.question,
      answer: answerLines.join(' '),
      note: noteLines.join(' · '),
    });
    cur = null;
  };
  for (const line of lines) {
    if (!line) {
      flushBlock();
      continue;
    }
    if (GREEK.test(line) && QUESTION_END.test(line)) {
      finish();
      cur = { question: line, blocks: [] };
    } else if (cur) {
      block.push(line);
    }
  }
  finish();
  return items.slice(0, MAX_ITEMS);
}

/** No-AI check: how much of the model answer's vocabulary the student used. */
export function checkLocal(
  user: string,
  model: string
): { verdict: Verdict; missing: string[] } {
  const words = (s: string) => normalizeGreek(s).split(' ').filter(Boolean);
  const m = words(model);
  if (!m.length) return { verdict: 'almost', missing: [] };
  const u = new Set(words(user));
  const missing = m.filter((w) => !u.has(w));
  const share = 1 - missing.length / m.length;
  const verdict: Verdict = share >= 0.85 ? 'correct' : share >= 0.5 ? 'almost' : 'wrong';
  return { verdict, missing };
}
