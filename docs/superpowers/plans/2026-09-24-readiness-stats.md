# Readiness Statistics Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the Stats screen with an interview-readiness report whose verdict is decided by Greek question coverage per topic and learned words.

**Architecture:** A pure `computeReadiness` (no I/O) turns raw rows into a report; `loadReadiness` fetches the rows from Supabase and adds activity + history; `GET /api/readiness` serves it; the web app's `Stats.tsx` renders six sections and can start a Greek quiz for the weakest topic.

**Tech Stack:** Node 24 + tsx 4.21, Express 5, Supabase JS, React 18 + Vite, `node:test`.

**Spec:** `docs/superpowers/specs/2026-09-24-readiness-stats-design.md`

## Global Constraints

- No database schema change; the endpoint only reads.
- Verdict uses Greek only. Russian is displayed as an aid and never changes the verdict.
- Thresholds: ready = Greek known >= 0.85 in every topic AND words >= 0.8; almost = >= 0.6 and >= 0.6; strong/learned level = 4.
- `src/services/readiness.ts` must not import `../supabase` (it throws without env).
- No new npm dependencies. Tests: `cd telegram-bot && npx tsx --test src/services/readiness.test.ts`.
- All UI strings in `webapp/src/i18n.tsx`, RU and EL.
- Home (`/api/me`) is untouched.

---

### Task 1: Pure readiness core

**Files:**
- Create: `telegram-bot/src/services/readiness.ts`
- Test: `telegram-bot/src/services/readiness.test.ts`

**Interfaces:**
- Produces: `computeReadiness(input: ReadinessInput, now?: Date): ReadinessCore`, `answerLang(chosen: string): Lang | null`, `sessionLangs(answers: AnswerRow[]): (Lang | null)[]`, `THRESHOLDS`, and the row/report types below.

- [ ] **Step 1: Write the failing tests** — `telegram-bot/src/services/readiness.test.ts`

