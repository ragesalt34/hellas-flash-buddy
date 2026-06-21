import { Context } from 'grammy';
import {
  getActiveSession,
  updateSession,
  completeSession,
} from '../services/sessionService';
import { sendQuestion, startQuiz } from '../commands/quiz';
import { TOPIC_LABELS } from '../services/questionService';
import { getUser } from '../services/userService';
import { supabase } from '../supabase';
import { progressBar, progressHeader, DIVIDER, MESSAGE_EFFECTS } from '../utils/progressBar';

const ANSWER_LETTERS = ['🅐', '🅑', '🅒', '🅓'];
const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

export async function handleSkip(ctx: Context): Promise<void> {
  const from = ctx.from;
  if (!from) return;

  const session = await getActiveSession(from.id);
  if (!session) {
    await ctx.answerCallbackQuery('Το κουίζ δεν βρέθηκε.');
    return;
  }

  await ctx.answerCallbackQuery('⏭ Παραλείφθηκε');

  const newIndex = session.current_index + 1;
  await updateSession(session.id, { current_index: newIndex });
  session.current_index = newIndex;

  if (newIndex >= session.questions.length) {
    await completeSession(session.id);
    const answered = session.answers?.length ?? 0;
    await showResults(ctx, session.score, answered, session.questions.length, session.topic);
    return;
  }

  await sendQuestion(ctx, session);
}

