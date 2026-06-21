import { Context } from 'grammy';
import { getUser } from '../services/userService';
import { fetchDueFlashcards, fetchRandomFlashcards } from '../services/questionService';
import { FlashcardItem } from '../types';
import { progressHeader, MESSAGE_EFFECTS } from '../utils/progressBar';

const escHtml = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

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
        '🎉 Τέλεια! Δεν υπάρχουν κάρτες για επανάληψη αυτή τη στιγμή.\n\nΌλες οι κάρτες θα είναι έτοιμες για επανάληψη αργότερα.',
        {
          reply_markup: {
            inline_keyboard: [
              [{ text: '📝 Κάνε κουίζ', callback_data: 'menu:quiz' }],
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
      await ctx.reply('Δεν ήταν δυνατή η φόρτωση των καρτών. Δοκίμασε αργότερα.');
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
      `🎉 <b>Η συνεδρία ολοκληρώθηκε!</b>\n\n` +
        `🎴 Κάρτες που έγιναν: <b>${cards.length}</b>\n` +
        `<i>Οι κάρτες θα επιστρέψουν όταν έρθει η ώρα της επανάληψης.</i>`,
      {
        parse_mode: 'HTML',
        message_effect_id: MESSAGE_EFFECTS.PARTY,
        reply_markup: {
          inline_keyboard: [
            [
              { text: '🔄 Ξανά',  callback_data: 'fc:restart', style: 'success' as const },
              { text: '📝 Κουίζ', callback_data: 'menu:quiz',  style: 'primary' as const },
            ],
            [{ text: '🏠 Μενού', callback_data: 'menu:home' }],
          ],
        },
      }
    );
    return;
  }

  const card = cards[index];
  const current = index + 1;

  const text =
    `${progressHeader(current, cards.length, '🎴 Κάρτες')}\n\n` +
    `<b>${escHtml(card.question)}</b>`;

  const sent = await ctx.reply(text, {
    parse_mode: 'HTML',
    reply_markup: {
      inline_keyboard: [
        [{ text: '👀 Δείξε απάντηση', callback_data: 'fc:show', style: 'primary' as const }],
      ],
    },
  });

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
    await ctx.answerCallbackQuery('Η συνεδρία έληξε. Ξεκίνα ξανά με /flashcards.');
    return;
  }

  const { cards, index } = session;
  const card = cards[index];

  if (action === 'show') {
    const current = index + 1;
    const answerText =
      `${progressHeader(current, cards.length, '🎴 Κάρτες')}\n\n` +
      `<b>${escHtml(card.question)}</b>\n\n` +
      `✅ <b>${escHtml(card.correct_answer)}</b>` +
      (card.explanation ? `\n\n<blockquote expandable>💬 ${escHtml(card.explanation)}</blockquote>` : '') +
      `\n\n<i>Πόσο καλά ήξερες;</i>`;

    const gradeKeyboard = [
      [
        { text: '😕 Δύσκολο', callback_data: 'fc:grade:1', style: 'danger' as const },
        { text: '😊 Καλά',    callback_data: 'fc:grade:2', style: 'primary' as const },
        { text: '🎯 Το ξέρω', callback_data: 'fc:grade:3', style: 'success' as const },
      ],
    ];

    if (session.messageId && ctx.chat) {
      try {
        await ctx.api.editMessageText(
          ctx.chat.id,
          session.messageId,
          answerText,
          {
            parse_mode: 'HTML',
            reply_markup: { inline_keyboard: gradeKeyboard },
          }
        );
      } catch {
        await ctx.reply(answerText, {
          parse_mode: 'HTML',
          reply_markup: { inline_keyboard: gradeKeyboard },
        });
      }
    }
    await ctx.answerCallbackQuery();
    return;
  }

  if (action.startsWith('grade:')) {
    const grade = parseInt(action.split(':')[1]);
    const user = await getUser(from.id);

    if (user?.user_id) {
      try {
        const { supabase } = await import('../supabase');
        const { error } = await supabase.rpc('upsert_progress', {
          p_user_id: user.user_id,
          p_question_id: card.question_id,
          p_grade: grade,
        });
        if (error) console.error('SRS upsert error:', error);
      } catch (err) {
        console.error('SRS upsert error:', err);
      }
    }

    flashSessions.set(from.id, { ...session, index: index + 1, lastActivity: Date.now() });
    await ctx.answerCallbackQuery();
    await sendFlashcard(ctx, from.id);
  }
}
