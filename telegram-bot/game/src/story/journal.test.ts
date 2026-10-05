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
