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

test('aiParse sends an attached file to Gemini and asks for questions on topics', async () => {
  let sent: { contents: { parts: Record<string, unknown>[] }[] } | undefined;
  const text = JSON.stringify({ items: [{ question: 'Τι γιορτάζουμε στις 17 Νοεμβρίου;', answer: 'Το Πολυτεχνείο.', note: '' }] });
  globalThis.fetch = (async (_url: string | URL, init?: RequestInit) => {
    sent = JSON.parse(String(init?.body));
    return new Response(JSON.stringify({ candidates: [{ content: { parts: [{ text }] } }] }), { status: 200 });
  }) as typeof fetch;
  const items = await aiParse('Готовимся отвечать про праздники Греции', { mimeType: 'application/pdf', data: 'JVBERi0=' });
  assert.equal(items.length, 1);
  const parts = sent!.contents[0].parts;
  assert.deepEqual(parts[1], { inlineData: { mimeType: 'application/pdf', data: 'JVBERi0=' } });
  assert.match(String(parts[0].text), /topics/i, 'prompt must cover topic-only homework');
});

test('aiParse moves to the next model when one is overloaded (503)', async () => {
  const calls: string[] = [];
  const text = JSON.stringify({ items: [{ question: 'Πού μένεις;', answer: '', note: '' }] });
  globalThis.fetch = (async (url: string | URL) => {
    calls.push(String(url));
    if (calls.length === 1) {
      return new Response('{"error":{"code":503,"status":"UNAVAILABLE"}}', { status: 503 });
    }
    return new Response(JSON.stringify({ candidates: [{ content: { parts: [{ text }] } }] }), { status: 200 });
  }) as typeof fetch;
  const items = await aiParse('Πού μένεις;');
  assert.equal(items.length, 1);
  assert.equal(calls.length, 2);
  assert.notEqual(calls[0], calls[1], 'second try must use a different model');
});

test('aiParse does not retry a request Gemini rejects (400)', async () => {
  let n = 0;
  globalThis.fetch = (async () => {
    n++;
    return new Response('{"error":{"code":400}}', { status: 400 });
  }) as typeof fetch;
  await assert.rejects(aiParse('Πού μένεις;'), /gemini 400/);
  assert.equal(n, 1);
});

test('aiCheck returns the verdict Gemini sent', async () => {
  fakeGemini({ verdict: 'almost', corrected: 'Μένω στην Αθήνα.', comment_ru: 'Почти.', mistakes: [] });
  const r = await aiCheck({ question: 'Πού μένεις;', modelAnswer: '', note: '', answer: 'Μένω Αθήνα' });
  assert.equal(r.verdict, 'almost');
  assert.equal(r.corrected, 'Μένω στην Αθήνα.');
});
