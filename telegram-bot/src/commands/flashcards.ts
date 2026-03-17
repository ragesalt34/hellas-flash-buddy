import { Context } from 'telegraf';
import { getUser } from '../services/userService';
import {
  fetchDueFlashcards,
  fetchRandomFlashcards,
} from '../services/questionService';
import { FlashcardItem } from '../types';

// In-memory flashcard sessions (ephemeral — acceptable for flashcards)
const flashSessions = new Map<
  number,
  { cards: FlashcardItem[]; index: number; messageId?: number }
>();

export async function handleFlashcards(ctx: Context): Promise<void> {
  const from = ctx.from;
  if (!from) return;

  const user = await getUser(from.id);
  let cards: FlashcardItem[];

  if (user?.user_id) {
    cards = await fetchDueFlashcards(user.user_id, 20);
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
    cards = await fetchRandomFlashcards(20);
    await ctx.reply(
      '💡 *Подсказка:* Привяжи аккаунт через /link чтобы видеть только карточки для повторения и сохранять прогресс.',
      { parse_mode: 'Markdown' }
    );
  }

  flashSessions.set(from.id, { cards, index: 0 });
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

  flashSessions.set(telegramId, { ...session, messageId: sent.message_id });
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
        // grade: 1=Again → incorrect, 2/3=Good/Easy → correct
        await supabase.rpc('upsert_progress', {
          p_user_id: user.user_id,
          p_question_id: card.question_id,
          p_correct: grade !== 1,
        });
      } catch (err) {
        console.error('upsert_progress error:', err);
      }
    }

    flashSessions.set(from.id, { ...session, index: index + 1 });
    await ctx.answerCbQuery();
    await sendFlashcard(ctx, from.id);
  }
}

export { flashSessions };
