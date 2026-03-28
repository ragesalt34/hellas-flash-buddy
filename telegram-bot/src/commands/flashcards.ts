import { Context } from 'telegraf';
import { getUser } from '../services/userService';
import {
  fetchDueFlashcards,
  fetchRandomFlashcards,
  computeNextReview,
} from '../services/questionService';
import { FlashcardItem } from '../types';

// In-memory flashcard sessions (ephemeral — acceptable for flashcards)
const flashSessions = new Map<
  number,
  { cards: FlashcardItem[]; index: number; messageId?: number; lastActivity: number }
>();

export function cleanupStaleSessions(maxAge = 30 * 60 * 1000): number {
  const now = Date.now();
  let cleaned = 0;
  for (const [id, session] of flashSessions) {
    if (now - session.lastActivity > maxAge) {
      flashSessions.delete(id);
      cleaned++;
    }
  }
  return cleaned;
}

export async function handleFlashcards(ctx: Context): Promise<void> {
  const from = ctx.from;
  if (!from) return;

  const user = await getUser(from.id);
  let cards: FlashcardItem[];

  if (user?.user_id) {
    try {
      cards = await fetchDueFlashcards(user.user_id, 20);
    } catch (err) {
      console.error('fetchDueFlashcards error:', err);
      cards = await fetchRandomFlashcards(20);
    }
    if (cards.length === 0) {
      await ctx.reply(
        '🎉 Отлично! Нет карточек для повторения прямо сейчас.\n\nВсе карточки будут готовы к повторению позже.',
        {
          reply_markup: {
            inline_keyboard: [
              [{ text: '📝 Пройти квиз', callback_data: 'menu:quiz' }],
            ],
          },
        }
      );
      return;
    }
  } else {
    try {
      cards = await fetchRandomFlashcards(20);
    } catch (err) {
      console.error('fetchRandomFlashcards error:', err);
      await ctx.reply('Не удалось загрузить карточки. Попробуй позже.');
      return;
    }
  }

  flashSessions.set(from.id, { cards, index: 0, lastActivity: Date.now() });
  await sendFlashcard(ctx, from.id);
}

export async function sendFlashcard(ctx: Context, telegramId: number): Promise<void> {
  const session = flashSessions.get(telegramId);
  if (!session) return;

  const { cards, index } = session;

  if (index >= cards.length) {
    flashSessions.delete(telegramId);
    await ctx.reply(
      '✅ Сессия завершена! Все карточки пройдены.',
      {
        reply_markup: {
          inline_keyboard: [
            [
              { text: '🔄 Ещё раз', callback_data: 'fc:restart' },
              { text: '📝 Квиз', callback_data: 'menu:quiz' },
            ],
          ],
        },
      }
    );
    return;
  }

  const card = cards[index];
  const progress = `${index + 1}/${cards.length}`;

  const text =
    `*Карточка ${progress}*\n` +
    `━━━━━━━━━━━━━━━\n\n` +
    `${card.question}`;

  const sent = await ctx.reply(text, {
    parse_mode: 'Markdown',
    reply_markup: {
      inline_keyboard: [
        [{ text: '👀 Показать ответ', callback_data: 'fc:show' }],
      ],
    },
  }) as unknown as { message_id: number };

  flashSessions.set(telegramId, { ...session, messageId: sent.message_id, lastActivity: Date.now() });
}

export async function handleFlashcardCallback(
  ctx: Context,
  action: string
): Promise<void> {
  const from = ctx.from;
  if (!from) return;

  if (action === 'restart') {
    await handleFlashcards(ctx);
    return;
  }

  const session = flashSessions.get(from.id);
  if (!session) {
    await ctx.answerCbQuery('Сессия истекла. Запусти /flashcards заново.');
    return;
  }

  const { cards, index } = session;
  const card = cards[index];

  if (action === 'show') {
    const answerText =
      `*Карточка ${index + 1}/${cards.length}*\n` +
      `━━━━━━━━━━━━━━━\n\n` +
      `${card.question}\n\n` +
      `✅ *Ответ:* ${card.correct_answer}` +
      (card.explanation ? `\n\n💬 ${card.explanation}` : '');

    if (session.messageId && ctx.chat) {
      try {
        await ctx.telegram.editMessageText(
          ctx.chat.id,
          session.messageId,
          undefined,
          answerText,
          {
            parse_mode: 'Markdown',
            reply_markup: {
              inline_keyboard: [
                [
                  { text: '😕 Сложно', callback_data: 'fc:grade:1' },
                  { text: '😊 Нормально', callback_data: 'fc:grade:2' },
                  { text: '✅ Знаю', callback_data: 'fc:grade:3' },
                ],
              ],
            },
          }
        );
      } catch {
        await ctx.reply(answerText, {
          parse_mode: 'Markdown',
          reply_markup: {
            inline_keyboard: [
              [
                { text: '😕 Сложно', callback_data: 'fc:grade:1' },
                { text: '😊 Нормально', callback_data: 'fc:grade:2' },
                { text: '✅ Знаю', callback_data: 'fc:grade:3' },
              ],
            ],
          },
        });
      }
    }
    await ctx.answerCbQuery();
    return;
  }

  if (action.startsWith('grade:')) {
    const grade = parseInt(action.split(':')[1]);
    const user = await getUser(from.id);

    if (user?.user_id) {
      try {
        const { supabase } = await import('../supabase');
        const { newLevel, nextReviewAt } = computeNextReview(card.srs_level, grade);
        await supabase
          .from('user_progress')
          .upsert(
            {
              user_id: user.user_id,
              question_id: card.question_id,
              srs_level: newLevel,
              next_review_at: nextReviewAt,
              is_known: newLevel >= 4,
            },
            { onConflict: 'user_id,question_id' }
          );
      } catch (err) {
        console.error('SRS upsert error:', err);
      }
    }

    flashSessions.set(from.id, { ...session, index: index + 1, lastActivity: Date.now() });
    await ctx.answerCbQuery();
    await sendFlashcard(ctx, from.id);
  }
}