```ts
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { computeReadiness, answerLang, sessionLangs, type ReadinessInput } from './readiness';

const NOW = new Date('2026-09-24T12:00:00Z');
const qs = (topic: string, n: number) => Array.from({ length: n }, (_, i) => ({ id: `${topic}-${i}`, topic }));
const ids = (topic: string, n: number) => qs(topic, n).map((q) => q.id);
const words = (learned: number, total = 10) =>
  Array.from({ length: total }, (_, i) => ({ vocab_id: i + 1, level: i < learned ? 4 : 1, next_review_at: null }));
const session = (at: string, chosen: string, qids: string[], correct = true) => ({
  completed_at: at,
  answers: qids.map((question_id) => ({ question_id, chosen, correct })),
});
const input = (over: Partial<ReadinessInput> = {}): ReadinessInput => ({
  questions: [...qs('history', 10), ...qs('laws', 10)],
  sessions: [],
  progress: [],
  vocab: [],
  vocabIds: Array.from({ length: 10 }, (_, i) => i + 1),
  ...over,
});

test('answerLang: greek, russian, neutral', () => {
  assert.equal(answerLang('Αθήνα'), 'el');
  assert.equal(answerLang('Афины'), 'ru');
  assert.equal(answerLang('1821'), null);
});

test('sessionLangs: neutral answers take the session majority', () => {
  const a = (chosen: string) => ({ question_id: 'x', chosen, correct: true });
  assert.deepEqual(sessionLangs([a('Αθήνα'), a('Σπάρτη'), a('1821')]), ['el', 'el', 'el']);
  assert.deepEqual(sessionLangs([a('1821'), a('1453')]), [null, null]);
});

test('empty user: early, zero score, unchecked everything', () => {
  const r = computeReadiness(input(), NOW);
  assert.equal(r.verdict, 'early');
  assert.equal(r.score, 0);
  assert.deepEqual(r.greek, { known: 0, checked: 0, total: 20 });
  assert.equal(r.blockers.length, 2);
});

test('latest answer in a language wins, whatever the array order', () => {
  const r = computeReadiness(
    input({
      sessions: [
        session('2026-09-10T00:00:00Z', 'Αθήνα', ['history-0'], false),
        session('2026-09-01T00:00:00Z', 'Αθήνα', ['history-0'], true),
      ],
    }),
    NOW
  );
  assert.deepEqual(r.greek, { known: 0, checked: 1, total: 20 });
});

test('russian answers never make the verdict', () => {
  const r = computeReadiness(
    input({ sessions: [session('2026-09-01T00:00:00Z', 'Афины', [...ids('history', 10), ...ids('laws', 10)])], vocab: words(10) }),
    NOW
  );
  assert.equal(r.russian.known, 20);
  assert.equal(r.greek.known, 0);
  assert.equal(r.verdict, 'early');
});

test('ready: every topic in greek and 80% of words', () => {
  const r = computeReadiness(
    input({ sessions: [session('2026-09-01T00:00:00Z', 'Αθήνα', [...ids('history', 10), ...ids('laws', 10)])], vocab: words(8) }),
    NOW
  );
  assert.equal(r.verdict, 'ready');
  assert.equal(r.score, 80);
  assert.deepEqual(r.blockers, []);
});

test('one weak topic keeps the verdict at almost and is the blocker', () => {
  const r = computeReadiness(
    input({ sessions: [session('2026-09-01T00:00:00Z', 'Αθήνα', [...ids('history', 10), ...ids('laws', 7)])], vocab: words(10) }),
    NOW
  );
  assert.equal(r.verdict, 'almost');
  assert.deepEqual(r.blockers, [{ kind: 'topic', topic: 'laws', known: 7, total: 10 }]);
});

test('too few words keeps the verdict early', () => {
  const r = computeReadiness(
    input({ sessions: [session('2026-09-01T00:00:00Z', 'Αθήνα', [...ids('history', 10), ...ids('laws', 10)])], vocab: words(5) }),
    NOW
  );
  assert.equal(r.verdict, 'early');
  assert.deepEqual(r.blockers, [{ kind: 'words', known: 5, total: 10 }]);
});

test('memory, due counts, unknown ids ignored', () => {
  const r = computeReadiness(
    input({
      sessions: [session('2026-09-01T00:00:00Z', 'Αθήνα', ['gone-1'])],
      progress: [
        { question_id: 'history-0', level: 5, next_review_at: '2026-09-20T00:00:00Z' },
        { question_id: 'history-1', level: 2, next_review_at: '2026-10-01T00:00:00Z' },
        { question_id: 'gone-2', level: 6, next_review_at: '2026-09-01T00:00:00Z' },
      ],
      vocab: [{ vocab_id: 1, level: 4, next_review_at: '2026-09-23T00:00:00Z' }],
    }),
    NOW
  );
  assert.equal(r.greek.checked, 0);
  assert.deepEqual(r.memory, { strong: 1, total: 20 });
  assert.deepEqual(r.due, { cards: 1, words: 1 });
  assert.deepEqual(r.words, { learned: 1, seen: 1, total: 10 });
});
```

- [ ] **Step 2: Run to confirm failure**

Run: `cd telegram-bot && npx tsx --test src/services/readiness.test.ts`
Expected: FAIL — cannot find module `./readiness`.

- [ ] **Step 3: Implement** — `telegram-bot/src/services/readiness.ts`

