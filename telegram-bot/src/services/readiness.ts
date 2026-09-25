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

/** The language a whole quiz was taken in (majority of its answers), or null. */
export function sessionLang(answers: AnswerRow[] | null): Lang | null {
  const langs = sessionLangs(Array.isArray(answers) ? answers : []).filter((l): l is Lang => l !== null);
  if (langs.length === 0) return null;
  const el = langs.filter((l) => l === 'el').length;
  return el >= langs.length - el ? 'el' : 'ru';
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

  // Blockers are what stands between the learner and the NEXT verdict level.
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
