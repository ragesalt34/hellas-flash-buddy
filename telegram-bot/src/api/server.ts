import express, { NextFunction, Request, Response } from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import { validateInitData, WebAppUser } from './auth';
import { supabase } from '../supabase';
import {
  fetchQuestionsRandom,
  fetchDueFlashcards,
  fetchRandomFlashcards,
  buildAnswerOptions,
  TOPIC_LABELS,
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
  app.use(cors());
  app.use(express.json({ limit: '1mb' }));

  // --- Auth middleware: validate Telegram initData on every /api route ---
  const auth = (req: AuthedRequest, res: Response, next: NextFunction): void => {
    const initData = req.header('X-Telegram-Init-Data') ?? '';
    const token = process.env.BOT_TOKEN ?? '';
    let user = token ? validateInitData(initData, token) : null;

    // Local development bypass — only when explicitly enabled
    if (!user && process.env.ALLOW_DEV_AUTH === 'true') {
      const devId = Number(req.header('X-Dev-User-Id') ?? req.query.devUserId);
      if (devId) user = { id: devId, first_name: 'Dev' };
    }

    if (!user) {
      res.status(401).json({ error: 'unauthorized' });
      return;
    }
    req.tgUser = user;
    next();
  };

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
      res.json({
        user: { id: u.id, name: u.first_name ?? 'φίλε', username: u.username ?? null },
        stats,
        streak,
        vocab,
        topicLabels: TOPIC_LABELS,
      });
    })
  );

  // GET /api/quiz?topic=mixed&limit=10
  api.get(
    '/quiz',
    wrap(async (req, res) => {
      const topic = String(req.query.topic ?? 'mixed');
      const limit = Math.min(30, Math.max(1, Number(req.query.limit ?? 10)));
      const questions = await fetchQuestionsRandom(topic, limit);
      res.json({
        topic,
        topicLabel: TOPIC_LABELS[topic] ?? topic,
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
      const user = await getUser(u.id);
      let cards;
      if (user?.user_id) {
        try {
          cards = await fetchDueFlashcards(user.user_id, 20);
        } catch {
          cards = await fetchRandomFlashcards(20);
        }
      } else {
        cards = await fetchRandomFlashcards(20);
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
      res.json({ stats, streak, vocab: getVocabStats(u.id, ALL_VOCAB_IDS), topicLabels: TOPIC_LABELS });
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
      res.json({ sessions, topicLabels: TOPIC_LABELS });
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
