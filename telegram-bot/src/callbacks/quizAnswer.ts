import { Context } from 'telegraf';
import {
  getActiveSession,
  updateSession,
  completeSession,
} from '../services/sessionService';
import { sendQuestion, startQuiz } from '../commands/quiz';
import { TOPIC_LABELS } from '../services/questionService';
import { getUser } from '../services/userService';
import { supabase } from '../supabase';

const ANSWER_LETTERS = ['A', 'B', 'C', 'D'];

export async function handleQuizAnswer(ctx: Context, indexStr: string): Promise<void> {
  const from = ctx.from;
  if (!from) return;

  const session = await getActiveSession(from.id);
  if (!session) {
    await ctx.answerCbQuery('Квиз не найден. Начни новый через /quiz');
    return;
  }

  const answerIndex = parseInt(indexStr);
  const answerOrder = session.current_answer_order;
  if (!answerOrder || answerIndex < 0 || answerIndex >= answerOrder.length) {
    await ctx.answerCbQuery('Ошибка. Попробуй ещё раз.');
    return;
  }

  const chosen = answerOrder[answerIndex];
  const question = session.questions[session.current_index];
  const isCorrect = chosen === question.correct_answer;

  // Build feedback text
  const topicLabel = TOPIC_LABELS[session.topic] ?? session.topic;
  const progress = `${session.current_index + 1}/${session.questions.length}`;

  const lines = answerOrder.map((ans, i) => {
    const letter = ANSWER_LETTERS[i];
    const isChosen = ans === chosen;
    const isCorrectAns = ans === question.correct_answer;

    if (isCorrectAns && isChosen) return `✅ *${letter}*  ${ans}  ← верно!`;
    if (isChosen && !isCorrect) return `❌ *${letter}*  ${ans}  ← твой ответ`;
    if (isCorrectAns) return `✅ *${letter}*  ${ans}  ← правильный ответ`;
    return `${letter}  ${ans}`;
  });

  const feedbackText =
    `*Вопрос ${progress} | ${topicLabel}*\n` +
    `━━━━━━━━━━━━━━━\n\n` +
    `${question.question}\n\n` +
    lines.join('\n') +
    (question.explanation
      ? `\n\n💬 _${question.explanation}_`
      : '');

  if (session.last_message_id && ctx.chat) {
    try {
      await ctx.telegram.editMessageText(
        ctx.chat.id,
        session.last_message_id,
        undefined,
        feedbackText,
        {
          parse_mode: 'Markdown',
          reply_markup: {
            inline_keyboard: [
              [{ text: '→ Следующий вопрос', callback_data: 'next' }],
            ],
          },
        }
      );
    } catch {
      await ctx.reply(feedbackText, {
        parse_mode: 'Markdown',
        reply_markup: {
          inline_keyboard: [
            [{ text: '→ Следующий вопрос', callback_data: 'next' }],
          ],
        },
      });
    }
  }

  // Save answer and update session
  const newAnswers = [
    ...session.answers,
    {
      question_id: question.id,
      chosen,
      correct: isCorrect,
      correct_answer: question.correct_answer,
    },
  ];

  const newIndex = session.current_index + 1;
  const newScore = session.score + (isCorrect ? 1 : 0);

  if (newIndex >= session.questions.length) {
    await updateSession(session.id, {
      current_index: newIndex,
      score: newScore,
      answers: newAnswers,
    });
    // Mark complete after "next" is clicked (handled in handleNext)
  } else {
    await updateSession(session.id, {
      current_index: newIndex,
      score: newScore,
      answers: newAnswers,
    });
  }

  // Save progress (record every attempt)
  const user = await getUser(from.id);
  if (user?.user_id) {
    try {
      await supabase.rpc('upsert_progress', {
        p_user_id: user.user_id,
        p_question_id: question.id,
        p_correct: isCorrect,
      });
    } catch (err) {
      console.error('upsert_progress error:', err);
    }
  }

  await ctx.answerCbQuery(isCorrect ? '✅ Верно!' : '❌ Неверно');
}

export async function handleNext(ctx: Context): Promise<void> {
  const from = ctx.from;
  if (!from) return;

  const session = await getActiveSession(from.id);
  if (!session) {
    await ctx.answerCbQuery('Квиз не найден.');
    return;
  }

  await ctx.answerCbQuery();

  if (session.current_index >= session.questions.length) {
    await completeSession(session.id);
    await showResults(ctx, session.score, session.questions.length, session.topic);
    return;
  }

  await sendQuestion(ctx, session);
}

async function showResults(
  ctx: Context,
  score: number,
  total: number,
  topic: string
): Promise<void> {
  const topicLabel = TOPIC_LABELS[topic] ?? topic;
  const pct = Math.round((score / total) * 100);

  let emoji = '😅';
  if (pct >= 80) emoji = '🎉';
  else if (pct >= 60) emoji = '👍';

  const text =
    `${emoji} *Викторина завершена!*\n` +
    `━━━━━━━━━━━━━━━\n\n` +
    `Тема: ${topicLabel}\n` +
    `Результат: *${score} / ${total}* (${pct}%)\n\n` +
    `⭐ Верно: ${score}\n` +
    `💔 Неверно: ${total - score}`;

  await ctx.reply(text, {
    parse_mode: 'Markdown',
    reply_markup: {
      inline_keyboard: [
        [
          { text: '🔄 Снова эту тему', callback_data: `restart:${topic}` },
          { text: '📊 Статистика', callback_data: 'menu:stats' },
        ],
        [{ text: '📝 Другой квиз', callback_data: 'menu:quiz' }],
      ],
    },
  });
}

export async function handleAbandon(ctx: Context, answer: string): Promise<void> {
  const from = ctx.from;
  if (!from) return;

  if (answer === 'no') {
    await ctx.answerCbQuery();
    const session = await getActiveSession(from.id);
    if (session) {
      // Clear locally so sendQuestion sends a new message instead of editing the old one
      session.last_message_id = null;
      try { await ctx.editMessageText('Продолжаем!'); } catch {}
      await sendQuestion(ctx, session);
    }
    return;
  }

  // yes — will be handled when /quiz is called again with startQuiz
  await ctx.editMessageText('Хорошо! Выбери тему для нового квиза:');
  await ctx.answerCbQuery();

  if (from) {
    await startQuiz(ctx, from.id, 'mixed');
  }
}

export async function handleRestart(ctx: Context, topic: string): Promise<void> {
  const from = ctx.from;
  if (!from) return;
  await ctx.answerCbQuery();
  await startQuiz(ctx, from.id, topic);
}