```ts
export type Lang = 'el' | 'ru';
export type Verdict = 'early' | 'almost' | 'ready';

export interface QuestionRow { id: string; topic: string }
export interface AnswerRow { question_id: string; chosen: string; correct: boolean }
export interface SessionRow { completed_at: string; answers: AnswerRow[] | null }
export interface ProgressRow { question_id: string; level: number; next_review_at: string | null }
export interface VocabRow { vocab_id: number; level: number; next_review_at: string | null }

export interface ReadinessInput {
  questions: QuestionRow[];
  sessions: SessionRow[];
  progress: ProgressRow[];
  vocab: VocabRow[];
  vocabIds: number[];
}

export interface Coverage { known: number; checked: number; total: number }
export interface TopicReport {
  topic: string;
  total: number;
  greek: { known: number; checked: number };
  russian: { known: number; checked: number };
  memory: number;
}
export interface Blocker { kind: 'topic' | 'words'; topic?: string; known: number; total: number }
export interface ReadinessCore {
  verdict: Verdict;
  score: number;
  blockers: Blocker[];
  greek: Coverage;
  russian: Coverage;
  memory: { strong: number; total: number };
  words: { learned: number; seen: number; total: number };
  topics: TopicReport[];
  due: { cards: number; words: number };
}

export const THRESHOLDS = { ready: 0.85, almost: 0.6, wordsReady: 0.8, wordsAlmost: 0.6, strongLevel: 4 } as const;
const TOPIC_ORDER = ['history', 'culture', 'laws', 'geography'];

const GREEK = /[Ͱ-Ͽἀ-῿]/;
const LETTER = /\p{L}/u;

export function answerLang(chosen: string): Lang | null {
  if (GREEK.test(chosen)) return 'el';
  if (LETTER.test(chosen)) return 'ru';
  return null;
}

/** Per-answer language; a neutral answer ("1821") takes the session's majority. */
export function sessionLangs(answers: AnswerRow[]): (Lang | null)[] {
  const own = answers.map((a) => answerLang(typeof a.chosen === 'string' ? a.chosen : ''));
  const el = own.filter((l) => l === 'el').length;
  const ru = own.filter((l) => l === 'ru').length;
  const majority: Lang | null = el === 0 && ru === 0 ? null : el >= ru ? 'el' : 'ru';
  return own.map((l) => l ?? majority);
}

const ratio = (n: number, d: number) => (d > 0 ? n / d : 0);

export function computeReadiness(input: ReadinessInput, now: Date = new Date()): ReadinessCore {
  const topicOf = new Map(input.questions.map((q) => [q.id, q.topic]));

  const latest: Record<Lang, Map<string, boolean>> = { el: new Map(), ru: new Map() };
  const sessions = [...input.sessions].sort((a, b) => a.completed_at.localeCompare(b.completed_at));
  for (const s of sessions) {
    const answers = Array.isArray(s.answers) ? s.answers : [];
    const langs = sessionLangs(answers);
    answers.forEach((a, i) => {
      const lang = langs[i];
      if (lang && topicOf.has(a.question_id)) latest[lang].set(a.question_id, a.correct === true);
    });
  }
  const cov = (lang: Lang, qids: string[]) => ({
    known: qids.filter((id) => latest[lang].get(id) === true).length,
    checked: qids.filter((id) => latest[lang].has(id)).length,
  });

  const strong = new Set(
    input.progress
      .filter((p) => p.level >= THRESHOLDS.strongLevel && topicOf.has(p.question_id))
      .map((p) => p.question_id)
  );

  const present = new Set(input.questions.map((q) => q.topic));
  const topicNames = [
    ...TOPIC_ORDER.filter((t) => present.has(t)),
    ...[...present].filter((t) => !TOPIC_ORDER.includes(t)),
  ];
  const topics: TopicReport[] = topicNames.map((topic) => {
    const qids = input.questions.filter((q) => q.topic === topic).map((q) => q.id);
    return {
      topic,
      total: qids.length,
      greek: cov('el', qids),
      russian: cov('ru', qids),
      memory: qids.filter((id) => strong.has(id)).length,
    };
  });
  const allIds = input.questions.map((q) => q.id);
  const total = allIds.length;

  const vocabIds = new Set(input.vocabIds);
  const vocabRows = input.vocab.filter((v) => vocabIds.has(v.vocab_id));
  const words = {
    learned: vocabRows.filter((v) => v.level >= THRESHOLDS.strongLevel).length,
    seen: vocabRows.length,
    total: vocabIds.size,
  };

  const topicPct = topics.map((t) => ({ t, pct: ratio(t.greek.known, t.total) }));
  const wordsPct = ratio(words.learned, words.total);
  const minTopic = topicPct.length ? Math.min(...topicPct.map((x) => x.pct)) : 0;
  const verdict: Verdict =
    minTopic >= THRESHOLDS.ready && wordsPct >= THRESHOLDS.wordsReady
      ? 'ready'
      : minTopic >= THRESHOLDS.almost && wordsPct >= THRESHOLDS.wordsAlmost
        ? 'almost'
        : 'early';

  const target =
    verdict === 'early'
      ? { topic: THRESHOLDS.almost, words: THRESHOLDS.wordsAlmost }
      : { topic: THRESHOLDS.ready, words: THRESHOLDS.wordsReady };
  const candidates: { pct: number; blocker: Blocker }[] = [
    ...topicPct
      .filter((x) => x.pct < target.topic)
      .map((x) => ({
        pct: x.pct,
        blocker: { kind: 'topic' as const, topic: x.t.topic, known: x.t.greek.known, total: x.t.total },
      })),
    ...(wordsPct < target.words
      ? [{ pct: wordsPct, blocker: { kind: 'words' as const, known: words.learned, total: words.total } }]
      : []),
  ];
  const blockers =
    verdict === 'ready' ? [] : candidates.sort((a, b) => a.pct - b.pct).slice(0, 2).map((c) => c.blocker);

  const isDue = (at: string | null) => at !== null && Date.parse(at) <= now.getTime();

  return {
    verdict,
    score: Math.round(Math.min(minTopic, wordsPct) * 100),
    blockers,
    greek: { ...cov('el', allIds), total },
    russian: { ...cov('ru', allIds), total },
    memory: { strong: strong.size, total },
    words,
    topics,
    due: {
      cards: input.progress.filter((p) => topicOf.has(p.question_id) && isDue(p.next_review_at)).length,
      words: vocabRows.filter((v) => isDue(v.next_review_at)).length,
    },
  };
}
```

