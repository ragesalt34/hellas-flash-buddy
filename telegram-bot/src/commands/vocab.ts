import { Context } from 'grammy';
import { VOCABULARY, VOCAB_BY_ID, VocabItem } from '../data/vocabulary';
import { getDueVocabIds, gradeVocab, getVocabStats } from '../services/vocabProgressService';
import { progressHeader, MESSAGE_EFFECTS } from '../utils/progressBar';

const ALL_IDS = VOCABULARY.map(v => v.id);

interface VocabSession {
  cards: VocabItem[];
  index: number;
  lastActivity: number;
}

const sessions = new Map<number, VocabSession>();

setInterval(() => {
  const now = Date.now();
  for (const [id, s] of sessions) {
    if (now - s.lastActivity > 30 * 60 * 1000) sessions.delete(id);
  }
}, 10 * 60 * 1000);

export async function handleVocab(ctx: Context): Promise<void> {
  const from = ctx.from;
  if (!from) return;

  const dueIds = getDueVocabIds(from.id, ALL_IDS, 20);

  if (dueIds.length === 0) {
    const stats = getVocabStats(from.id, ALL_IDS);
    await ctx.reply(
      `✅ <b>Μπράβο!</b> Δεν υπάρχουν λέξεις για σήμερα.\n\n` +
      `📖 Επαναλήφθηκαν: <b>${stats.seen}/${stats.total}</b>\n` +
      `⭐ Κατακτήθηκαν: <b>${stats.mastered}</b> <i>(επίπεδο 4+)</i>\n\n` +
      `<i>Έλα αύριο για νέες λέξεις!</i>`,
      {
        parse_mode: 'HTML',
        reply_markup: {
          inline_keyboard: [
            [
              { text: '📝 Κουίζ',  callback_data: 'menu:quiz',       style: 'primary' as const },
              { text: '🎴 Κάρτες', callback_data: 'menu:flashcards', style: 'primary' as const },
            ],
            [{ text: '🏠 Μενού', callback_data: 'menu:home' }],
          ],
        },
      }
    );
    return;
  }

  const cards = dueIds.map(id => VOCAB_BY_ID.get(id)!).filter(Boolean);
  sessions.set(from.id, { cards, index: 0, lastActivity: Date.now() });
  await sendVocabCard(ctx, from.id);
}

export async function sendVocabCard(ctx: Context, telegramId: number): Promise<void> {
  const session = sessions.get(telegramId);
  if (!session) return;

  const { cards, index } = session;
  if (index >= cards.length) {
    sessions.delete(telegramId);
    await ctx.reply(
      `🎉 <b>Συνεδρία ολοκληρώθηκε!</b>\n\n` +
      `📚 Επανέλαβες <b>${cards.length}</b> λέξεις.\n` +
      `<i>Οι λέξεις θα επιστρέψουν όταν έρθει η ώρα.</i>`,
      {
        parse_mode: 'HTML',
        message_effect_id: MESSAGE_EFFECTS.PARTY,
        reply_markup: {
          inline_keyboard: [
            [
              { text: '🔄 Ξανά',  callback_data: 'vocab:restart', style: 'success' as const },
              { text: '📝 Κουίζ', callback_data: 'menu:quiz',     style: 'primary' as const },
            ],
            [{ text: '🏠 Μενού', callback_data: 'menu:home' }],
          ],
        },
      }
    );
    return;
  }

  const card = cards[index];

  // Translation + note hidden behind a native Telegram spoiler (Bot API 7.0+)
  // User taps the grey blurred area to reveal before grading
  const spoilerBody = `→ ${card.ru}` + (card.note ? `\n\n💬 ${card.note}` : '');

  const text =
    `${progressHeader(index + 1, cards.length, '📚 Λεξιλόγιο')}\n\n` +
    `🔤 <b>${card.word}</b>\n\n` +
    `<tg-spoiler>${spoilerBody}</tg-spoiler>\n\n` +
    `<i>Σκέψου · άνοιξε · ψήφισε ↓</i>`;

  // CopyTextButton (Bot API 7.11) — copies "word = translation" to clipboard, no callback needed
  const keyboard = [
    [
      { text: '😕 Δύσκολο', callback_data: 'vocab:grade:1', style: 'danger' as const  },
      { text: '😊 Καλά',    callback_data: 'vocab:grade:2', style: 'primary' as const },
      { text: '🎯 Το ξέρω', callback_data: 'vocab:grade:3', style: 'success' as const },
    ],
    [{ text: '📋 Αντέγραψε', copy_text: { text: `${card.word} = ${card.ru}` } }],
  ];

  sessions.set(telegramId, { ...session, lastActivity: Date.now() });

  await ctx.reply(text, {
    parse_mode: 'HTML',
    reply_markup: { inline_keyboard: keyboard },
  });
}

export async function handleVocabCallback(ctx: Context, action: string): Promise<void> {
  const from = ctx.from;
  if (!from) return;

  if (action === 'restart') {
    await handleVocab(ctx);
    return;
  }

  const session = sessions.get(from.id);
  if (!session) {
    await ctx.answerCallbackQuery('Η συνεδρία έληξε. Ξεκίνα ξανά με /vocab.');
    return;
  }

  if (action.startsWith('grade:')) {
    const grade = parseInt(action.split(':')[1]);
    const card = session.cards[session.index];
    gradeVocab(from.id, card.id, grade);
    sessions.set(from.id, { ...session, index: session.index + 1, lastActivity: Date.now() });
    await ctx.answerCallbackQuery();
    await sendVocabCard(ctx, from.id);
  }
}
