import { Context } from 'grammy';
import { fetchQuestionsRandom, buildAnswerOptions, TOPIC_LABELS } from '../services/questionService';
import { header } from '../utils/progressBar';

const ANSWER_LETTERS = ['🅐', '🅑', '🅒', '🅓'];
const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

interface QotdState {
  question: string;
  correct_answer: string;
  explanation: string | null;
  topic: string;
  answer_order: string[];
}
const qotdState = new Map<number, QotdState>();

export async function handleQotd(ctx: Context): Promise<void> {
  const from = ctx.from;
  if (!from) return;

  const questions = await fetchQuestionsRandom('mixed', 1);
  if (questions.length === 0) {
    await ctx.reply('Δεν βρέθηκε ερώτηση.');
    return;
  }

  const q = questions[0];
  const answerOrder = buildAnswerOptions(q);
  const topicLabel = TOPIC_LABELS[q.topic ?? 'mixed'] ?? q.topic ?? '';

  qotdState.set(from.id, {
    question: q.question,
    correct_answer: q.correct_answer,
    explanation: q.explanation,
    topic: q.topic ?? '',
    answer_order: answerOrder,
  });

  const text =
    `${header('🌅', 'Ερώτηση της ημέρας', topicLabel)}\n\n` +
    `<b>${esc(q.question)}</b>\n\n` +
    answerOrder.map((ans, i) => `${ANSWER_LETTERS[i]}  ${esc(ans)}`).join('\n');

  const keyboard = answerOrder.map((_, i) => ({
    text: ANSWER_LETTERS[i],
    callback_data: `qotd:${i}`,
    style: 'primary' as const,
  }));

  await ctx.reply(text, {
    parse_mode: 'HTML',
    reply_markup: { inline_keyboard: [keyboard] },
  });
}

export async function handleQotdAnswer(ctx: Context, indexStr: string): Promise<void> {
  const from = ctx.from;
  if (!from) return;

  const state = qotdState.get(from.id);
  if (!state) {
    await ctx.answerCallbackQuery('Η ερώτηση έληξε. Ζήτα νέα: /qotd');
    return;
  }

  const idx = parseInt(indexStr);
  if (idx < 0 || idx >= state.answer_order.length) {
    await ctx.answerCallbackQuery('Σφάλμα');
    return;
  }

  const chosen = state.answer_order[idx];
  const isCorrect = chosen === state.correct_answer;
  const topicLabel = TOPIC_LABELS[state.topic] ?? state.topic;

  await ctx.answerCallbackQuery(isCorrect ? '🎉 Σωστά!' : '💡 Λάθος');

  const lines = state.answer_order.map((ans, i) => {
    const letter = ANSWER_LETTERS[i];
    const isChosen = ans === chosen;
    const isCorrectAns = ans === state.correct_answer;
    if (isCorrectAns && isChosen) return `✅ ${letter}  <b><u>${esc(ans)}</u></b>`;
    if (isChosen && !isCorrect)   return `❌ ${letter}  <s>${esc(ans)}</s>`;
    if (isCorrectAns)             return `✅ ${letter}  <b><u>${esc(ans)}</u></b>`;
    return `🔘 ${letter}  <i>${esc(ans)}</i>`;
  });

  const verdict = isCorrect ? '🎉 <b>Σωστά!</b>' : '💡 <b>Λάθος</b>';
  const text =
    `${header('🌅', 'Ερώτηση της ημέρας', topicLabel)}\n\n` +
    `${verdict}\n\n` +
    `<b>${esc(state.question)}</b>\n\n` +
    lines.join('\n') +
    (state.explanation
      ? `\n\n<blockquote expandable>💬 ${esc(state.explanation)}</blockquote>`
      : '');

  qotdState.delete(from.id);

  if (ctx.callbackQuery && 'message' in ctx.callbackQuery && ctx.callbackQuery.message) {
    try {
      await ctx.editMessageText(text, {
        parse_mode: 'HTML',
        reply_markup: {
          inline_keyboard: [
            [
              { text: '📝 Πλήρες κουίζ', callback_data: 'menu:quiz',       style: 'primary' as const },
              { text: '🎴 Κάρτες',       callback_data: 'menu:flashcards', style: 'primary' as const },
            ],
            [{ text: '🏠 Μενού', callback_data: 'menu:home' }],
          ],
        },
      });
    } catch {
      await ctx.reply(text, { parse_mode: 'HTML' });
    }
  }
}