- [ ] **Step 4: Run tests** — `cd telegram-bot && npx tsx --test src/services/readiness.test.ts` → all PASS. Then `npx tsc --noEmit` → no errors.

- [ ] **Step 5: Commit** — `git add telegram-bot/src/services/readiness.ts telegram-bot/src/services/readiness.test.ts && git commit -m "Add pure interview-readiness computation"`

---

### Task 2: Loader, endpoint, client API

**Files:**
- Create: `telegram-bot/src/services/readinessService.ts`
- Modify: `telegram-bot/src/api/server.ts` (import + route right after `GET /stats`)
- Modify: `telegram-bot/webapp/src/api.ts` (`request` lang override, `quiz` lang param, `readiness`, types)

**Interfaces:**
- Consumes: `computeReadiness`, `ReadinessCore`, `SessionRow` from Task 1; `dayKeyIn`, `prevDayKey`, `isValidTimeZone`, `getUserStreak`, `getHistory`, `HistorySession` from `sessionService.ts`.
- Produces: `loadReadiness(accountId: string, tz: string, now?: Date): Promise<Readiness>`; `GET /api/readiness`; client `api.readiness(): Promise<ReadinessResponse>`, `api.quiz(topic, limit?, lang?: Language)`, exported type `ReadinessResponse`.

- [ ] **Step 1: Loader** — `telegram-bot/src/services/readinessService.ts`

```ts
import { supabase } from '../supabase';
import { VOCABULARY } from '../data/vocabulary';
import { computeReadiness, type ReadinessCore, type SessionRow } from './readiness';
import { dayKeyIn, prevDayKey, isValidTimeZone, getUserStreak, getHistory, type HistorySession } from './sessionService';

const ACTIVITY_DAYS = 35;

export interface Readiness extends ReadinessCore {
  activity: { streak: number; days: string[] };
  history: HistorySession[];
}

export async function loadReadiness(accountId: string, tz: string, now = new Date()): Promise<Readiness> {
  const zone = isValidTimeZone(tz) ? tz : 'UTC';
  let since = dayKeyIn(now, zone);
  for (let i = 1; i < ACTIVITY_DAYS; i++) since = prevDayKey(since);

  const [questions, sessions, progress, vocab, days, streak, history] = await Promise.all([
    supabase.from('questions').select('id, topic'),
    supabase
      .from('quiz_sessions')
      .select('completed_at, answers')
      .eq('account_id', accountId)
      .order('completed_at', { ascending: true }),
    supabase.from('question_progress').select('question_id, level, next_review_at').eq('account_id', accountId),
    supabase.from('vocab_progress').select('vocab_id, level, next_review_at').eq('account_id', accountId),
    supabase.from('study_days').select('day').eq('account_id', accountId).gte('day', since),
    getUserStreak(accountId, zone).catch(() => 0),
    getHistory(accountId, 10),
  ]);
  for (const r of [questions, sessions, progress, vocab]) if (r.error) throw r.error;

  const core = computeReadiness(
    {
      questions: questions.data ?? [],
      sessions: (sessions.data ?? []) as SessionRow[],
      progress: progress.data ?? [],
      vocab: vocab.data ?? [],
      vocabIds: VOCABULARY.map((v) => v.id),
    },
    now
  );
  // study_days is optional (older databases lack it): no table, no grid.
  const activeDays = days.error
    ? []
    : [...new Set(((days.data ?? []) as { day: string }[]).map((d) => String(d.day).slice(0, 10)))].sort();

  return { ...core, activity: { streak, days: activeDays }, history };
}
```

