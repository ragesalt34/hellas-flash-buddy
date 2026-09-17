// Сквозная проверка API и SRS на живой базе.
// Запуск: npx tsx scripts/e2e-check.ts (нужен .env с SUPABASE_* и APP_SECRET).
// ВНИМАНИЕ: пишет в гостевой аккаунт-песочницу — продвигает пару карточек и
// добавляет одну сессию теста. Реальные аккаунты не трогает.

import 'dotenv/config';
import { createApiApp } from '../src/api/server';
import { supabase } from '../src/supabase';
import { getGuestAccountId } from '../src/services/accountService';
import { SRS_INTERVALS_MS, RELEARN_MS } from '../src/srs';

const PORT = 3099;
const B = `http://localhost:${PORT}/api`;
const S = process.env.APP_SECRET!;
const H: Record<string, string> = { 'X-App-Secret': S, 'X-Time-Zone': 'Europe/Athens', 'Content-Type': 'application/json' };
let pass = 0;
let fail = 0;
const ok = (c: boolean, m: string) => { if (c) pass++; else fail++; console.log((c ? '  OK   ' : '  FAIL ') + m); };
const get = async (p: string, h: Record<string, string> = H) => {
  const r = await fetch(B + p, { headers: h });
  return { s: r.status, j: (await r.json().catch(() => null)) as any };
};
const post = async (p: string, b: unknown) => {
  const r = await fetch(B + p, { method: 'POST', headers: H, body: JSON.stringify(b) });
  return { s: r.status, j: (await r.json().catch(() => null)) as any };
};
const near = (iso: string, ms: number) => Math.abs(Date.parse(iso) - Date.now() - ms) < 15000;

