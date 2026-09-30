import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseHomeworkText, checkLocal, normalizeGreek } from './homework';

const NOTES = `Από πιο κόμμα είναι ο πρωθωπουργός;
(ΝΔ) - Νέα Δημοκρατία

(το) Σύριζα, ΠΑΣΟΚ, Κομμουνιστικό κόμμα
Τσίπρας

Ποιος εκλέγει τον πρόεδρο;
Η Βουλή εκλέγει τον πρόεδρο.

Ποιές (Τι) εκλογές έχουμε στην Ελλάδα;
Στην Ελλάδα έχουμε βουλευτικές, αυτοδοιηκιτικές, ευρωεκλογές.

при перечислении можно опускать артикль

Πόσα κόμματα έχουμε στην Βουλή;

Πόσους βουλευτές έχουμε στην Βουλή;
Τριακόσιους

Ποια γιορτή έχουμε τον Αύγουστο;
Έχουμε τον Δεκαπενταύγουστο, είναι η Κοίμηση της Θεοτόκου / της Παναγίας.
`;

test('parses questions, answers and Russian remarks', () => {
  const items = parseHomeworkText(NOTES);
  assert.equal(items.length, 6);
  assert.equal(items[1].question, 'Ποιος εκλέγει τον πρόεδρο;');
  assert.equal(items[1].answer, 'Η Βουλή εκλέγει τον πρόεδρο.');
  assert.match(items[2].note, /артикль/);
  assert.equal(items[3].answer, ''); // no model answer given
  assert.equal(items[4].answer, 'Τριακόσιους');
});

test('later blocks after the answer are remarks, not answer', () => {
  const items = parseHomeworkText(NOTES);
  assert.equal(items[0].answer, '(ΝΔ) - Νέα Δημοκρατία');
  assert.match(items[0].note, /Σύριζα/);
});

test('text with no questions gives no items', () => {
  assert.deepEqual(parseHomeworkText('Дома: готовимся отвечать'), []);
});

test('normalizeGreek drops accents, case, final sigma and punctuation', () => {
  assert.equal(normalizeGreek('Τριακόσιους!'), 'τριακοσιουσ');
  assert.equal(normalizeGreek('Η ΒΟΥΛΉ, εκλέγει'), 'η βουλη εκλεγει');
});

test('checkLocal: accents and punctuation do not matter', () => {
  const r = checkLocal('η βουλη εκλεγει τον προεδρο', 'Η Βουλή εκλέγει τον πρόεδρο.');
  assert.equal(r.verdict, 'correct');
});

test('checkLocal: partial and wrong', () => {
  assert.equal(checkLocal('η βουλη εκλεγει τον', 'Η Βουλή εκλέγει τον πρόεδρο.').verdict, 'almost');
  assert.equal(checkLocal('καλημερα', 'Η Βουλή εκλέγει τον πρόεδρο.').verdict, 'wrong');
  assert.deepEqual(checkLocal('η βουλη', 'Η Βουλή εκλέγει').missing, ['εκλεγει']);
});