- [ ] **Step 2: Route** — in `server.ts` add `import { loadReadiness } from '../services/readinessService';` with the other service imports, and after the `GET /stats` handler:

```ts
  // GET /api/readiness — interview readiness report (verdict decided by Greek only)
  api.get(
    '/readiness',
    wrap(async (req, res) => {
      const a = req.account!;
      const report = await loadReadiness(a.id, getTz(req));
      res.json({ ...report, topicLabels: topicLabels(getLang(req)) });
    })
  );
```

- [ ] **Step 3: Smoke-test the loader against the real DB** (read-only): write a throwaway `telegram-bot/_r.ts` that picks one `account_id` from `quiz_sessions`, calls `loadReadiness(id, 'Europe/Athens')` and prints `verdict, score, greek, russian, words, topics.length, activity.days.length, history.length`; run `npx tsx _r.ts`; delete it.
Expected: `greek.total` 163, 4 topics.

- [ ] **Step 4: Client** — in `webapp/src/api.ts`:
  - import: `import { getStoredLanguage, type Language } from './i18n';`
  - `async function request<T>(path: string, options: RequestInit = {}, lang: Language = getStoredLanguage()): Promise<T>`; URL uses `lang=${lang}`; 401 retry is `return request<T>(path, options, lang);`
  - `quiz: (topic: string, limit = 10, lang?: Language) => request<QuizResponse>(`/quiz?topic=${encodeURIComponent(topic)}&limit=${limit}`, {}, lang),`
  - `readiness: () => request<ReadinessResponse>('/readiness'),`
  - type:

```ts
export interface ReadinessResponse {
  verdict: 'early' | 'almost' | 'ready';
  score: number;
  blockers: { kind: 'topic' | 'words'; topic?: string; known: number; total: number }[];
  greek: { known: number; checked: number; total: number };
  russian: { known: number; checked: number; total: number };
  memory: { strong: number; total: number };
  words: { learned: number; seen: number; total: number };
  topics: {
    topic: string;
    total: number;
    greek: { known: number; checked: number };
    russian: { known: number; checked: number };
    memory: number;
  }[];
  due: { cards: number; words: number };
  activity: { streak: number; days: string[] };
  history: { topic: string; score: number; total: number; completed_at: string }[];
  topicLabels: Record<string, string>;
}
```

- [ ] **Step 5: Verify** — `cd telegram-bot && npx tsc --noEmit && cd webapp && npx tsc --noEmit` → no errors.

- [ ] **Step 6: Commit** — `git add telegram-bot/src/services/readinessService.ts telegram-bot/src/api/server.ts telegram-bot/webapp/src/api.ts && git commit -m "Serve interview readiness from /api/readiness"`

---

### Task 3: Readiness screen

**Files:**
- Modify (rewrite): `telegram-bot/webapp/src/screens/Stats.tsx`
- Modify: `telegram-bot/webapp/src/screens/Quiz.tsx` (props `startTopic`, `lang`)
- Modify: `telegram-bot/webapp/src/App.tsx` (quiz start state, Stats props)
- Modify: `telegram-bot/webapp/src/i18n.tsx` (add `rd.*`, drop keys only the old screen used)
- Modify: `telegram-bot/webapp/src/api.ts` (drop `stats`, `history`, `StatsResponse`, `HistoryResponse` if unused)
- Modify: `telegram-bot/webapp/src/styles.css` (append `.rd-*` block)

