import { test, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { aiParse, aiCheck } from './homeworkAi';

/* A fake Gemini that answers like the real REST API does: the Interactions
 * endpoint puts text in steps[].content[] (there is no top-level output_text —
 * that is an SDK convenience), generateContent puts it in candidates[]. */
const realFetch = globalThis.fetch;
afterEach(() => {
  globalThis.fetch = realFetch;
});

function fakeGemini(payload: unknown): string[] {
  const calls: string[] = [];
  const text = JSON.stringify(payload);
  globalThis.fetch = (async (url: string | URL) => {
    const u = String(url);
    calls.push(u);
    const body = u.endsWith('/interactions')
      ? { steps: [{ type: 'model_output', content: [{ type: 'text', text }] }] }
      : { candidates: [{ content: { parts: [{ text }] } }] };
    return new Response(JSON.stringify(body), { status: 200, headers: { 'Content-Type': 'application/json' } });
  }) as typeof fetch;
  return calls;
}

process.env.GEMINI_API_KEY = 'test-key';

test('aiParse returns the cards Gemini sent', async () => {
  fakeGemini({ items: [{ question: 'Πού μένεις;', answer: 'Μένω στην Αθήνα.', note: '' }] });
  const items = await aiParse('Πού μένεις;');
  assert.deepEqual(items, [{ id: 'q1', question: 'Πού μένεις;', answer: 'Μένω στην Αθήνα.', note: '' }]);
});

test('aiCheck returns the verdict Gemini sent', async () => {
  fakeGemini({ verdict: 'almost', corrected: 'Μένω στην Αθήνα.', comment_ru: 'Почти.', mistakes: [] });
  const r = await aiCheck({ question: 'Πού μένεις;', modelAnswer: '', note: '', answer: 'Μένω Αθήνα' });
  assert.equal(r.verdict, 'almost');
  assert.equal(r.corrected, 'Μένω στην Αθήνα.');
});
