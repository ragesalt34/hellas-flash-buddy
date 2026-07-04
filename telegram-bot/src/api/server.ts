import express, { NextFunction, Request, Response } from 'express';
import cors from 'cors';
import crypto from 'crypto';
import path from 'path';
import fs from 'fs';
import { validateInitData, WebAppUser } from './auth';
import { supabase } from '../supabase';
import {
  fetchQuestionsRandom,
  fetchDueFlashcards,
  fetchRandomFlashcards,
  buildAnswerOptions,
  topicLabels,
  type ContentLang,
} from '../services/questionService';
import { getUserStats, getUserStreak } from '../services/sessionService';
import { upsertUser, getUser } from '../services/userService';
import { getDueVocabIds, gradeVocab, getVocabStats } from '../services/vocabProgressService';
import { VOCABULARY, VOCAB_BY_ID } from '../data/vocabulary';
import { getOrSynthesizeGreekSpeech } from '../services/ttsService';

const ALL_VOCAB_IDS = VOCABULARY.map((v) => v.id);

// Augment Express request with the authenticated Telegram user
interface AuthedRequest extends Request {
  tgUser?: WebAppUser;
}

const displayName = (u: WebAppUser): string | undefined =>
  [u.first_name, u.last_name].filter(Boolean).join(' ') || undefined;

// Content language for quiz/flashcard/topic-label text — defaults to Greek
// (the bot's original behaviour) unless the client asks for Russian.
const getLang = (req: Request): ContentLang => (req.query.lang === 'ru' ? 'ru' : 'el');

// ---- Web accounts (nickname + password) ----
// Credentials live in Supabase Auth (GoTrue hashes the passwords); the nickname
// is wrapped into a synthetic email so no new tables/DDL are needed. The rest of
// the system keys progress by a numeric id, so we derive a stable 48-bit id from
// the auth user's UUID. Sessions are stateless HMAC tokens signed with APP_SECRET.
const USERNAME_RE = /^[a-zA-Z0-9_]{3,20}$/;
const webEmail = (username: string): string => `${username.toLowerCase()}@web.hellas-study.app`;

// Shared read/write sandbox id for anonymous guests. Negative so it can never
// collide with a real Telegram id or a derived web-account id (both positive).
// All guests share this one sandbox; it is assigned server-side and is NOT
// taken from the client, so the public APP_SECRET can no longer be used to
// impersonate an arbitrary account by passing its id.
const GUEST_ID = Number(process.env.GUEST_USER_ID ?? -1);
const uuidToNumericId = (uuid: string): number => parseInt(uuid.replace(/-/g, '').slice(0, 12), 16);
const authSecret = (): string => process.env.APP_SECRET || process.env.BOT_TOKEN || '';

function signWebToken(id: number, username: string): string {
  const payload = Buffer.from(
    JSON.stringify({ id, u: username, exp: Date.now() + 90 * 24 * 3600 * 1000 })
  ).toString('base64url');
  const sig = crypto.createHmac('sha256', authSecret()).update(payload).digest('base64url');
  return `${payload}.${sig}`;
}