**Interfaces:**
- Consumes: `api.readiness`, `ReadinessResponse`, `api.quiz(topic, limit, lang)` from Task 2; `View` from `App.tsx`.
- Produces: `Stats({ onHome, onNavigate, onTrain })`, `Quiz({ onHome, startTopic?, lang? })`.

- [ ] **Step 1: Quiz auto-start** — in `Quiz.tsx` add `import type { Language } from '../i18n';`; signature
`export function Quiz({ onHome, startTopic, lang }: { onHome: () => void; startTopic?: string; lang?: Language })`;
in `start()` call `api.quiz(topicId, 10, lang)`; after the prefetch `useEffect` add:

```tsx
  // Opened from the readiness screen: go straight into that topic's quiz.
  const autoStarted = useRef(false);
  useEffect(() => {
    if (!startTopic || autoStarted.current) return;
    autoStarted.current = true;
    void start(startTopic);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
```

- [ ] **Step 2: App wiring** — in `App.tsx` import `type Language` from `./i18n`; add

```tsx
  const [quizStart, setQuizStart] = useState<{ topic: string; lang: Language } | null>(null);
  const nav = (v: View) => {
    setQuizStart(null);
    setView(v);
  };
  const train = (topic: string) => {
    setQuizStart({ topic, lang: 'el' });
    setNavKey((k) => k + 1);
    setView('quiz');
  };
```
`goTab` starts with `setQuizStart(null);`. Render `<Home key={navKey} onNavigate={nav} />`, `<Quiz key={navKey} onHome={home} startTopic={quizStart?.topic} lang={quizStart?.lang} />`, `<Stats key={navKey} onHome={home} onNavigate={nav} onTrain={train} />`.

- [ ] **Step 3: Strings** — add to `translations` in `i18n.tsx`:

```ts
  'rd.title': { ru: 'Готовность к собеседованию', el: 'Ετοιμότητα για τη συνέντευξη' },
  'rd.verdict.early': { ru: 'Пока рано', el: 'Ακόμα νωρίς' },
  'rd.verdict.almost': { ru: 'Почти готов', el: 'Σχεδόν έτοιμος' },
  'rd.verdict.ready': { ru: 'Готов', el: 'Έτοιμος' },
  'rd.verdictHint.early': { ru: 'Продолжай — ниже видно, что подтянуть', el: 'Συνέχισε — παρακάτω φαίνεται τι να βελτιώσεις' },
  'rd.verdictHint.almost': { ru: 'Осталось закрыть слабые места', el: 'Μένει να καλύψεις τα αδύναμα σημεία' },
  'rd.verdictHint.ready': { ru: 'Ты уверенно отвечаешь по всем темам на греческом', el: 'Απαντάς με σιγουριά σε όλα τα θέματα στα ελληνικά' },
  'rd.blockers': { ru: 'Что мешает', el: 'Τι λείπει' },
  'rd.blocker.words': { ru: 'Слова', el: 'Λέξεις' },
  'rd.greekOnly': { ru: 'Считаются только ответы на греческом', el: 'Μετράνε μόνο οι απαντήσεις στα ελληνικά' },
  'rd.criteria': { ru: 'Критерии', el: 'Κριτήρια' },
  'rd.crit.greek': { ru: 'Вопросы на греческом', el: 'Ερωτήσεις στα ελληνικά' },
  'rd.crit.words': { ru: 'Слова', el: 'Λέξεις' },
  'rd.crit.memory': { ru: 'Закреплено в памяти', el: 'Σταθερά στη μνήμη' },
  'rd.crit.russian': { ru: 'Вопросы на русском', el: 'Ερωτήσεις στα ρωσικά' },
  'rd.decides': { ru: 'решает', el: 'μετράει' },
  'rd.aid': { ru: 'для понимания', el: 'βοήθεια' },
  'rd.unchecked': { ru: 'Не проверено', el: 'Δεν ελέγχθηκαν' },
  'rd.memoryHint': { ru: 'Помнишь неделю и дольше', el: 'Τα θυμάσαι μια εβδομάδα και πάνω' },
  'rd.byTopic': { ru: 'По темам', el: 'Ανά θέμα' },
  'rd.col.greek': { ru: 'Греч.', el: 'Ελλ.' },
  'rd.col.russian': { ru: 'Рус.', el: 'Ρωσ.' },
  'rd.col.memory': { ru: 'Память', el: 'Μνήμη' },
  'rd.train': { ru: 'Тренировать на греческом', el: 'Εξάσκηση στα ελληνικά' },
  'rd.today': { ru: 'Сегодня', el: 'Σήμερα' },
  'rd.dueCards': { ru: 'Карточки к повторению', el: 'Κάρτες για επανάληψη' },
  'rd.dueWords': { ru: 'Слова к повторению', el: 'Λέξεις για επανάληψη' },
  'rd.nothingDue': { ru: 'Всё повторено — можно пройти тест', el: 'Όλα επαναλήφθηκαν — κάνε ένα κουίζ' },
  'rd.regularity': { ru: 'Регулярность', el: 'Συνέπεια' },
  'rd.daysActive': { ru: 'дней занятий за 5 недель', el: 'μέρες μελέτης σε 5 εβδομάδες' },
  'rd.showMore': { ru: 'Показать ещё', el: 'Δείξε περισσότερα' },
```
After the rewrite, grep each old `stats.*` key (`summary`, `accuracy`, `quiz`, `byTopic`, `vocabSection`, `masteredWords`, `empty`) in `webapp/src` and delete the ones with no remaining use.

