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
