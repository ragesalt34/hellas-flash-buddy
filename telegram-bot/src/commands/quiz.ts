import { Context } from 'grammy';
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
import { progressHeader } from '../utils/progressBar';

const ANSWER_LETTERS = ['🅐', '🅑', '🅒', '🅓'];

export async function handleQuiz(ctx: Context): Promise<void> {
  const from = ctx.from;
  if (!from) return;

  await upsertUser(
    from.id,
    from.username,
    [from.first_name, from.last_name].filter(Boolean).join(' ') || undefined
  );

  // Parse topic from message text (if provided as argument)
  const text = ctx.message && 'text' in ctx.message ? (ctx.message as { text: string }).text : '';
  const args = text.split(' ').slice(1).join(' ').trim();

  // Check for active session
  const existing = await getActiveSession(from.id);
  if (existing) {
    await ctx.reply('Έχεις ένα κουίζ που δεν ολοκληρώθηκε. Να ξεκινήσεις από την αρχή;', {
      reply_markup: {
        inline_keyboard: [
          [
            { text: '🔄 Από την αρχή', callback_data: 'abandon:yes', style: 'danger' as const },
            { text: '▶️ Συνέχεια',     callback_data: 'abandon:no',  style: 'success' as const },
          ],
        ],
      },
    });
    return;
  }

  // If topic provided as argument, start directly
  if (args) {
    const topic = parseTopic(args);
    if (topic !== 'mixed') {
      await startQuiz(ctx, from.id, topic);
      return;
    }
  }

  // Show topic selection menu
  await showTopicMenu(ctx);
}

export async function showTopicMenu(ctx: Context): Promise<void> {
  await ctx.reply(
    '🎯 <b>Διάλεξε θέμα κουίζ</b>\n<i>10 τυχαίες ερωτήσεις</i>',
    {
      parse_mode: 'HTML',
      reply_markup: {
        inline_keyboard: [
          [{ text: '🎲 Όλα τα θέματα μαζί', callback_data: 'topic:mixed', style: 'primary' as const }],
          [
            { text: '🏛 Ιστορία',    callback_data: 'topic:history',    style: 'primary' as const },
            { text: '🎭 Πολιτισμός', callback_data: 'topic:culture',    style: 'primary' as const },
          ],
          [
            { text: '⚖️ Νομοθεσία', callback_data: 'topic:laws',       style: 'primary' as const },
            { text: '🌍 Γεωγραφία', callback_data: 'topic:geography',  style: 'primary' as const },
          ],
        ],
      },
    }
  );
}

export async function startQuiz(
  ctx: Context,
  telegramId: number,
  topic: string
): Promise<void> {
  const questions = await fetchQuestionsRandom(topic, 10);

  if (questions.length === 0) {
    await ctx.reply('Δεν βρέθηκαν ερωτήσεις. Δοκίμασε άλλο θέμα.');
    return;
  }

  const session = await createSession(telegramId, topic, questions);
  await sendQuestion(ctx, session);
}

export async function sendQuestion(ctx: Context, session: QuizSession): Promise<void> {
  const q = session.questions[session.current_index];
  const answerOptions = buildAnswerOptions(q);
  const topicLabel = TOPIC_LABELS[session.topic] ?? session.topic;
  const current = session.current_index + 1;
  const total = session.questions.length;

  const escape = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

  const questionText =
    `${progressHeader(current, total, topicLabel)}\n\n` +
    `<b>${escape(q.question)}</b>\n\n` +
    answerOptions.map((ans, i) => `${ANSWER_LETTERS[i]}  ${escape(ans)}`).join('\n');

  const answerRow = answerOptions.map((_, i) => ({
    text: ANSWER_LETTERS[i],
    callback_data: `a:${i}`,
    style: 'primary' as const,
  }));
  const keyboard = [answerRow, [{ text: '⏭ Παράλειψη', callback_data: 'skip' }]];

  let sentMessage: { message_id: number } | undefined;

  if (session.last_message_id && ctx.chat) {
    try {
      await ctx.api.editMessageText(
        ctx.chat.id,
        session.last_message_id,
        questionText,
        {
          parse_mode: 'HTML',
          reply_markup: { inline_keyboard: keyboard },
        }
      );
    } catch {
      sentMessage = await ctx.reply(questionText, {
        parse_mode: 'HTML',
        reply_markup: { inline_keyboard: keyboard },
      });
    }
  } else {
    sentMessage = await ctx.reply(questionText, {
      parse_mode: 'HTML',
      reply_markup: { inline_keyboard: keyboard },
    });
  }

  await updateSession(session.id, {
    current_answer_order: answerOptions,
    ...(sentMessage?.message_id ? { last_message_id: sentMessage.message_id } : {}),
  });
}
