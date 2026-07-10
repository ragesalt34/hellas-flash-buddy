import express, { NextFunction, Request, Response } from 'express';
import cors from 'cors';
import crypto from 'crypto';
import path from 'path';
import fs from 'fs';
import { supabase } from '../supabase';
import {
  fetchQuestionsRandom,
  fetchDueFlashcards,
  fetchRandomFlashcards,
  buildAnswerOptions,
  topicLabels,
  recordQuestionProgress,
  type ContentLang,
} from '../services/questionService';
import {
  recordQuizSession,
  getUserStats,
  getUserStreak,
  getHistory,
} from '../services/sessionService';
import {
  registerAccount,
  loginAccount,
  getGuestAccountId,
  UsernameTakenError,
} from '../services/accountService';
import { getDueVocab, gradeVocab, getVocabStats } from '../services/vocabProgressService';
import { VOCABULARY, VOCAB_BY_ID } from '../data/vocabulary';
import { getOrSynthesizeGreekSpeech } from '../services/ttsService';
import { AnswerRecord } from '../types';

const ALL_VOCAB_IDS = VOCABULARY.map((v) => v.id);

// The authenticated account attached to each /api request.
interface AuthAccount {
  id: string; // uuid
  name: string | null;
  username: string | null;
  isGuest: boolean;
}

interface AuthedRequest extends Request {
  account?: AuthAccount;
}

// Content language for quiz/flashcard/topic-label text — defaults to Greek
// unless the client asks for Russian (?lang=ru).
const getLang = (req: Request): ContentLang => (req.query.lang === 'ru' ? 'ru' : 'el');

const USERNAME_RE = /^[a-zA-Z0-9_]{3,20}$/;
const PASSWORD_MIN = 6;
const PASSWORD_MAX = 128; // scrypt input cap — express.json alone would allow a 1MB "password"

// ---- Tiny in-memory rate limiter for the auth endpoints ----
// Registration/login are the only unauthenticated write paths, so they're the
// brute-force target. Sliding window per client IP; state is per-process which
// is fine for a single Render instance.
const AUTH_WINDOW_MS = 10 * 60 * 1000;
const AUTH_MAX_ATTEMPTS = 30;
const authHits = new Map<string, number[]>();

function authRateLimited(req: Request): boolean {
  // Render terminates TLS in front of us — the client is the first entry of
  // X-Forwarded-For (set by the platform), falling back to the socket address.
  const fwd = req.header('x-forwarded-for');
  const ip = (fwd ? fwd.split(',')[0].trim() : req.socket.remoteAddress) || 'unknown';
  const now = Date.now();
  const hits = (authHits.get(ip) ?? []).filter((t) => now - t < AUTH_WINDOW_MS);
  hits.push(now);
  authHits.set(ip, hits);
  return hits.length > AUTH_MAX_ATTEMPTS;
}

// Drop stale limiter entries so the map can't grow unboundedly.
setInterval(() => {
  const now = Date.now();
  for (const [ip, hits] of authHits) {
    const live = hits.filter((t) => now - t < AUTH_WINDOW_MS);
    if (live.length === 0) authHits.delete(ip);
    else authHits.set(ip, live);
  }
}, AUTH_WINDOW_MS).unref();

// Sessions are stateless HMAC tokens signed with APP_SECRET. The payload carries
// the account's uuid, so no server-side session store is needed.
const authSecret = (): string => process.env.APP_SECRET || '';

function signWebToken(id: string, username: string): string {
  const payload = Buffer.from(
    JSON.stringify({ id, u: username, exp: Date.now() + 90 * 24 * 3600 * 1000 })
  ).toString('base64url');
  const sig = crypto.createHmac('sha256', authSecret()).update(payload).digest('base64url');
  return `${payload}.${sig}`;
}

function verifyWebToken(token: string): { id: string; u: string } | null {
  const [payload, sig] = token.split('.');
  if (!payload || !sig) return null;
  const expected = crypto.createHmac('sha256', authSecret()).update(payload).digest('base64url');
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
  try {
    const p = JSON.parse(Buffer.from(payload, 'base64url').toString()) as {
      id?: unknown;
      u?: unknown;
      exp?: unknown;
    };
    if (typeof p.id !== 'string' || typeof p.u !== 'string' || typeof p.exp !== 'number') return null;
    if (Date.now() > p.exp) return null;
    return { id: p.id, u: p.u };
  } catch {
    return null;
  }
}