function verifyWebToken(token: string): { id: number; u: string } | null {
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
    if (typeof p.id !== 'number' || typeof p.u !== 'string' || typeof p.exp !== 'number') return null;
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

  // --- Auth middleware: validate Telegram initData on every /api route ---
  const auth = (req: AuthedRequest, res: Response, next: NextFunction): void => {
    const initData = req.header('X-Telegram-Init-Data') ?? '';
    const token = process.env.BOT_TOKEN ?? '';
    let user = token ? validateInitData(initData, token) : null;

    // Web account session (nickname+password login) — stateless HMAC token
    if (!user) {
      const wt = req.header('X-Web-Token') ?? '';
      if (wt) {
        const v = verifyWebToken(wt);
        if (v) user = { id: v.id, first_name: v.u, username: v.u };
      }
    }

    // Local development bypass — only when explicitly enabled
    if (!user && process.env.ALLOW_DEV_AUTH === 'true') {
      const devId = Number(req.header('X-Dev-User-Id') ?? req.query.devUserId);
      if (devId) user = { id: devId, first_name: 'Dev' };
    }

    // Anonymous guest ("continue without an account"). The APP_SECRET is shipped
    // in the public client bundle, so it is NOT a real credential — it only gates
    // the shared demo sandbox. Crucially, the id is pinned to GUEST_ID server-side
    // and the client-supplied X-App-User-Id is ignored, so a leaked secret can no
    // longer be used to read or write an arbitrary account's progress. Real
    // accounts are reachable only via a signed web token or Telegram initData.
    if (!user && process.env.APP_SECRET) {
      const secret = req.header('X-App-Secret') ?? '';
      const secretBuf = Buffer.from(secret);
      const expectedBuf = Buffer.from(process.env.APP_SECRET);
      const validSecret =
        secretBuf.length === expectedBuf.length && crypto.timingSafeEqual(secretBuf, expectedBuf);
      if (validSecret) {
        // No first_name → /api/me greets with the friendly default ("φίλε"/"друг").
        user = { id: GUEST_ID };
      }
    }

    if (!user) {
      res.status(401).json({ error: 'unauthorized' });
      return;
    }
    req.tgUser = user;
    next();
  };

  // --- Public auth endpoints (no session required) ---
  const gotrueHeaders = () => ({
    apikey: process.env.SUPABASE_SERVICE_KEY ?? '',
    Authorization: `Bearer ${process.env.SUPABASE_SERVICE_KEY ?? ''}`,
    'Content-Type': 'application/json',
  });

  // POST /api/auth/register { username, password }
  app.post(
    '/api/auth/register',
    wrap(async (req, res) => {
      const { username, password } = (req.body ?? {}) as { username?: unknown; password?: unknown };
      if (
        typeof username !== 'string' ||
        !USERNAME_RE.test(username) ||
        typeof password !== 'string' ||
        password.length < 6
      ) {
        res.status(400).json({ error: 'invalid_input' });
        return;
      }
      const r = await fetch(`${process.env.SUPABASE_URL}/auth/v1/admin/users`, {
        method: 'POST',
        headers: gotrueHeaders(),
        body: JSON.stringify({
          email: webEmail(username),
          password,
          email_confirm: true,
          user_metadata: { username },
        }),
      });
      const data = (await r.json().catch(() => ({}))) as { id?: string; msg?: string; message?: string };
      if (!r.ok || !data.id) {
        const msg = String(data.msg ?? data.message ?? '');
        if (r.status === 422 || /already|exists/i.test(msg)) {
          res.status(409).json({ error: 'username_taken' });
          return;
        }
        console.error('auth/register error:', r.status, data);
        res.status(500).json({ error: 'register_failed' });
        return;
      }
      const id = uuidToNumericId(data.id);
      await upsertUser(id, username, username).catch((e) => console.error('upsertUser error:', e));
      res.json({ token: signWebToken(id, username), user: { id, name: username } });
    })
  );

  // POST /api/auth/login { username, password }
  app.post(
    '/api/auth/login',
    wrap(async (req, res) => {
      const { username, password } = (req.body ?? {}) as { username?: unknown; password?: unknown };
      if (typeof username !== 'string' || !USERNAME_RE.test(username) || typeof password !== 'string') {
        res.status(401).json({ error: 'invalid_credentials' });
        return;
      }
      const r = await fetch(`${process.env.SUPABASE_URL}/auth/v1/token?grant_type=password`, {
        method: 'POST',
        headers: gotrueHeaders(),
        body: JSON.stringify({ email: webEmail(username), password }),
      });
      const data = (await r.json().catch(() => ({}))) as { user?: { id?: string } };
      if (!r.ok || !data.user?.id) {
        res.status(401).json({ error: 'invalid_credentials' });
        return;
      }
      const id = uuidToNumericId(data.user.id);
      res.json({ token: signWebToken(id, username), user: { id, name: username } });
    })
  );

  const api = express.Router();
  api.use(auth);

  // GET /api/me — profile + headline stats for the home screen
  api.get(
    '/me',
    wrap(async (req, res) => {
      const u = req.tgUser!;
      await upsertUser(u.id, u.username, displayName(u)).catch((e) =>
        console.error('upsertUser error:', e)
      );
      const [stats, streak] = await Promise.all([
        getUserStats(u.id),
        getUserStreak(u.id).catch(() => 0),
      ]);
      const vocab = getVocabStats(u.id, ALL_VOCAB_IDS);
      const lang = getLang(req);
      res.json({
        user: { id: u.id, name: u.first_name ?? (lang === 'ru' ? 'друг' : 'φίλε'), username: u.username ?? null },
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

  // POST /api/quiz/complete  { topic, score, answers, questions }
  api.post(
    '/quiz/complete',
    wrap(async (req, res) => {
      const u = req.tgUser!;
      const { topic, score, answers, questions } = req.body ?? {};
      if (!topic || !Array.isArray(answers) || !Array.isArray(questions)) {
        res.status(400).json({ error: 'bad_request' });
        return;
      }

      await supabase.from('telegram_quiz_sessions').insert({
        telegram_id: u.id,
        topic,
        questions,
        current_index: questions.length,
        score: Number(score) || 0,
        answers,
        completed_at: new Date().toISOString(),
      });

      const user = await getUser(u.id);
      if (user?.user_id) {
        for (const a of answers) {
          await supabase
            .rpc('upsert_progress', {
              p_user_id: user.user_id,
              p_question_id: a.question_id,
              p_correct: !!a.correct,
            })
            .then(undefined, (e) => console.error('upsert_progress error:', e));
        }
      }
      res.json({ ok: true });
    })
  );

  // GET /api/flashcards — due SRS cards
  api.get(
    '/flashcards',
    wrap(async (req, res) => {
      const u = req.tgUser!;
      const lang = getLang(req);
      const user = await getUser(u.id);
      let cards;
      if (user?.user_id) {
        try {
          cards = await fetchDueFlashcards(user.user_id, 20, lang);
        } catch {
          cards = await fetchRandomFlashcards(20, lang);
        }
      } else {
        cards = await fetchRandomFlashcards(20, lang);
      }
      res.json({ cards });
    })
  );

  // POST /api/flashcards/grade  { questionId, grade }
  api.post(
    '/flashcards/grade',
    wrap(async (req, res) => {
      const u = req.tgUser!;
      const { questionId, grade } = req.body ?? {};
      if (!questionId || typeof grade !== 'number') {
        res.status(400).json({ error: 'bad_request' });
        return;
      }
      const user = await getUser(u.id);
      if (user?.user_id) {
        const { error } = await supabase.rpc('upsert_progress', {
          p_user_id: user.user_id,
          p_question_id: questionId,
          p_grade: grade,
        });
        if (error) {
          console.error('flashcards/grade upsert error:', error);
          res.status(500).json({ error: 'srs_update_failed' });
          return;
        }
      }
      res.json({ ok: true });
    })
  );

  // GET /api/vocab — due vocabulary cards
  api.get(
    '/vocab',
    wrap(async (req, res) => {
      const u = req.tgUser!;
      const dueIds = getDueVocabIds(u.id, ALL_VOCAB_IDS, 20);
      const cards = dueIds
        .map((id) => VOCAB_BY_ID.get(id))
        .filter((v): v is NonNullable<typeof v> => Boolean(v))
        .map((v) => ({ id: v.id, word: v.word, ru: v.ru, note: v.note ?? null, topic: v.topic }));
      res.json({ cards, stats: getVocabStats(u.id, ALL_VOCAB_IDS) });
    })
  );

  // POST /api/vocab/grade  { vocabId, grade }
  api.post(
    '/vocab/grade',
    wrap(async (req, res) => {
      const u = req.tgUser!;
      const { vocabId, grade } = req.body ?? {};
      if (typeof vocabId !== 'number' || typeof grade !== 'number') {
        res.status(400).json({ error: 'bad_request' });
        return;
      }
      gradeVocab(u.id, vocabId, grade);
      res.json({ ok: true, stats: getVocabStats(u.id, ALL_VOCAB_IDS) });
    })
  );

  // GET /api/stats — full stats + streak
  api.get(
    '/stats',
    wrap(async (req, res) => {
      const u = req.tgUser!;
      const [stats, streak] = await Promise.all([
        getUserStats(u.id),
        getUserStreak(u.id).catch(() => 0),
      ]);
      res.json({ stats, streak, vocab: getVocabStats(u.id, ALL_VOCAB_IDS), topicLabels: topicLabels(getLang(req)) });
    })
  );

  // POST /api/tts  { text, cacheKey } -> { audioUrl } — Greek pronunciation (Google Cloud TTS)
  api.post(
    '/tts',
    wrap(async (req, res) => {
      const { text, cacheKey } = req.body ?? {};
      if (typeof text !== 'string' || !text.trim() || typeof cacheKey !== 'string' || !cacheKey.trim()) {
        res.status(400).json({ error: 'bad_request' });
        return;
      }
      try {
        const audioUrl = await getOrSynthesizeGreekSpeech(text, cacheKey);
        res.json({ audioUrl });
      } catch (err) {
        console.error('tts error:', err);
        res.status(500).json({ error: 'tts_failed' });
      }
    })
  );

  // GET /api/history — last 10 completed quizzes
  api.get(
    '/history',
    wrap(async (req, res) => {
      const u = req.tgUser!;
      const { data, error } = await supabase
        .from('telegram_quiz_sessions')
        .select('topic, score, questions, completed_at')
        .eq('telegram_id', u.id)
        .not('completed_at', 'is', null)
        .order('completed_at', { ascending: false })
        .limit(10);
      if (error) throw error;
      const sessions = (data ?? []).map((s: { topic: string; score: number; questions: unknown[]; completed_at: string }) => ({
        topic: s.topic,
        score: s.score,
        total: s.questions.length,
        completed_at: s.completed_at,
      }));
      res.json({ sessions, topicLabels: topicLabels(getLang(req)) });
    })
  );

  app.use('/api', api);

  // --- Serve the built Mini App in production (webapp/dist) ---
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
  const app = createApiApp();
  app.listen(port, () => console.log(`Mini App API listening on :${port}`));
}
