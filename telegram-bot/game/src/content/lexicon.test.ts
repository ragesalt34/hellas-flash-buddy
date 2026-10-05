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