/** Wrap an async handler so thrown errors become 500s instead of crashing the process. */
const wrap =
  (fn: (req: AuthedRequest, res: Response) => Promise<void>) =>
  (req: AuthedRequest, res: Response) => {
    fn(req, res).catch((err) => {
      console.error('API error:', err);
      if (!res.headersSent) res.status(500).json({ error: 'internal_error' });
    });
  };

export function createApiApp(): express.Express {
  const app = express();
  // maxAge caches the CORS preflight (OPTIONS) for 24h in the browser, so
  // repeat API calls skip the extra preflight round-trip (faster navigation).
  app.use(cors({ maxAge: 86400 }));
  app.use(express.json({ limit: '1mb' }));

  // Public health check (no auth) — used by cloud host (Render) deploy probes.
  app.get('/healthz', (_req, res) => {
    res.json({ ok: true });
  });

  // --- Auth middleware: signed web token, or the shared guest sandbox ---
  const auth = (req: AuthedRequest, res: Response, next: NextFunction): void => {
    // Web account session (nickname + password login) — stateless HMAC token.
    const wt = req.header('X-Web-Token') ?? '';
    if (wt) {
      const v = verifyWebToken(wt);
      if (v) {
        req.account = { id: v.id, name: v.u, username: v.u, isGuest: false };
        next();
        return;
      }
    }

    // Anonymous guest ("continue without an account"). APP_SECRET is shipped in
    // the public client bundle, so it is NOT a real credential — it only gates
    // the shared demo sandbox. The guest account id is resolved server-side (a
    // single shared row), never taken from the client, so a leaked secret cannot
    // be used to read or write a real account's progress.
    if (process.env.APP_SECRET) {
      const secret = req.header('X-App-Secret') ?? '';
      const secretBuf = Buffer.from(secret);
      const expectedBuf = Buffer.from(process.env.APP_SECRET);
      const validSecret =
        secretBuf.length === expectedBuf.length && crypto.timingSafeEqual(secretBuf, expectedBuf);
      if (validSecret) {
        getGuestAccountId()
          .then((id) => {
            req.account = { id, name: null, username: null, isGuest: true };
            next();
          })
          .catch((err) => {
            console.error('guest account error:', err);
            res.status(500).json({ error: 'internal_error' });
          });
        return;
      }
    }

    res.status(401).json({ error: 'unauthorized' });
  };

  // --- Public auth endpoints (no session required) ---

  // POST /api/auth/register { username, password }
  app.post(
    '/api/auth/register',
    wrap(async (req, res) => {
      if (authRateLimited(req)) {
        res.status(429).json({ error: 'too_many_attempts' });
        return;
      }
      const { username, password } = (req.body ?? {}) as { username?: unknown; password?: unknown };
      if (
        typeof username !== 'string' ||
        !USERNAME_RE.test(username) ||
        typeof password !== 'string' ||
        password.length < PASSWORD_MIN ||
        password.length > PASSWORD_MAX
      ) {
        res.status(400).json({ error: 'invalid_input' });
        return;
      }
      try {
        const account = await registerAccount(username, password);
        res.json({
          token: signWebToken(account.id, account.username),
          user: { id: account.id, name: account.display_name ?? account.username },
        });
      } catch (err) {
        if (err instanceof UsernameTakenError) {
          res.status(409).json({ error: 'username_taken' });
          return;
        }
        throw err;
      }
    })
  );

  // POST /api/auth/login { username, password }
  app.post(
    '/api/auth/login',
    wrap(async (req, res) => {
      if (authRateLimited(req)) {
        res.status(429).json({ error: 'too_many_attempts' });
        return;
      }
      const { username, password } = (req.body ?? {}) as { username?: unknown; password?: unknown };
      if (
        typeof username !== 'string' ||
        !USERNAME_RE.test(username) ||
        typeof password !== 'string' ||
        password.length > PASSWORD_MAX
      ) {
        res.status(401).json({ error: 'invalid_credentials' });
        return;
      }
      const account = await loginAccount(username, password);
      if (!account) {
        res.status(401).json({ error: 'invalid_credentials' });
        return;
      }
      res.json({
        token: signWebToken(account.id, account.username),
        user: { id: account.id, name: account.display_name ?? account.username },
      });
    })
  );

  const api = express.Router();
  api.use(auth);

  // GET /api/me — profile + headline stats for the home screen
  api.get(
    '/me',
    wrap(async (req, res) => {
      const a = req.account!;
      const [stats, streak, vocab] = await Promise.all([
        getUserStats(a.id),
        getUserStreak(a.id).catch(() => 0),
        getVocabStats(a.id, ALL_VOCAB_IDS),
      ]);
      const lang = getLang(req);
      res.json({
        user: {
          id: a.id,
          name: a.name ?? (lang === 'ru' ? 'друг' : 'φίλε'),
          username: a.username,
          is_guest: a.isGuest,
        },
        stats,
        streak,
        vocab,
        topicLabels: topicLabels(lang),
      });
    })
  );

  // GET /api/quiz?topic=mixed&limit=10&lang=ru|el
  api.get(
    '/quiz',
    wrap(async (req, res) => {
      const topic = String(req.query.topic ?? 'mixed');
      const limit = Math.min(30, Math.max(1, Number(req.query.limit ?? 10)));
      const lang = getLang(req);
      const questions = await fetchQuestionsRandom(topic, limit, lang);
      res.json({
        topic,
        topicLabel: topicLabels(lang)[topic] ?? topic,
        questions: questions.map((q) => ({
          id: q.id,
          question: q.question,
          options: buildAnswerOptions(q),
          correct_answer: q.correct_answer,
          explanation: q.explanation,
          topic: q.topic,
        })),
      });
    })
  );

  // POST /api/quiz/complete  { topic, answers }  (client `score` is ignored)
  const KNOWN_TOPICS = new Set(['history', 'culture', 'laws', 'geography', 'mixed']);
  api.post(
    '/quiz/complete',
    wrap(async (req, res) => {
      const a = req.account!;
      const { topic, answers } = (req.body ?? {}) as { topic?: unknown; answers?: unknown };
      if (typeof topic !== 'string' || !KNOWN_TOPICS.has(topic) || !Array.isArray(answers)) {
        res.status(400).json({ error: 'bad_request' });
        return;
      }

      // Sanitize: keep only well-formed answer records (never store raw client
      // JSON in the answers column), cap the count, and derive the score
      // server-side — the client-sent `score` is untrusted and ignored.
      const records: AnswerRecord[] = (answers as unknown[])
        .slice(0, 50)
        .filter(
          (r): r is AnswerRecord =>
            !!r &&
            typeof r === 'object' &&
            typeof (r as AnswerRecord).question_id === 'string' &&
            typeof (r as AnswerRecord).chosen === 'string' &&
            typeof (r as AnswerRecord).correct === 'boolean' &&
            typeof (r as AnswerRecord).correct_answer === 'string'
        )
        .map((r) => ({
          question_id: r.question_id,
          chosen: r.chosen.slice(0, 500),
          correct: r.correct,
          correct_answer: r.correct_answer.slice(0, 500),
        }));
      if (records.length === 0) {
        res.status(400).json({ error: 'bad_request' });
        return;
      }

      const score = records.filter((r) => r.correct).length;
      await recordQuizSession(a.id, topic, score, records.length, records);

      // Update per-question SRS from each answer (best-effort).
      await Promise.all(
        records.map((r) =>
          recordQuestionProgress(a.id, r.question_id, r.correct ? 2 : 1, r.correct).catch((e) =>
            console.error('recordQuestionProgress error:', e)
          )
        )
      );
      res.json({ ok: true });
    })
  );

  // GET /api/flashcards — due SRS cards
  api.get(
    '/flashcards',
    wrap(async (req, res) => {
      const a = req.account!;
      const lang = getLang(req);
      let cards;
      try {
        cards = await fetchDueFlashcards(a.id, 20, lang);
      } catch {
        cards = await fetchRandomFlashcards(20, lang);
      }
      res.json({ cards });
    })
  );

  // POST /api/flashcards/grade  { questionId, grade }
  api.post(
    '/flashcards/grade',
    wrap(async (req, res) => {
      const a = req.account!;
      const { questionId, grade } = (req.body ?? {}) as { questionId?: unknown; grade?: unknown };
      if (
        typeof questionId !== 'string' ||
        typeof grade !== 'number' ||
        !Number.isInteger(grade) ||
        grade < 1 ||
        grade > 3
      ) {
        res.status(400).json({ error: 'bad_request' });
        return;
      }
      // grade 1 = forgot, 2 = remembered, 3 = knew instantly → 2+ counts correct.
      await recordQuestionProgress(a.id, questionId, grade, grade >= 2);
      res.json({ ok: true });
    })
  );

  // GET /api/vocab — due vocabulary cards
  api.get(
    '/vocab',
    wrap(async (req, res) => {
      const a = req.account!;
      const [due, stats] = await Promise.all([
        getDueVocab(a.id, ALL_VOCAB_IDS, 20),
        getVocabStats(a.id, ALL_VOCAB_IDS),
      ]);
      const cards = due
        .map(({ id, level }) => {
          const v = VOCAB_BY_ID.get(id);
          return v ? { id: v.id, word: v.word, ru: v.ru, note: v.note ?? null, topic: v.topic, level } : null;
        })
        .filter((v): v is NonNullable<typeof v> => Boolean(v));
      res.json({ cards, stats });
    })
  );

  // POST /api/vocab/grade  { vocabId, grade }
  api.post(
    '/vocab/grade',
    wrap(async (req, res) => {
      const a = req.account!;
      const { vocabId, grade } = (req.body ?? {}) as { vocabId?: unknown; grade?: unknown };
      if (
        typeof vocabId !== 'number' ||
        !Number.isInteger(vocabId) ||
        typeof grade !== 'number' ||
        !Number.isInteger(grade) ||
        grade < 1 ||
        grade > 3
      ) {
        res.status(400).json({ error: 'bad_request' });
        return;
      }
      await gradeVocab(a.id, vocabId, grade);
      res.json({ ok: true, stats: await getVocabStats(a.id, ALL_VOCAB_IDS) });
    })
  );

  // GET /api/stats — full stats + streak
  api.get(
    '/stats',
    wrap(async (req, res) => {
      const a = req.account!;
      const [stats, streak, vocab] = await Promise.all([
        getUserStats(a.id),
        getUserStreak(a.id).catch(() => 0),
        getVocabStats(a.id, ALL_VOCAB_IDS),
      ]);
      res.json({ stats, streak, vocab, topicLabels: topicLabels(getLang(req)) });
    })
  );

  // POST /api/tts  { text, cacheKey } -> { audioUrl } — Greek pronunciation (ElevenLabs)
  api.post(
    '/tts',
    wrap(async (req, res) => {
      const { text, cacheKey } = (req.body ?? {}) as { text?: unknown; cacheKey?: unknown };
      if (typeof text !== 'string' || !text.trim() || typeof cacheKey !== 'string' || !cacheKey.trim()) {
        res.status(400).json({ error: 'bad_request' });
        return;
      }
      try {
        const audioUrl = await getOrSynthesizeGreekSpeech(text, cacheKey);
        res.json({ audioUrl });
      } catch (err) {
        // Surface the provider's error text (e.g. "401 unauthorized", "voice
        // not found") — it carries no secret and makes prod TTS debuggable.
        const detail = err instanceof Error ? err.message : String(err);
        console.error('tts error:', detail);
        res.status(500).json({ error: 'tts_failed', detail });
      }
    })
  );

  // GET /api/history — last 10 completed quizzes
  api.get(
    '/history',
    wrap(async (req, res) => {
      const a = req.account!;
      const sessions = await getHistory(a.id, 10);
      res.json({ sessions, topicLabels: topicLabels(getLang(req)) });
    })
  );

  app.use('/api', api);

  // --- Serve the built web app in production (webapp/dist) ---
  const distDir = path.join(__dirname, '..', '..', 'webapp', 'dist');
  if (fs.existsSync(distDir)) {
    app.use(express.static(distDir));
    // SPA fallback — serve index.html for any non-API route (Express 5: no string '*')
    app.use((req: Request, res: Response, next: NextFunction) => {
      if (req.method !== 'GET' || req.path.startsWith('/api')) return next();
      res.sendFile(path.join(distDir, 'index.html'));
    });
  }

  return app;
}

export function startApiServer(port: number): void {
  // Refuse to boot without the token-signing secret: session tokens would be
  // HMAC'd with an empty key (forgeable) and guest access would silently 401.
  if (!process.env.APP_SECRET) {
    throw new Error('APP_SECRET must be set (signs session tokens and gates guest access)');
  }
  const app = createApiApp();
  app.listen(port, () => console.log(`Hellas Study API listening on :${port}`));
}