export async function handleQuizAnswer(ctx: Context, indexStr: string): Promise<void> {
  const from = ctx.from;
  if (!from) return;

  const session = await getActiveSession(from.id);
  if (!session) {
    await ctx.answerCallbackQuery('Το κουίζ δεν βρέθηκε. Ξεκίνα νέο με /quiz');
    return;
  }

  const answerIndex = parseInt(indexStr);
  const answerOrder = session.current_answer_order;
  if (!answerOrder || answerIndex < 0 || answerIndex >= answerOrder.length) {
    await ctx.answerCallbackQuery('Σφάλμα. Δοκίμασε ξανά.');
    return;
  }

  const chosen = answerOrder[answerIndex];
  const question = session.questions[session.current_index];
  const isCorrect = chosen === question.correct_answer;

  // Build feedback text
  const topicLabel = TOPIC_LABELS[session.topic] ?? session.topic;
  const current = session.current_index + 1;
  const total = session.questions.length;

  const lines = answerOrder.map((ans, i) => {
    const letter = ANSWER_LETTERS[i];
    const isChosen = ans === chosen;
    const isCorrectAns = ans === question.correct_answer;

    if (isCorrectAns && isChosen) return `✅ ${letter}  <b><u>${esc(ans)}</u></b>`;
    if (isChosen && !isCorrect) return `❌ ${letter}  <s>${esc(ans)}</s>`;
    if (isCorrectAns) return `✅ ${letter}  <b><u>${esc(ans)}</u></b>`;
    return `🔘 ${letter}  <i>${esc(ans)}</i>`;
  });

  const verdict = isCorrect ? '🎉 <b>Σωστά!</b>' : '💡 <b>Λάθος</b>';
  const isLast = current >= total;
  const feedbackText =
    `${progressHeader(current, total, topicLabel)}\n\n` +
    `${verdict}\n\n` +
    `${esc(question.question)}\n\n` +
    lines.join('\n') +
    (question.explanation
      ? `\n\n<blockquote expandable>💬 ${esc(question.explanation)}</blockquote>`
      : '');

  // Answer callback FIRST to avoid Telegram timeout
  await ctx.answerCallbackQuery(isCorrect ? '🎉 Σωστά!' : '💡 Λάθος');

  // React to the question message with 🔥 on correct answer (Bot API 7.x feature)
  if (isCorrect && session.last_message_id && ctx.chat) {
    ctx.api.setMessageReaction(ctx.chat.id, session.last_message_id, [
      { type: 'emoji', emoji: '🔥' },
    ]).catch(() => {/* ignore reaction errors */});
  }

  const nextButton = isLast
    ? { text: '🏁 Δες το αποτέλεσμα', callback_data: 'next', style: 'success' as const }
    : { text: 'Επόμενη ερώτηση →', callback_data: 'next', style: 'primary' as const };

  if (session.last_message_id && ctx.chat) {
    try {
      await ctx.api.editMessageText(
        ctx.chat.id,
        session.last_message_id,
        feedbackText,
        {
          parse_mode: 'HTML',
          reply_markup: { inline_keyboard: [[nextButton]] },
        }
      );
    } catch {
      await ctx.reply(feedbackText, {
        parse_mode: 'HTML',
        reply_markup: { inline_keyboard: [[nextButton]] },
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

  await updateSession(session.id, {
    current_index: newIndex,
    score: newScore,
    answers: newAnswers,
  });

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

}

export async function handleNext(ctx: Context): Promise<void> {
  const from = ctx.from;
  if (!from) return;

  const session = await getActiveSession(from.id);
  if (!session) {
    await ctx.answerCallbackQuery('Το κουίζ δεν βρέθηκε.');
    return;
  }

  await ctx.answerCallbackQuery();

  if (session.current_index >= session.questions.length) {
    await completeSession(session.id);
    const answered = session.answers?.length ?? session.score;
    await showResults(ctx, session.score, answered, session.questions.length, session.topic);
    return;
  }

  await sendQuestion(ctx, session);
}

async function showResults(
  ctx: Context,
  score: number,
  answered: number,
  total: number,
  topic: string
): Promise<void> {
  const topicLabel = TOPIC_LABELS[topic] ?? topic;
  const pct = answered > 0 ? Math.round((score / answered) * 100) : 0;
  const bar = progressBar(score, total);
  const skipped = total - answered;
  const wrong = answered - score;

  let emoji = '😅';
  let title = 'Μπορείς καλύτερα';
  let effectId: string | undefined;
  if (pct >= 80) { emoji = '🏆'; title = 'Εξαιρετικό αποτέλεσμα!'; effectId = MESSAGE_EFFECTS.PARTY; }
  else if (pct >= 60) { emoji = '👍'; title = 'Μπράβο'; effectId = MESSAGE_EFFECTS.THUMBS_UP; }
  else if (pct >= 40) { emoji = '💪'; title = 'Χρειάζεται εξάσκηση'; }

  const skippedLine = skipped > 0 ? `  ·  ⏭ Παραλείφθηκαν: <b>${skipped}</b>` : '';

  const text =
    `${emoji} <b>${title}</b>\n` +
    `${DIVIDER}\n\n` +
    `<code>${bar}</code>  <b>${pct}%</b>\n\n` +
    `📚 Θέμα: <b>${topicLabel}</b>\n` +
    `✅ Σωστά: <b>${score}</b>  ·  ❌ Λάθος: <b>${wrong}</b>` +
    skippedLine;

  await ctx.reply(text, {
    parse_mode: 'HTML',
    message_effect_id: effectId,
    reply_markup: {
      inline_keyboard: [
        [
          { text: '🔄 Ξανά',       callback_data: `restart:${topic}`, style: 'success' as const },
          { text: '🎯 Άλλο θέμα',  callback_data: 'menu:quiz',        style: 'primary' as const },
        ],
        [
          { text: '📊 Στατιστικά', callback_data: 'menu:stats' },
          { text: '🏠 Μενού',      callback_data: 'menu:home' },
        ],
      ],
    },
  });
}

export async function handleAbandon(ctx: Context, answer: string): Promise<void> {
  const from = ctx.from;
  if (!from) return;

  if (answer === 'no') {
    await ctx.answerCallbackQuery();
    const session = await getActiveSession(from.id);
    if (session) {
      // Clear so sendQuestion sends a new message instead of editing the old one
      await updateSession(session.id, { last_message_id: null });
      session.last_message_id = null;
      try { await ctx.editMessageText('Συνεχίζουμε!'); } catch {}
      await sendQuestion(ctx, session);
    }
    return;
  }

  // yes — will be handled when /quiz is called again with startQuiz
  await ctx.answerCallbackQuery();
  await ctx.editMessageText('Εντάξει! Διάλεξε θέμα για νέο κουίζ:');

  if (from) {
    await startQuiz(ctx, from.id, 'mixed');
  }
}

export async function handleRestart(ctx: Context, topic: string): Promise<void> {
  const from = ctx.from;
  if (!from) return;
  await ctx.answerCallbackQuery();
  await startQuiz(ctx, from.id, topic);
}