- [ ] **Step 4: Screen** — replace `webapp/src/screens/Stats.tsx` with the component described in the spec: verdict card (Ring with `score`, verdict icon Sprout/TrendingUp/BadgeCheck, hint, blocker chips, "Greek only" note); four `Criterion` rows (Greek and Words tagged `rd.decides`, Memory and Russian tagged `rd.aid` and dimmed); topic grid with heat cells `h0..h3` (0 / <60 / <85 / >=85) and a full-width "Тренировать на греческом" button under the weakest Greek topic when it is below 85% (calls `onTrain(topic)`); Today with two buttons (`onNavigate('flashcards')`, `onNavigate('vocab')`) and a "nothing due" line when both are 0; Regularity with streak and a 7-column grid of the last 35 local days (`on` when in `activity.days`); history showing 5 items with a "Показать ещё" button revealing all 10; Menu button. Error state: existing `Empty` with `stats.error`.

- [ ] **Step 5: Styles** — append a `/* Readiness (Stats) */` block to `styles.css` for `.rd-verdict`, `.rd-chip`, `.rd-tag`, `.rd-crit.is-aid`, `.rd-trow` (grid `minmax(0,1.6fr) repeat(3,minmax(0,1fr))`), `.rd-cell.h0..h3` (tinted with `color-mix` of `--muted`/`--bad`/`--amber`/`--good`), `.rd-trow.is-weak`, `.rd-train` (`grid-column: 1 / -1`), `.rd-due`, `.rd-grid` (7 columns, square cells, `.on` = `--good`), `.rd-more`; below 520px the verdict card stacks and centres. Tokens only, so both themes work.

- [ ] **Step 6: Drop dead client code** — grep `api\.stats|api\.history|StatsResponse|HistoryResponse` in `webapp/src`; remove what has no remaining use.

- [ ] **Step 7: Verify** — `cd telegram-bot/webapp && npx tsc --noEmit && npm run build` → no errors.

- [ ] **Step 8: Browser check** — local API (`npx tsx src/index.ts`, `webapp/.env.development.local` with `VITE_API_BASE=http://localhost:3001`) + `npx vite --port 5173`. Check Stats as guest and on an account with history at 1440x900 and 375x812: six sections render; numbers match the Task 2 smoke test; no horizontal scroll; "Тренировать на греческом" opens a quiz with Greek questions; due buttons open Flashcards / Vocabulary; RU and EL read correctly; soft and brut themes both legible. Delete `.env.development.local` afterwards.

- [ ] **Step 9: Commit** — `git add telegram-bot/webapp/src && git commit -m "Rework statistics into an interview-readiness report"`
