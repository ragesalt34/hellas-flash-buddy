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
