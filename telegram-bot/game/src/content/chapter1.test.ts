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