const server = createApiApp().listen(PORT, async () => {
  try {
    const gid = await getGuestAccountId();

    console.log('1. Access');
    ok((await get('/me', {})).s === 401, 'no secret -> 401');
    ok((await get('/me', { 'X-Web-Token': 'junk.sig' })).s === 401, 'forged token -> 401');
    ok((await fetch(`http://localhost:${PORT}/healthz`)).status === 200, 'healthz -> 200');

    console.log('2. Reads');
    const me = await get('/me?lang=ru');
    ok(me.s === 200 && typeof me.j.streak === 'number' && me.j.vocab?.total === 150, `me: streak ${me.j?.streak}, words ${me.j?.vocab?.total}`);
    for (const p of ['/stats', '/history', '/flashcards', '/vocab']) ok((await get(p + '?lang=ru')).s === 200, p + ' -> 200');

    console.log('3. Quiz');
    const q = await get('/quiz?topic=mixed&lang=ru');
    const qs = q.j.questions as any[];
    ok(q.s === 200 && qs.length === 10, `mixed -> ${qs.length} questions`);
    ok(qs.every((x) => x.options.length === 4 && x.options.includes(x.correct_answer)), '4 options each, correct among them');
    ok(qs.every((x) => new Set(x.options).size === 4), 'options unique');
    ok(new Set(qs.map((x) => x.topic)).size === 4, `mixed covers ${new Set(qs.map((x) => x.topic)).size}/4 topics`);
    const geo = await get('/quiz?topic=geography&lang=ru');
    ok((geo.j.questions as any[]).every((x) => x.topic === 'geography'), 'geography -> only geography');
    const el = await get('/quiz?topic=history&lang=el');
    ok((el.j.questions as any[]).every((x) => /[Ͱ-Ͽ]/.test(x.question)), 'lang=el -> greek text');
    const badLimit = await get('/quiz?topic=mixed&limit=abc');
    ok((badLimit.j?.questions?.length ?? 0) > 0, `limit=abc -> ${badLimit.j?.questions?.length} questions (want >0)`);
    const badTopic = await get('/quiz?topic=nonsense');
    ok(badTopic.s === 400, `topic=nonsense -> ${badTopic.s} (want 400)`);

    console.log('4. Flashcard SRS');
    const card = (await get('/flashcards?lang=ru')).j.cards[0];
    const readQ = async () => (await supabase.from('question_progress').select('level,next_review_at,seen_count').eq('account_id', gid).eq('question_id', card.question_id).maybeSingle()).data as any;
    const q0 = await readQ();
    const L0 = q0?.level ?? 0;
    ok((await post('/flashcards/grade', { questionId: card.question_id, grade: 2 })).s === 200, 'grade 2 -> 200');
    let r = await readQ();
    ok(r.level === Math.min(L0 + 1, 6) && near(r.next_review_at, SRS_INTERVALS_MS[r.level]), `good: ${L0}->${r.level}, due matches`);
    const L1 = r.level;
    await post('/flashcards/grade', { questionId: card.question_id, grade: 3 });
    r = await readQ();
    ok(r.level === Math.min(L1 + 2, 6) && near(r.next_review_at, SRS_INTERVALS_MS[r.level]), `know: ${L1}->${r.level}, due matches`);
    const L2 = r.level;
    await post('/flashcards/grade', { questionId: card.question_id, grade: 1 });
    r = await readQ();
    ok(r.level === Math.max(L2 - 2, 0) && near(r.next_review_at, RELEARN_MS), `hard: ${L2}->${r.level}, back in 10 min`);
    ok(r.seen_count === (q0?.seen_count ?? 0) + 3, `seen_count ${q0?.seen_count ?? 0}->${r.seen_count} (+3)`);
    const due = ((await get('/flashcards?lang=ru')).j.cards as any[]).map((c) => c.question_id);
    ok(!due.includes(card.question_id), 'graded card left the queue');

    console.log('5. Vocab SRS');
    const w = (await get('/vocab?lang=ru')).j.cards[0];
    const readV = async () => (await supabase.from('vocab_progress').select('level,next_review_at').eq('account_id', gid).eq('vocab_id', w.id).maybeSingle()).data as any;
    const v0 = (await readV())?.level ?? 0;
    const vg = await post('/vocab/grade', { vocabId: w.id, grade: 2 });
    let v = await readV();
    ok(vg.s === 200 && v.level === Math.min(v0 + 1, 6) && near(v.next_review_at, SRS_INTERVALS_MS[v.level]), `word good: ${v0}->${v.level}`);
    ok(typeof vg.j?.stats?.seen === 'number', 'grade response carries fresh stats');
    await post('/vocab/grade', { vocabId: w.id, grade: 1 });
    v = await readV();
    ok(near(v.next_review_at, RELEARN_MS), 'word hard -> 10 min');

    console.log('6. Grade validation');
    for (const g of [0, 4, 2.5, '2', null]) ok((await post('/flashcards/grade', { questionId: card.question_id, grade: g })).s === 400, `grade ${JSON.stringify(g)} -> 400`);
    const badWord = await post('/vocab/grade', { vocabId: 99999, grade: 2 });
    ok(badWord.s === 400, `unknown word -> ${badWord.s} (want 400)`);
    const badQ = await post('/flashcards/grade', { questionId: 'no-such-id', grade: 2 });
    ok(badQ.s === 400 || badQ.s === 404, `unknown question -> ${badQ.s} (want 400/404)`);

    console.log('7. Quiz complete');
    const count = async () => (await supabase.from('quiz_sessions').select('id', { count: 'exact', head: true }).eq('account_id', gid)).count ?? 0;
    const before = await count();
    const a1 = qs[0];
    const a2 = qs[1];
    const wrong = (a2.options as string[]).find((o) => o !== a2.correct_answer);
    const lv = async (id: string) => (((await supabase.from('question_progress').select('level').eq('account_id', gid).eq('question_id', id).maybeSingle()).data as any)?.level ?? 0) as number;
    const pre1 = await lv(a1.id);
    const pre2 = await lv(a2.id);
    const qc = await post('/quiz/complete', {
      topic: 'mixed',
      score: 999,
      answers: [
        { question_id: a1.id, chosen: a1.correct_answer, correct: true, correct_answer: a1.correct_answer },
        { question_id: a2.id, chosen: wrong, correct: false, correct_answer: a2.correct_answer },
      ],
    });
    ok(qc.s === 200, 'quiz/complete -> 200');
    const last = (await supabase.from('quiz_sessions').select('score,total').eq('account_id', gid).order('completed_at', { ascending: false }).limit(1).single()).data as any;
    ok((await count()) === before + 1, 'exactly one session written');
    ok(last.score === 1 && last.total === 2, `score by server: ${last.score}/${last.total} (client sent 999)`);
    const post1 = await lv(a1.id);
    const post2 = await lv(a2.id);
    ok(post1 === Math.min(pre1 + 1, 6), `right answer: ${pre1}->${post1}`);
    ok(post2 === Math.max(pre2 - 2, 0), `wrong answer: ${pre2}->${post2}`);
    const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Athens' }).format(new Date());
    const sd = (await supabase.from('study_days').select('day').eq('account_id', gid).eq('day', today)).data as any[];
    ok(sd.length === 1, `study day ${today} recorded`);
    ok((await get('/me')).j.streak >= 1, 'streak >= 1');
    ok((await post('/quiz/complete', { topic: 'hacking', answers: [] })).s === 400, 'bad topic -> 400');
    ok((await post('/quiz/complete', { topic: 'mixed', answers: [{ x: 1 }] })).s === 400, 'junk answers -> 400');
    const lie = await post('/quiz/complete', { topic: 'mixed', answers: [{ question_id: a2.id, chosen: wrong, correct: true, correct_answer: wrong }] });
    const liedLevel = await lv(a2.id);
    ok(liedLevel <= post2, `client claiming a wrong answer is right: level ${post2}->${liedLevel} (want not raised)`);
    void lie;

    console.log('8. TTS');
    ok((await post('/tts', { text: 'Привет', cacheKey: 'k' })).s === 400, 'non-greek -> 400');
    ok((await post('/tts', { text: 'Καλημέρα κόσμε τυχαίο', cacheKey: 'k' })).s === 400, 'greek not from content -> 400');
  } catch (e) {
    fail++;
    console.log('  FAIL exception', e);
  }
  console.log(`\ntotal: ${pass} passed, ${fail} failed`);
  server.close();
  process.exit(0);
});
