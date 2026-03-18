import { Context } from 'telegraf';
import { upsertUser } from '../services/userService';
import {
  fetchQuestionsRandom,
  parseTopic,
  buildAnswerOptions,
  TOPIC_LABELS,
} from '../services/questionService';
import {
  createSession,
  getActiveSession,
  updateSession,
} from '../services/sessionService';
import { QuizSession } from '../types';

const ANSWER_LETTERS = ['A', 'B', 'C', 'D'];

export async function handleQuiz(ctx: Context): Promise<void> {
  const from = ctx.from;
  if (!from) return;

  // Parse topic from message text
  const text = ctx.message && 'text' in ctx.message ? (ctx.message as { text: string }).text : '';
  const args = text.split(' ').slice(1).join(' ');
  const topic = parseTopic(args || undefined);

  await upsertUser(
    from.id,
    from.username,
    [from.first_name, from.last_name].filter(Boolean).join(' ') || undefined
  );

  // Check for active session
  const existing = await getActiveSession(from.id);
  if (existing) {
    await ctx.reply('У тебя есть незавершённый квиз. Начать заново?', {
      reply_markup: {
        inline_keyboard: [
          [
            { text: '✅ Да, начать заново', callback_data: 'abandon:yes' },
            { text: '❌ Нет, продолжить', callback_data: 'abandon:no' },
          ],
        ],
      },
    });
    return;
  }

  await startQuiz(ctx, from.id, topic);
}

export async function startQuiz(
  ctx: Context,
  telegramId: number,
  topic: string
): Promise<void> {
  const questions = await fetchQuestionsRandom(topic, 10);

  if (questions.length === 0) {
    await ctx.reply('Вопросы не найдены. Попробуй другую тему.');
    return;
  }

  const session = await createSession(telegramId, topic, questions);
  await sendQuestion(ctx, session);
}

export async function sendQuestion(ctx: Context, session: QuizSession): Promise<void> {
  const q = session.questions[session.current_index];
  const answerOptions = buildAnswerOptions(q);
  const topicLabel = TOPIC_LABELS[session.topic] ?? session.topic;
  const progress = `${session.current_index + 1}/${session.questions.length}`;

  const questionText =
    `*Вопрос ${progress} | ${topicLabel}*\n` +
    `━━━━━━━━━━━━━━━\n\n` +
    `${q.question}\n\n` +
    answerOptions.map((ans, i) => `*${ANSWER_LETTERS[i]}*  ${ans}`).join('\n');

  const keyboard = answerOptions.map((_, i) => ({
    text: ANSWER_LETTERS[i],
    callback_data: `a:${i}`,
  }));

  let sentMessage: { message_id: number } | undefined;

  if (session.last_message_id && ctx.chat) {
    try {
      await ctx.telegram.editMessageText(
        ctx.chat.id,
        session.last_message_id,
        undefined,
        questionText,
        {
          parse_mode: 'Markdown',
          reply_markup: { inline_keyboard: [keyboard] },
        }
      );
    } catch {
      // Message might be too old to edit
      sentMessage = await ctx.reply(questionText, {
        parse_mode: 'Markdown',
        reply_markup: { inline_keyboard: [keyboard] },
      }) as unknown as { message_id: number };
    }
  } else {
    sentMessage = await ctx.reply(questionText, {
      parse_mode: 'Markdown',
      reply_markup: { inline_keyboard: [keyboard] },
    }) as unknown as { message_id: number };
  }

  await updateSession(session.id, {
    current_answer_order: answerOptions,
    ...(sentMessage?.message_id ? { last_message_id: sentMessage.message_id } : {}),
  });
}
